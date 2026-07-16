/**
 * Node.js HTTP transport adapter — thin only.
 * Framework-agnostic contracts remain the primary API surface.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import {
  emptyResponse,
  jsonResponse,
  matchRoute,
  type RouteDefinition,
  type TransportMethod,
  type TransportRequest,
  type TransportResponse,
} from "./contracts.js";
import { CorrelationHeader } from "../constants.js";
import { resolveCorrelationId } from "../auth/authentication.js";

export const DEFAULT_MAX_BODY_BYTES = 1_048_576;

class BodyTooLargeError extends Error {
  constructor() {
    super("Request body too large");
    this.name = "BodyTooLargeError";
  }
}

async function readBody(
  req: IncomingMessage,
  maxBytes: number,
): Promise<{ text: string | null; raw: Uint8Array | null }> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      req.destroy();
      throw new BodyTooLargeError();
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) {
    return { text: null, raw: null };
  }
  const raw = Buffer.concat(chunks);
  return { text: raw.toString("utf8"), raw: new Uint8Array(raw) };
}

function parseQuery(url: URL): Record<string, string | undefined> {
  const query: Record<string, string | undefined> = {};
  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value;
  }
  return query;
}

function normalizeHeaders(
  headers: IncomingMessage["headers"],
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      out[key] = value.join(", ");
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function toTransportRequest(
  req: IncomingMessage,
  maxBodyBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<TransportRequest> {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);
  const body = await readBody(req, maxBodyBytes);
  const method = (req.method ?? "GET").toUpperCase() as TransportMethod;

  return {
    method,
    path: url.pathname,
    query: parseQuery(url),
    headers: normalizeHeaders(req.headers),
    bodyText: body.text,
    rawBody: body.raw,
  };
}

export function writeTransportResponse(
  res: ServerResponse,
  response: TransportResponse,
): void {
  for (const [key, value] of Object.entries(response.headers)) {
    res.setHeader(key, value);
  }
  res.statusCode = response.status;
  if (response.body == null) {
    res.end();
    return;
  }
  if (typeof response.body === "string") {
    res.end(response.body);
    return;
  }
  res.end(Buffer.from(response.body));
}

export type NodeHttpServerOptions = {
  readonly routes: readonly RouteDefinition[];
  readonly host?: string;
  readonly port?: number;
  /** Comma-separated origins or "*" for SPA local development. */
  readonly corsOrigin?: string;
  readonly maxBodyBytes?: number;
  readonly onUnhandled?: (
    request: TransportRequest,
  ) => Promise<TransportResponse> | TransportResponse;
};

export type NodeHttpServerHandle = {
  readonly server: Server;
  readonly host: string;
  readonly port: number;
  start(): Promise<void>;
  stop(): Promise<void>;
};

function corsHeaders(origin: string | undefined, configured: string): Record<string, string> {
  const allowWildcard = configured === "*";
  const allow =
    allowWildcard
      ? (origin ?? "*")
      : configured.split(",").map((s) => s.trim()).includes(origin ?? "")
        ? (origin ?? configured)
        : configured.split(",")[0]?.trim() ?? "*";
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers":
      "content-type,authorization,x-correlation-id,x-company-id,x-branch-id,idempotency-key",
    "access-control-expose-headers": "x-correlation-id",
    "access-control-allow-credentials": allowWildcard ? "false" : "true",
  };
}

function securityHeaders(): Record<string, string> {
  return {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
  };
}

export function createNodeHttpServer(
  options: NodeHttpServerOptions,
): NodeHttpServerHandle {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 0;
  const corsOrigin = options.corsOrigin ?? "*";
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  const server = createServer(async (req, res) => {
    let correlationId = CorrelationHeader in (req.headers ?? {})
      ? String(req.headers[CorrelationHeader] ?? "")
      : "";
    if (!correlationId) {
      correlationId = crypto.randomUUID();
    }

    try {
      const transportReq = await toTransportRequest(req, maxBodyBytes);
      correlationId = resolveCorrelationId(transportReq);
      const origin = transportReq.headers.origin;
      const cors = corsHeaders(origin, corsOrigin);
      const secure = securityHeaders();

      if (transportReq.method === "OPTIONS") {
        writeTransportResponse(res, {
          status: 204,
          headers: { ...secure, ...cors },
          body: null,
        });
        return;
      }

      const route = matchRoute(
        options.routes,
        transportReq.method,
        transportReq.path,
      );

      let response: TransportResponse;
      if (route) {
        response = await route.handler(transportReq);
      } else if (options.onUnhandled) {
        response = await options.onUnhandled(transportReq);
      } else {
        response = jsonResponse(404, {
          error: {
            code: "not_found",
            category: "not_found",
            message: `No route for ${transportReq.method} ${transportReq.path}`,
            details: {},
            retryable: false,
            correlationId,
          },
        });
      }

      writeTransportResponse(res, {
        ...response,
        headers: { ...secure, ...cors, ...response.headers },
      });
    } catch (error) {
      if (error instanceof BodyTooLargeError) {
        writeTransportResponse(
          res,
          jsonResponse(
            413,
            {
              error: {
                code: "payload_too_large",
                category: "validation",
                message: "Request body exceeds maximum size",
                details: { maxBytes: maxBodyBytes },
                retryable: false,
                correlationId,
              },
            },
            { [CorrelationHeader]: correlationId },
          ),
        );
        return;
      }

      writeTransportResponse(
        res,
        jsonResponse(
          500,
          {
            error: {
              code: "transport_failure",
              category: "infrastructure",
              message: "Unhandled transport error",
              details: {},
              retryable: true,
              correlationId,
            },
          },
          { [CorrelationHeader]: correlationId },
        ),
      );
    }
  });

  server.requestTimeout = 120_000;
  server.headersTimeout = 65_000;

  return {
    server,
    host,
    port,
    start() {
      return new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          server.off("error", reject);
          resolve();
        });
      });
    },
    stop() {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}

export function notFoundResponse(): TransportResponse {
  return emptyResponse(404);
}
