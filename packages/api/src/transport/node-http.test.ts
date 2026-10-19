import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import { BusinessRuleError, TimeoutError } from "@afh/shared-kernel";
import { platformErrorResponse } from "../errors/exception-mapping.js";
import { jsonResponse, type RouteDefinition } from "./contracts.js";
import {
  createNodeHttpServer,
  type NodeHttpServerHandle,
} from "./node-http.js";

const routes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/json",
    authRequired: false,
    summary: "JSON test route",
    tags: ["test"],
    handler() {
      return Promise.resolve(jsonResponse(200, { ok: true }));
    },
  },
  {
    method: "GET",
    path: "/business-rule",
    authRequired: false,
    summary: "Business rule error test route",
    tags: ["test"],
    handler() {
      return Promise.resolve(
        platformErrorResponse(
          new BusinessRuleError("Controlled business rule failure", {
            code: "controlled_business_rule",
          }),
          "test-correlation",
        ),
      );
    },
  },
  {
    method: "GET",
    path: "/timeout",
    authRequired: false,
    summary: "Timeout error test route",
    tags: ["test"],
    handler() {
      return Promise.resolve(
        platformErrorResponse(
          new TimeoutError("Controlled timeout", {
            code: "controlled_timeout",
          }),
          "test-correlation",
        ),
      );
    },
  },
  {
    method: "GET",
    path: "/throw",
    authRequired: false,
    summary: "Unhandled error test route",
    tags: ["test"],
    handler() {
      throw new Error("secret C:\\internal\\database.sqlite stack detail");
    },
  },
];

describe("Node HTTP protocol responses", () => {
  let host: NodeHttpServerHandle | null = null;

  afterEach(async () => {
    if (host) await host.stop();
    host = null;
  });

  async function start(maxBodyBytes = 1_048_576): Promise<string> {
    host = createNodeHttpServer({
      routes,
      port: 0,
      maxBodyBytes,
      enableHsts: true,
      corsOrigin: "https://app.example.com",
    });
    await host.start();
    const address = host.server.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}`;
  }

  it("returns 405 with Allow for a known path using the wrong method", async () => {
    const base = await start();
    const response = await fetch(`${base}/json`);
    const body = (await response.json()) as {
      error: { code: string; details: { allowedMethods: string[] } };
    };

    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "POST");
    assert.equal(body.error.code, "method_not_allowed");
    assert.deepEqual(body.error.details.allowedMethods, ["POST"]);
  });

  it("returns 415 when a JSON route receives a non-JSON body", async () => {
    const base = await start();
    const response = await fetch(`${base}/json`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    });
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 415);
    assert.equal(body.error.code, "unsupported_media_type");
  });

  it("returns a complete 413 response without resetting the connection", async () => {
    const base = await start(32);
    const response = await fetch(`${base}/json`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://app.example.com",
      },
      body: JSON.stringify({ value: "x".repeat(128) }),
    });
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 413);
    assert.equal(body.error.code, "payload_too_large");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("access-control-allow-origin"), "https://app.example.com");
  });

  it("returns 204 for CORS preflight without a response body", async () => {
    const base = await start();
    const response = await fetch(`${base}/json`, {
      method: "OPTIONS",
      headers: {
        origin: "https://app.example.com",
        "access-control-request-method": "POST",
      },
    });

    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "https://app.example.com",
    );
  });

  it("maps business-rule and timeout failures to 422 and 504", async () => {
    const base = await start();
    const business = await fetch(`${base}/business-rule`);
    const timeout = await fetch(`${base}/timeout`);
    const businessBody = (await business.json()) as { error: { code: string } };
    const timeoutBody = (await timeout.json()) as { error: { code: string } };

    assert.equal(business.status, 422);
    assert.equal(businessBody.error.code, "controlled_business_rule");
    assert.equal(timeout.status, 504);
    assert.equal(timeoutBody.error.code, "controlled_timeout");
  });

  it("sanitizes an unhandled exception into a controlled 500", async () => {
    const base = await start();
    const response = await fetch(`${base}/throw`);
    const text = await response.text();
    const body = JSON.parse(text) as { error: { code: string; details: object } };

    assert.equal(response.status, 500);
    assert.equal(body.error.code, "transport_failure");
    assert.deepEqual(body.error.details, {});
    assert.doesNotMatch(text, /database\.sqlite|C:\\internal|stack detail/i);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  });
});
