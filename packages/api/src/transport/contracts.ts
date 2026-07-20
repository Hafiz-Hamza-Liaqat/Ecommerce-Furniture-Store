/**
 * Framework-agnostic transport request/response contracts.
 * No Express/Fastify lock-in.
 */

export type TransportMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type TransportHeaders = Readonly<Record<string, string | undefined>>;

export type TransportRequest = {
  readonly method: TransportMethod;
  readonly path: string;
  readonly query: Readonly<Record<string, string | undefined>>;
  readonly headers: TransportHeaders;
  readonly bodyText: string | null;
  readonly rawBody: Uint8Array | null;
  /** Direct socket remote address from the transport adapter (not client-spoofable). */
  readonly clientAddress?: string | null;
};

export type TransportResponse = {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string | Uint8Array | null;
};

export type TransportHandler = (
  request: TransportRequest,
) => Promise<TransportResponse>;

export type RouteDefinition = {
  readonly method: TransportMethod;
  readonly path: string;
  readonly handler: TransportHandler;
  readonly authRequired: boolean;
  readonly summary: string;
  readonly tags: readonly string[];
};

export function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): TransportResponse {
  return {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function textResponse(
  status: number,
  body: string,
  headers: Record<string, string> = {},
): TransportResponse {
  return {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      ...headers,
    },
    body,
  };
}

export function emptyResponse(
  status: number,
  headers: Record<string, string> = {},
): TransportResponse {
  return { status, headers, body: null };
}

export function headerValue(
  headers: TransportHeaders,
  name: string,
): string | null {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower && value != null && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function matchRoute(
  routes: readonly RouteDefinition[],
  method: TransportMethod,
  path: string,
): RouteDefinition | null {
  const normalized = path.split("?")[0] ?? path;
  return (
    routes.find((r) => r.method === method && r.path === normalized) ?? null
  );
}
