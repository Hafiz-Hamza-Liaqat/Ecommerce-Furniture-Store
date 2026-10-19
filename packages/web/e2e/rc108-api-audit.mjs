/**
 * RC10.8 Phase 4 — HTTP API Audit
 *
 * Audits every concrete HTTP operation and representative CQRS contracts.
 * Writes redacted, machine-readable evidence only.
 */
import { chromium } from "playwright";
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

const API = process.env.AFH_E2E_API_URL ?? "http://127.0.0.1:8080";
const PROD_API =
  process.env.AFH_E2E_PROD_API_URL ?? "http://127.0.0.1:8082";
const WEB = process.env.AFH_E2E_BASE_URL ?? "http://localhost:5173";
const ADMIN_EMAIL = process.env.AFH_E2E_EMAIL ?? "admin@afh.local";
const ADMIN_PASSWORD =
  process.env.AFH_E2E_PASSWORD ?? "Admin123!Admin123!";
const RUN_ID = `api-audit-${Date.now()}`;
const OUT_DIR = join(
  process.cwd(),
  "packages",
  "web",
  "test-results",
  "api-audit",
);

const OPERATIONS = [
  ["GET", "/health/live", false, "runtime"],
  ["GET", "/health/ready", false, "runtime"],
  ["GET", "/health/startup", false, "runtime"],
  ["GET", "/health/version", false, "runtime"],
  ["POST", "/api/v1/auth/register", false, "authentication"],
  ["POST", "/api/v1/auth/sign-in", false, "authentication"],
  ["POST", "/api/v1/auth/refresh", false, "authentication"],
  ["POST", "/api/v1/auth/sign-out", true, "authentication"],
  ["GET", "/api/v1/auth/session", true, "authentication"],
  ["POST", "/api/v1/auth/password-reset/request", false, "authentication"],
  ["POST", "/api/v1/auth/password-reset/confirm", false, "authentication"],
  ["POST", "/api/v1/auth/email-verification/request", true, "authentication"],
  ["POST", "/api/v1/auth/email-verification/confirm", false, "authentication"],
  ["POST", "/api/v1/auth/mfa/enable", true, "authentication"],
  ["POST", "/api/v1/commands", true, "cqrs"],
  ["POST", "/api/v1/queries", true, "cqrs"],
  ["POST", "/api/v1/uploads", true, "dam"],
  ["GET", "/api/v1/cx/workspace", true, "synchronization"],
  ["PUT", "/api/v1/cx/workspace", true, "synchronization"],
  ["GET", "/api/v1/openapi.json", false, "documentation"],
].map(([method, path, authRequired, domain]) => ({
  method,
  path,
  authRequired,
  domain,
}));

const report = {
  generatedAt: new Date().toISOString(),
  runId: RUN_ID,
  apiUrl: API,
  productionApiUrl: PROD_API,
  webUrl: WEB,
  inventory: OPERATIONS,
  scenarios: [],
  defects: [],
  performance: {},
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[index];
}

function summarizeTimings(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    count: sorted.length,
    minMs: Number((sorted[0] ?? 0).toFixed(2)),
    meanMs: Number((sum / Math.max(1, sorted.length)).toFixed(2)),
    p50Ms: Number(percentile(sorted, 50).toFixed(2)),
    p95Ms: Number(percentile(sorted, 95).toFixed(2)),
    p99Ms: Number(percentile(sorted, 99).toFixed(2)),
    maxMs: Number((sorted.at(-1) ?? 0).toFixed(2)),
  };
}

function hasLeak(text) {
  return /"stack"|node_modules[\\/]|C:\\Users\\|passwordHash|AFH_SECRET_[A-Z_]*\s*[:=]/i.test(
    text,
  );
}

async function request(path, options = {}, base = API) {
  const started = performance.now();
  try {
    const response = await fetch(`${base}${path}`, options);
    const buffer = await response.arrayBuffer();
    const text = Buffer.from(buffer).toString("utf8");
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return {
      response,
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body,
      text,
      bytes: buffer.byteLength,
      durationMs: performance.now() - started,
      networkError: null,
    };
  } catch (error) {
    return {
      response: null,
      status: null,
      headers: {},
      body: null,
      text: "",
      bytes: 0,
      durationMs: performance.now() - started,
      networkError: String(error?.message ?? error),
    };
  }
}

async function json(path, method, body, token = null, companyId = null, extra = {}) {
  return request(path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(companyId ? { "x-company-id": companyId } : {}),
      ...extra,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function scenario(name, area, run) {
  const started = performance.now();
  let status = "PASS";
  let details = {};
  let failure = null;
  try {
    details = (await run()) ?? {};
  } catch (error) {
    status = "FAIL";
    failure = String(error?.stack ?? error);
  }
  report.scenarios.push({
    name,
    area,
    status,
    durationMs: Number((performance.now() - started).toFixed(2)),
    details,
    failure,
  });
  console.log(`${status} [${area}] ${name}`);
}

function activateDisposable(email) {
  const candidates = [
    join(process.cwd(), "packages", "runtime-host", "data", "afh.dev.sqlite"),
    join(process.cwd(), "packages", "runtime-host", "data", "rc108-afh.sqlite"),
  ];
  for (const dbPath of candidates) {
    if (!existsSync(dbPath)) continue;
    const db = new DatabaseSync(dbPath);
    try {
      db.exec("PRAGMA busy_timeout = 5000");
      const row = db
        .prepare(
          "SELECT id, payload_json FROM identity_records WHERE record_type = 'user' AND lookup_key = ?",
        )
        .get(email.toLowerCase());
      if (!row) continue;
      const payload = JSON.parse(row.payload_json);
      payload.status = "active";
      payload.updatedAt = new Date().toISOString();
      db.prepare(
        "UPDATE identity_records SET payload_json = ?, updated_at = ? WHERE id = ?",
      ).run(JSON.stringify(payload), payload.updatedAt, row.id);
      return true;
    } finally {
      db.close();
    }
  }
  return false;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  await scenario("all runtime health endpoints return stable JSON", "inventory", async () => {
    const outcomes = [];
    for (const path of [
      "/health/live",
      "/health/ready",
      "/health/startup",
      "/health/version",
    ]) {
      const result = await request(path);
      assert([200, 503].includes(result.status), `${path} → ${result.status}`);
      assert(
        result.headers["content-type"]?.startsWith("application/json"),
        `${path} content-type`,
      );
      assert(!hasLeak(result.text), `${path} leaked internals`);
      outcomes.push({
        path,
        status: result.status,
        bytes: result.bytes,
        durationMs: Number(result.durationMs.toFixed(2)),
      });
    }
    return { outcomes };
  });

  await scenario("development and production OpenAPI exposure match profiles", "inventory", async () => {
    const dev = await request("/api/v1/openapi.json");
    const prod = await request("/api/v1/openapi.json", {}, PROD_API);
    assert(dev.status === 200, `development OpenAPI ${dev.status}`);
    assert(prod.status === 404, `production OpenAPI ${prod.status}`);
    const paths = Object.keys(dev.body?.paths ?? {});
    assert(paths.length >= 18, `OpenAPI listed only ${paths.length} paths`);
    return { developmentStatus: dev.status, productionStatus: prod.status, paths };
  });

  await scenario("protected HTTP operations reject anonymous access", "authentication", async () => {
    const cases = [
      ["POST", "/api/v1/auth/sign-out", {}],
      ["GET", "/api/v1/auth/session", undefined],
      ["POST", "/api/v1/auth/email-verification/request", {}],
      ["POST", "/api/v1/auth/mfa/enable", {}],
      ["POST", "/api/v1/commands", { commandType: "sales.CreateOpportunity", payload: {} }],
      ["POST", "/api/v1/queries", { queryType: "sales.ListOpportunity", payload: {} }],
      ["POST", "/api/v1/uploads", { companyId: "x", name: "x" }],
      ["GET", "/api/v1/cx/workspace", undefined],
      ["PUT", "/api/v1/cx/workspace", {}],
    ];
    const outcomes = [];
    for (const [method, path, body] of cases) {
      const result = await json(path, method, body);
      assert([401, 403].includes(result.status), `${method} ${path} → ${result.status}`);
      assert(result.body?.error?.code, `${path} missing error code`);
      assert(!hasLeak(result.text), `${path} leaked internals`);
      outcomes.push({ method, path, status: result.status, code: result.body.error.code });
    }
    return { outcomes };
  });

  await scenario("wrong HTTP methods return 405 with Allow", "method restrictions", async () => {
    const cases = [
      ["GET", "/api/v1/auth/sign-in"],
      ["GET", "/api/v1/commands"],
      ["POST", "/health/live"],
      ["DELETE", "/api/v1/cx/workspace"],
    ];
    const outcomes = [];
    for (const [method, path] of cases) {
      const result = await request(path, { method });
      assert(result.status === 405, `${method} ${path} → ${result.status}`);
      assert(result.headers.allow, `${method} ${path} missing Allow header`);
      outcomes.push({ method, path, status: result.status, allow: result.headers.allow });
    }
    return { outcomes };
  });

  await scenario("JSON APIs reject unsupported media types with 415", "content negotiation", async () => {
    const result = await request("/api/v1/auth/sign-in", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ email: "nobody@example.test", password: "invalid" }),
    });
    assert(result.status === 415, `text/plain JSON → ${result.status}`);
    assert(result.body?.error?.code === "unsupported_media_type", "missing 415 error code");
    return { status: result.status, code: result.body.error.code };
  });

  await scenario("malformed, empty, wrong-type and oversized requests fail closed", "validation", async () => {
    const malformed = await request("/api/v1/auth/sign-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bad-json",
    });
    const emptyAuth = await request("/api/v1/auth/sign-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "",
    });
    const nullAuth = await request("/api/v1/auth/sign-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "null",
    });
    const empty = await json("/api/v1/commands", "POST", null);
    const wrongType = await json("/api/v1/queries", "POST", {
      queryType: 42,
      payload: "not-an-object",
    });
    const huge = await request("/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `${RUN_ID}@huge.test`,
        password: "SecurePass12!",
        fullName: "A".repeat(1_100_000),
      }),
    });
    assert(malformed.status === 400, `malformed → ${malformed.status}`);
    assert(emptyAuth.status === 400, `empty auth → ${emptyAuth.status}`);
    assert(nullAuth.status === 400, `null auth → ${nullAuth.status}`);
    assert([400, 401, 403].includes(empty.status), `empty → ${empty.status}`);
    assert([400, 401, 403].includes(wrongType.status), `wrong type → ${wrongType.status}`);
    assert(huge.status === 413, `oversized → ${huge.status ?? huge.networkError}`);
    for (const result of [malformed, emptyAuth, nullAuth, empty, wrongType, huge]) {
      assert(!hasLeak(result.text), "validation response leaked internals");
    }
    return {
      malformed: malformed.status,
      emptyAuth: emptyAuth.status,
      nullAuth: nullAuth.status,
      empty: empty.status,
      wrongType: wrongType.status,
      oversized: huge.status,
      oversizedNetworkError: huge.networkError,
    };
  });

  const disposableEmail = `${RUN_ID}@example.test`;
  const initialPassword = "ApiAudit12!Secure";
  const nextPassword = "ApiAudit34!Changed";
  let resetToken = null;

  await scenario("registration, duplicate conflict and tenant mass assignment", "authentication", async () => {
    const first = await json("/api/v1/auth/register", "POST", {
      email: disposableEmail,
      password: initialPassword,
      fullName: "API Audit User 😀",
      companyId: "attacker-company",
      unexpectedAdmin: true,
    });
    const duplicate = await json("/api/v1/auth/register", "POST", {
      email: disposableEmail,
      password: initialPassword,
      fullName: "Duplicate",
    });
    assert(first.status === 201, `register → ${first.status}`);
    assert([400, 409].includes(duplicate.status), `duplicate → ${duplicate.status}`);
    assert(first.body?.data?.user?.companyId == null, "companyId mass assignment");
    return {
      register: first.status,
      duplicate: duplicate.status,
      companyId: first.body.data.user.companyId,
    };
  });

  await scenario("password reset request is generic and confirmation rotates password", "authentication", async () => {
    const known = await json("/api/v1/auth/password-reset/request", "POST", {
      email: disposableEmail,
    });
    const unknown = await json("/api/v1/auth/password-reset/request", "POST", {
      email: `${RUN_ID}-missing@example.test`,
    });
    assert(known.status === 200 && unknown.status === 200, "reset request status mismatch");
    resetToken = known.body?.data?.token ?? null;
    if (resetToken) {
      const confirmed = await json("/api/v1/auth/password-reset/confirm", "POST", {
        token: resetToken,
        newPassword: nextPassword,
      });
      assert(confirmed.status === 200, `reset confirm → ${confirmed.status}`);
    }
    return {
      known: known.status,
      unknown: unknown.status,
      tokenRevealedInDevelopment: Boolean(resetToken),
    };
  });

  let userToken = null;
  await scenario("active disposable user supports sign-in, session, email and MFA flows", "authentication", async () => {
    assert(activateDisposable(disposableEmail), "could not activate disposable user");
    const signedIn = await json("/api/v1/auth/sign-in", "POST", {
      email: disposableEmail,
      password: resetToken ? nextPassword : initialPassword,
    });
    assert(signedIn.status === 200, `sign-in → ${signedIn.status}`);
    userToken = signedIn.body?.data?.tokens?.sessionId;
    assert(userToken, "missing session token");
    const session = await json("/api/v1/auth/session", "GET", undefined, userToken);
    assert(session.status === 200, `session → ${session.status}`);
    const verify = await json(
      "/api/v1/auth/email-verification/request",
      "POST",
      {},
      userToken,
    );
    assert(verify.status === 200, `email request → ${verify.status}`);
    const verifyToken = verify.body?.data?.token;
    if (verifyToken) {
      const confirmed = await json("/api/v1/auth/email-verification/confirm", "POST", {
        token: verifyToken,
      });
      assert(confirmed.status === 200, `email confirm → ${confirmed.status}`);
    }
    const mfa = await json("/api/v1/auth/mfa/enable", "POST", {}, userToken);
    assert(mfa.status === 200, `MFA enable → ${mfa.status}`);
    return {
      signIn: signedIn.status,
      session: session.status,
      emailRequest: verify.status,
      mfaEnable: mfa.status,
    };
  });

  await scenario("logout invalidates the current session", "authentication", async () => {
    const logout = await json("/api/v1/auth/sign-out", "POST", {}, userToken);
    const stale = await json("/api/v1/auth/session", "GET", undefined, userToken);
    assert(logout.status === 200, `logout → ${logout.status}`);
    assert([401, 403].includes(stale.status), `stale session → ${stale.status}`);
    return { logout: logout.status, staleSession: stale.status };
  });

  let adminToken = null;
  let companyId = null;
  let adminUserId = null;
  await scenario("admin session establishes authorized API context", "authentication", async () => {
    const signedIn = await json("/api/v1/auth/sign-in", "POST", {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    assert(signedIn.status === 200, `admin sign-in → ${signedIn.status}`);
    adminToken = signedIn.body?.data?.tokens?.sessionId;
    companyId = signedIn.body?.data?.user?.companyId;
    adminUserId = signedIn.body?.data?.user?.id;
    assert(adminToken && companyId && adminUserId, "admin context incomplete");
    return { status: signedIn.status, companyId, userId: adminUserId };
  });

  await scenario("company header mismatch is forbidden", "authorization", async () => {
    const result = await json(
      "/api/v1/queries",
      "POST",
      { queryType: "sales.ListOpportunity", payload: { companyId } },
      adminToken,
      "different-company",
    );
    assert(result.status === 403, `company mismatch → ${result.status}`);
    return { status: result.status, code: result.body?.error?.code };
  });

  let opportunityId = null;
  await scenario("representative CQRS create-read-update-list persists correctly", "CRUD", async () => {
    const title = `${RUN_ID} Opportunity`;
    const created = await json(
      "/api/v1/commands",
      "POST",
      {
        commandType: "sales.CreateOpportunity",
        payload: { companyId, title, source: "api-audit" },
        idempotencyKey: `${RUN_ID}-create`,
      },
      adminToken,
      companyId,
    );
    assert(created.status === 200, `create → ${created.status}`);
    opportunityId = created.body?.data?.opportunityId;
    assert(opportunityId, "missing opportunityId");

    const got = await json(
      "/api/v1/queries",
      "POST",
      {
        queryType: "sales.GetOpportunity",
        payload: { companyId, opportunityId },
      },
      adminToken,
      companyId,
    );
    assert(got.status === 200 && got.body?.data?.title === title, "read mismatch");

    const updatedTitle = `${title} Updated`;
    const updated = await json(
      "/api/v1/commands",
      "POST",
      {
        commandType: "sales.UpdateOpportunity",
        payload: { companyId, opportunityId, title: updatedTitle },
      },
      adminToken,
      companyId,
    );
    assert(updated.status === 200, `update → ${updated.status}`);

    const listed = await json(
      "/api/v1/queries",
      "POST",
      {
        queryType: "sales.ListOpportunity",
        payload: {
          companyId,
          q: RUN_ID,
          criteria: { page: { page: 1, pageSize: 10 } },
        },
      },
      adminToken,
      companyId,
    );
    assert(listed.status === 200, `list → ${listed.status}`);
    assert(
      listed.body?.data?.items?.some(
        (item) => item.id === opportunityId && item.title === updatedTitle,
      ),
      "updated opportunity absent from list",
    );
    return {
      create: created.status,
      read: got.status,
      update: updated.status,
      list: listed.status,
      deleteOrArchive: "not implemented for sales opportunities",
      opportunityId,
    };
  });

  await scenario("missing records, invalid paging and invalid command type fail consistently", "errors", async () => {
    const missing = await json(
      "/api/v1/queries",
      "POST",
      {
        queryType: "sales.GetOpportunity",
        payload: { companyId, opportunityId: "missing-api-audit-id" },
      },
      adminToken,
      companyId,
    );
    const paging = await json(
      "/api/v1/queries",
      "POST",
      {
        queryType: "sales.ListOpportunity",
        payload: {
          companyId,
          criteria: { page: { page: 0, pageSize: 501 } },
        },
      },
      adminToken,
      companyId,
    );
    const unknown = await json(
      "/api/v1/commands",
      "POST",
      { commandType: "unknown.Command", payload: {} },
      adminToken,
      companyId,
    );
    assert(missing.status === 404, `missing → ${missing.status}`);
    assert(paging.status === 400, `paging → ${paging.status}`);
    assert([400, 404, 422].includes(unknown.status), `unknown → ${unknown.status}`);
    for (const result of [missing, paging, unknown]) {
      assert(result.body?.error?.code, "missing stable error code");
      assert(!hasLeak(result.text), "error leaked internals");
      assert(
        result.headers["content-type"]?.startsWith("application/json"),
        "error content-type mismatch",
      );
    }
    return {
      missing: missing.status,
      invalidPaging: paging.status,
      unknownCommand: unknown.status,
    };
  });

  await scenario("upload validates company, MIME and returns accepted metadata", "uploads", async () => {
    const mismatch = await json(
      "/api/v1/uploads",
      "POST",
      { companyId: "other-company", name: "bad.txt", mimeType: "text/plain" },
      adminToken,
      companyId,
    );
    const mime = await json(
      "/api/v1/uploads",
      "POST",
      { companyId, name: "bad.exe", mimeType: "application/x-msdownload" },
      adminToken,
      companyId,
    );
    const accepted = await json(
      "/api/v1/uploads",
      "POST",
      { companyId, name: `${RUN_ID}.txt`, mimeType: "text/plain" },
      adminToken,
      companyId,
    );
    assert(mismatch.status === 403, `upload mismatch → ${mismatch.status}`);
    assert(mime.status === 400, `invalid MIME → ${mime.status}`);
    assert(accepted.status === 202, `upload accepted → ${accepted.status}`);
    assert(accepted.body?.ok === true, "upload envelope missing ok");
    assert(accepted.body?.data?.assetId, "upload assetId missing");
    assert(
      accepted.body?.data?.status === "draft" ||
        accepted.body?.data?.status === "active",
      "upload status missing",
    );
    return {
      companyMismatch: mismatch.status,
      invalidMime: mime.status,
      accepted: accepted.status,
      assetId: accepted.body.data.assetId,
      status: accepted.body.data.status,
      metadataOnly: accepted.body.data.versionId == null,
    };
  });

  await scenario("CX workspace enforces auth, identity and valid snapshots", "synchronization", async () => {
    const unauth = await request("/api/v1/cx/workspace");
    const foreign = await json(
      "/api/v1/cx/workspace",
      "PUT",
      {
        snapshot: {
          version: 1,
          userId: "other-user",
          revision: 1,
          revisedAt: new Date().toISOString(),
          records: [],
          devices: [],
        },
      },
      adminToken,
    );
    const invalid = await json(
      "/api/v1/cx/workspace",
      "PUT",
      { snapshot: { version: 99 } },
      adminToken,
    );
    assert(unauth.status === 401, `sync unauth → ${unauth.status}`);
    assert(foreign.status === 403, `sync foreign → ${foreign.status}`);
    assert(invalid.status === 400, `sync invalid → ${invalid.status}`);
    return {
      unauthenticated: unauth.status,
      foreignUser: foreign.status,
      invalidPayload: invalid.status,
    };
  });

  await scenario("concurrent CX writes remain isolated and deterministic", "concurrency", async () => {
    const revisedAt = new Date().toISOString();
    const makeSnapshot = (marker, revision) => ({
      snapshot: {
        version: 1,
        userId: adminUserId,
        revision,
        revisedAt,
        records: [
          {
            key: "afh.cx.api.audit",
            revision,
            revisedAt,
            payload: { marker },
          },
        ],
        devices: [],
      },
    });
    const writes = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        json(
          "/api/v1/cx/workspace",
          "PUT",
          makeSnapshot(`write-${index}`, index + 1),
          adminToken,
        ),
      ),
    );
    assert(writes.every((result) => result.status === 200), "concurrent sync write failed");
    const got = await request("/api/v1/cx/workspace", {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert(got.status === 200, `sync GET → ${got.status}`);
    assert(got.body?.data?.snapshot?.userId === adminUserId, "sync user isolation lost");
    return {
      writes: writes.map((result) => result.status),
      finalRevision: got.body?.data?.snapshot?.revision,
      conflictModel: "last completed write wins; client resolves semantic conflicts",
    };
  });

  await scenario("command idempotency key behavior is measured", "concurrency", async () => {
    const key = `${RUN_ID}-idempotency`;
    const body = {
      commandType: "sales.CreateOpportunity",
      payload: { companyId, title: `${RUN_ID} Idempotency`, source: "api-audit" },
      idempotencyKey: key,
    };
    const first = await json(
      "/api/v1/commands",
      "POST",
      body,
      adminToken,
      companyId,
    );
    const second = await json(
      "/api/v1/commands",
      "POST",
      body,
      adminToken,
      companyId,
    );
    assert(first.status === 200 && second.status === 200, "idempotency probe failed");
    const firstId = first.body?.data?.opportunityId;
    const secondId = second.body?.data?.opportunityId;
    const enforced = firstId === secondId;
    if (!enforced) {
      report.defects.push({
        id: "P4-D-IDEMPOTENCY",
        severity: "High",
        component: "POST /api/v1/commands",
        summary: "Accepted idempotency key does not deduplicate repeated commands",
        evidence: { key, firstId, secondId },
        disposition:
          "Confirmed contract gap; durable remediation would change architecture and is not auto-fixed in Phase 4.",
      });
    }
    return { key, firstId, secondId, enforced };
  });

  await scenario("frontend ApiClient contract matches live command/query envelopes", "contracts", async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(WEB, { waitUntil: "domcontentloaded" });
      const response = await page.evaluate(
        async ({ token, company }) => {
          const result = await fetch("/api/v1/queries", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${token}`,
              "x-company-id": company,
            },
            body: JSON.stringify({
              queryType: "sales.ListOpportunity",
              payload: {
                companyId: company,
                criteria: { page: { page: 1, pageSize: 5 } },
              },
            }),
          });
          return {
            status: result.status,
            contentType: result.headers.get("content-type"),
            body: await result.json(),
          };
        },
        { token: adminToken, company: companyId },
      );
      assert(response.status === 200, `browser query → ${response.status}`);
      assert(response.body?.ok === true, "browser response envelope mismatch");
      assert(Array.isArray(response.body?.data?.items), "browser page items missing");
      return {
        status: response.status,
        contentType: response.contentType,
        pageSize: response.body.data.pageSize,
      };
    } finally {
      await browser.close();
    }
  });

  await scenario("HTTP latency and payload baselines are captured", "performance", async () => {
    const targets = [
      ["health-live", "/health/live", { method: "GET" }],
      [
        "session",
        "/api/v1/auth/session",
        { method: "GET", headers: { authorization: `Bearer ${adminToken}` } },
      ],
      [
        "sales-list",
        "/api/v1/queries",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${adminToken}`,
            "x-company-id": companyId,
          },
          body: JSON.stringify({
            queryType: "sales.ListOpportunity",
            payload: {
              companyId,
              criteria: { page: { page: 1, pageSize: 25 } },
            },
          }),
        },
      ],
      [
        "cx-workspace",
        "/api/v1/cx/workspace",
        { method: "GET", headers: { authorization: `Bearer ${adminToken}` } },
      ],
    ];
    for (const [name, path, options] of targets) {
      const warmup = await request(path, options);
      assert(warmup.status === 200, `${name} warmup → ${warmup.status}`);
      const samples = [];
      let bytes = 0;
      let encoding = null;
      for (let i = 0; i < 30; i++) {
        const result = await request(path, options);
        assert(result.status === 200, `${name} sample → ${result.status}`);
        samples.push(result.durationMs);
        bytes = result.bytes;
        encoding = result.headers["content-encoding"] ?? null;
      }
      report.performance[name] = {
        ...summarizeTimings(samples),
        responseBytes: bytes,
        contentEncoding: encoding,
      };
    }
    return report.performance;
  });

  await scenario("production CORS, OpenAPI and rate limiting remain secure", "production", async () => {
    const cors = await request(
      "/health/live",
      { headers: { origin: "https://evil.example" } },
      PROD_API,
    );
    const openapi = await request("/api/v1/openapi.json", {}, PROD_API);
    const statuses = [];
    for (let i = 0; i < 35; i++) {
      const result = await request(
        "/api/v1/auth/sign-in",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: `${RUN_ID}@flood.test`, password: "x" }),
        },
        PROD_API,
      );
      statuses.push(result.status);
    }
    assert(cors.headers["access-control-allow-origin"] !== "https://evil.example", "CORS reflected evil origin");
    assert(cors.headers["access-control-allow-origin"] !== "*", "production wildcard CORS");
    assert(openapi.status === 404, `production OpenAPI → ${openapi.status}`);
    assert(statuses.includes(429), "production rate limit did not return 429");
    return {
      corsOrigin: cors.headers["access-control-allow-origin"],
      openapi: openapi.status,
      rateLimitStatuses: [...new Set(statuses)],
    };
  });

  const failed = report.scenarios.filter((item) => item.status === "FAIL");
  report.summary = {
    total: report.scenarios.length,
    passed: report.scenarios.length - failed.length,
    failed: failed.length,
    defectCount: report.defects.length,
  };
  const reportPath = join(OUT_DIR, "rc108-api-audit-report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Report written: ${reportPath}`);
  console.log(
    `API audit: ${failed.length ? "FAIL" : "PASS"} (${report.summary.passed}/${report.summary.total})`,
  );
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
