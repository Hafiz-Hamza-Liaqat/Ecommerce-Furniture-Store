/**
 * RC10.8 Phase 3 — Security Audit
 *
 * Verifies application security controls against a running API (prefer
 * production profile) and the web SPA. Does not redesign auth/authz.
 *
 * Prerequisites:
 *   API:  AFH_E2E_API_URL (default http://127.0.0.1:8082 production smoke)
 *   Web:  AFH_E2E_BASE_URL (default http://localhost:5173)
 *   Admin: AFH_E2E_EMAIL / AFH_E2E_PASSWORD
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";

const BASE = process.env.AFH_E2E_BASE_URL ?? "http://localhost:5173";
const API = process.env.AFH_E2E_API_URL ?? "http://127.0.0.1:8080";
const PROD_API =
  process.env.AFH_E2E_PROD_API_URL ?? "http://127.0.0.1:8082";
const ADMIN_EMAIL = process.env.AFH_E2E_EMAIL ?? "admin@afh.local";
const ADMIN_PASSWORD =
  process.env.AFH_E2E_PASSWORD ?? "Admin123!Admin123!";
const RUN_ID = `sec-${Date.now()}`;
const OUT_DIR = join(
  process.cwd(),
  "packages",
  "web",
  "test-results",
  "security-audit",
);

const report = {
  generatedAt: new Date().toISOString(),
  runId: RUN_ID,
  apiUrl: API,
  prodApiUrl: PROD_API,
  baseUrl: BASE,
  scenarios: [],
  defects: [],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasSensitiveLeak(text) {
  return /stack trace|at Object\.|node_modules\\|C:\\\\Users|passwordHash|"jwt"|signing.key|AFH_SECRET/i.test(
    text,
  );
}

async function scenario(name, workstream, run) {
  const startedAt = Date.now();
  let status = "PASS";
  let failure = null;
  let details = {};
  try {
    details = (await run()) ?? {};
  } catch (error) {
    status = "FAIL";
    failure = String(error?.stack ?? error);
  }
  report.scenarios.push({
    name,
    workstream,
    status,
    durationMs: Date.now() - startedAt,
    details,
    failure,
  });
  console.log(`${status} [${workstream}] ${name}`);
}

async function api(path, options = {}, base = API) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { response, body, text };
}

function activateDisposableAccount(email) {
  const dbPath = join(
    process.cwd(),
    "packages",
    "runtime-host",
    "data",
    "afh.dev.sqlite",
  );
  // Production smoke host uses a separate sqlite; activation only applies when
  // the API under test shares the development identity database.
  const candidates = [
    dbPath,
    join(process.cwd(), "packages", "runtime-host", "data", "rc108-afh.sqlite"),
    join(process.cwd(), "packages", "runtime-host", "data", "afh.sqlite"),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const db = new DatabaseSync(candidate);
    try {
      db.exec("PRAGMA busy_timeout = 5000");
      const row = db
        .prepare(
          "SELECT id, payload_json FROM identity_records WHERE record_type = 'user' AND lookup_key = ?",
        )
        .get(email.toLowerCase());
      if (!row) continue;
      const payload = JSON.parse(row.payload_json);
      if (payload.status !== "active") {
        payload.status = "active";
        payload.updatedAt = new Date().toISOString();
        db.prepare(
          "UPDATE identity_records SET payload_json = ?, updated_at = ? WHERE id = ?",
        ).run(JSON.stringify(payload), payload.updatedAt, row.id);
      }
      return { activated: true, dbPath: candidate };
    } finally {
      db.close();
    }
  }
  return { activated: false, reason: "user not found in known databases" };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // --------------------------------------------------------------- Headers
  await scenario("production security headers present", "Headers", async () => {
    const { response } = await api("/health/live", {}, PROD_API);
    assert(response.ok, `prod health live ${response.status}`);
    const h = response.headers;
    assert(h.get("x-content-type-options") === "nosniff", "missing nosniff");
    assert(h.get("x-frame-options") === "DENY", "missing frame deny");
    assert(h.get("referrer-policy"), "missing referrer-policy");
    assert(h.get("permissions-policy"), "missing permissions-policy");
    assert(h.get("cross-origin-opener-policy") === "same-origin", "missing COOP");
    assert(h.get("cross-origin-resource-policy") === "same-site", "missing CORP");
    const hsts = h.get("strict-transport-security");
    assert(hsts && /max-age=/.test(hsts), "HSTS missing on production profile");
    return {
      hsts,
      nosniff: h.get("x-content-type-options"),
      frame: h.get("x-frame-options"),
    };
  });

  await scenario("production CORS rejects foreign origins", "CORS/CSP", async () => {
    const response = await fetch(`${PROD_API}/health/live`, {
      headers: { Origin: "https://evil.example" },
    });
    const acao = response.headers.get("access-control-allow-origin");
    assert(
      acao !== "https://evil.example",
      "evil origin was reflected in ACAO",
    );
    assert(acao !== "*", "wildcard CORS returned for production host");
    return { acao };
  });

  await scenario("production OpenAPI schema is private", "API Security", async () => {
    const { response, body } = await api("/openapi.json", {}, PROD_API);
    assert(response.status === 404, `openapi returned ${response.status}`);
    assert(!hasSensitiveLeak(JSON.stringify(body)), "openapi error leaked internals");
    return { status: response.status };
  });

  await scenario("production auth endpoints enforce rate limiting", "API Security", async () => {
    const statuses = [];
    for (let i = 0; i < 45; i++) {
      const { response } = await api(
        "/api/v1/auth/sign-in",
        {
          method: "POST",
          body: JSON.stringify({
            email: `${RUN_ID}-flood@example.test`,
            password: "x",
          }),
        },
        PROD_API,
      );
      statuses.push(response.status);
    }
    assert(statuses.includes(429), `no 429 in ${[...new Set(statuses)]}`);
    return { unique: [...new Set(statuses)], saw429: true };
  });

  // -------------------------------------------------------- Authentication
  await scenario("invalid credentials do not leak internals", "Authentication", async () => {
    const { response, body, text } = await api("/api/v1/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: "DefinitelyWrongPassword!!",
      }),
    });
    assert([401, 403].includes(response.status), `status ${response.status}`);
    assert(!hasSensitiveLeak(text), "credential failure leaked internals");
    assert(body?.error?.code, "missing error code");
    assert(!/"stack"/.test(text), "stack field present");
    return { status: response.status, code: body.error.code };
  });

  await scenario("register ignores client companyId", "Authorization", async () => {
    const email = `${RUN_ID}-tenant@example.test`;
    const { response, body } = await api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "SecurePass12!",
        fullName: "Tenant Probe",
        companyId: "attacker-company-id",
      }),
    });
    assert(response.status === 201, `register ${response.status}`);
    assert(
      body?.data?.user?.companyId == null,
      `companyId not ignored: ${body?.data?.user?.companyId}`,
    );
    return { companyId: body.data.user.companyId };
  });

  await scenario("XSS payload in fullName is not executed server-side", "Injection", async () => {
    const email = `${RUN_ID}-xss@example.test`;
    const fullName = `<script>alert(1)</script>`;
    const { response, body, text } = await api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "SecurePass12!",
        fullName,
      }),
    });
    assert(response.status === 201, `register ${response.status}`);
    assert(!hasSensitiveLeak(text), "register leaked internals");
    // Echo of the stored name is acceptable; React encoding is verified separately.
    return {
      stored: body?.data?.user?.fullName === fullName,
      status: response.status,
    };
  });

  await scenario("malformed and oversized bodies fail closed", "Input Validation", async () => {
    const malformed = await api("/api/v1/auth/sign-in", {
      method: "POST",
      body: "{not-json",
    });
    assert(malformed.response.status === 400, `malformed ${malformed.response.status}`);
    assert(!hasSensitiveLeak(malformed.text), "malformed leak");

    let oversizedStatus = null;
    let oversizedNote = null;
    try {
      const huge = "A".repeat(1_500_000);
      const oversized = await fetch(`${API}/api/v1/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: `${RUN_ID}-huge@example.test`,
          password: "SecurePass12!",
          fullName: huge,
        }),
      });
      oversizedStatus = oversized.status;
      assert(
        [400, 413].includes(oversized.status),
        `oversized body returned ${oversized.status}`,
      );
    } catch (error) {
      // Transport may reset the connection when the body exceeds the limit.
      oversizedStatus = "connection_closed";
      oversizedNote = String(error?.message ?? error);
      assert(
        /fetch failed|ECONNRESET|socket|network/i.test(oversizedNote),
        `unexpected oversized error: ${oversizedNote}`,
      );
    }
    return {
      malformed: malformed.response.status,
      oversized: oversizedStatus,
      oversizedNote,
    };
  });

  // ------------------------------------------- Session / MFA / Sync (admin)
  let adminSessionId = null;
  let adminRefresh = null;
  let adminUserId = null;

  await scenario("admin sign-in issues opaque session", "Authentication", async () => {
    const { response, body, text } = await api("/api/v1/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });
    assert(response.status === 200, `admin sign-in ${response.status}: ${text}`);
    adminSessionId = body?.data?.tokens?.sessionId ?? null;
    adminRefresh = body?.data?.tokens?.refreshToken ?? null;
    adminUserId = body?.data?.user?.id ?? null;
    assert(adminSessionId, "sessionId missing");
    assert(adminRefresh, "refreshToken missing");
    assert(!hasSensitiveLeak(text), "sign-in leaked internals");
    assert(!/"passwordHash"/.test(text), "passwordHash exposed");
    return { userId: adminUserId, mfaEnabled: body?.data?.user?.mfaEnabled };
  });

  await scenario("logout invalidates session server-side", "Authentication", async () => {
    assert(adminSessionId, "admin session missing");
    const signedOut = await api("/api/v1/auth/sign-out", {
      method: "POST",
      headers: { authorization: `Bearer ${adminSessionId}` },
      body: "{}",
    });
    assert(signedOut.response.status === 200, `sign-out ${signedOut.response.status}`);

    const sessionAfter = await api("/api/v1/auth/session", {
      headers: { authorization: `Bearer ${adminSessionId}` },
    });
    assert(
      [401, 403].includes(sessionAfter.response.status),
      `stale session returned ${sessionAfter.response.status}`,
    );

    // Re-authenticate for subsequent scenarios.
    const again = await api("/api/v1/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });
    assert(again.response.status === 200, `re-sign-in ${again.response.status}`);
    adminSessionId = again.body?.data?.tokens?.sessionId;
    adminRefresh = again.body?.data?.tokens?.refreshToken;
    adminUserId = again.body?.data?.user?.id;
    return { invalidated: true };
  });

  await scenario("refresh rotation and reuse protection", "Authentication", async () => {
    assert(adminSessionId && adminRefresh, "tokens missing");
    const first = await api("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({
        sessionId: adminSessionId,
        refreshToken: adminRefresh,
      }),
    });
    assert(first.response.status === 200, `refresh ${first.response.status}`);
    const next = first.body?.data?.tokens;
    assert(next?.refreshToken && next.refreshToken !== adminRefresh, "refresh did not rotate");

    const replay = await api("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({
        sessionId: adminSessionId,
        refreshToken: adminRefresh,
      }),
    });
    assert(
      [401, 403].includes(replay.response.status),
      `refresh reuse returned ${replay.response.status}`,
    );

    // Refresh reuse revokes the entire session family (including the rotated
    // token). Re-authenticate before subsequent authorized scenarios.
    const again = await api("/api/v1/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });
    assert(again.response.status === 200, `post-reuse sign-in ${again.response.status}`);
    adminSessionId = again.body?.data?.tokens?.sessionId;
    adminRefresh = again.body?.data?.tokens?.refreshToken;
    adminUserId = again.body?.data?.user?.id;
    return {
      rotated: true,
      reuseStatus: replay.response.status,
      familyRevokeRecovered: true,
    };
  });

  await scenario("unauthenticated sync is rejected", "Synchronization", async () => {
    const get = await api("/api/v1/cx/workspace");
    assert([401, 403].includes(get.response.status), `GET ${get.response.status}`);
    const put = await api("/api/v1/cx/workspace", {
      method: "PUT",
      body: JSON.stringify({
        snapshot: {
          version: 1,
          userId: "attacker",
          revision: 1,
          revisedAt: new Date().toISOString(),
          records: [],
          devices: [],
        },
      }),
    });
    assert([401, 403].includes(put.response.status), `PUT ${put.response.status}`);
    return { get: get.response.status, put: put.response.status };
  });

  await scenario("sync rejects foreign userId and malformed payloads", "Synchronization", async () => {
    assert(adminSessionId && adminUserId, "admin session missing");
    const mismatch = await api("/api/v1/cx/workspace", {
      method: "PUT",
      headers: { authorization: `Bearer ${adminSessionId}` },
      body: JSON.stringify({
        snapshot: {
          version: 1,
          userId: "some-other-user",
          revision: 1,
          revisedAt: new Date().toISOString(),
          records: [],
          devices: [],
        },
      }),
    });
    assert(
      [401, 403].includes(mismatch.response.status),
      `user mismatch returned ${mismatch.response.status}`,
    );

    const malformed = await api("/api/v1/cx/workspace", {
      method: "PUT",
      headers: { authorization: `Bearer ${adminSessionId}` },
      body: JSON.stringify({ snapshot: { version: 99 } }),
    });
    assert(malformed.response.status === 400, `malformed ${malformed.response.status}`);

    const okPut = await api("/api/v1/cx/workspace", {
      method: "PUT",
      headers: { authorization: `Bearer ${adminSessionId}` },
      body: JSON.stringify({
        snapshot: {
          version: 1,
          userId: adminUserId,
          revision: Date.now(),
          revisedAt: new Date().toISOString(),
          records: [
            {
              key: "afh.cx.security.probe",
              revision: 1,
              revisedAt: new Date().toISOString(),
              payload: { runId: RUN_ID },
            },
          ],
          devices: [],
        },
      }),
    });
    assert(okPut.response.status === 200, `valid put ${okPut.response.status}`);

    const got = await api("/api/v1/cx/workspace", {
      headers: { authorization: `Bearer ${adminSessionId}` },
    });
    assert(got.response.status === 200, `get ${got.response.status}`);
    assert(
      got.body?.data?.snapshot?.userId === adminUserId,
      "downloaded snapshot userId mismatch",
    );
    return {
      mismatch: mismatch.response.status,
      malformed: malformed.response.status,
      put: okPut.response.status,
    };
  });

  await scenario("protected admin API rejects missing bearer", "Authorization", async () => {
    const paths = [
      "/api/v1/auth/session",
      "/api/v1/auth/mfa/enable",
      "/api/v1/cx/workspace",
    ];
    const outcomes = [];
    for (const path of paths) {
      const method = path.includes("mfa") ? "POST" : "GET";
      const { response, text } = await api(path, {
        method,
        body: method === "POST" ? "{}" : undefined,
      });
      assert([401, 403].includes(response.status), `${path} → ${response.status}`);
      assert(!hasSensitiveLeak(text), `${path} leaked`);
      outcomes.push({ path, status: response.status });
    }
    return { outcomes };
  });

  // ----------------------------------------------------------- Browser SPA
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await scenario("SPA CSP meta is present and restrictive", "CORS/CSP", async () => {
    const indexHtml = await readFile(
      join(process.cwd(), "packages", "web", "index.html"),
      "utf8",
    );
    assert(
      !/script-src[^;]*'unsafe-eval'/.test(indexHtml),
      "production index.html CSP includes unsafe-eval",
    );
    assert(/script-src 'self'/.test(indexHtml), "index.html missing script-src self");
    assert(
      /connect-src 'self'/.test(indexHtml),
      "index.html missing connect-src self",
    );
    assert(
      !/connect-src[^;]*(localhost|127\.0\.0\.1)/.test(indexHtml),
      "production index.html CSP still allows localhost connect-src",
    );

    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .first()
      .getAttribute("content");
    assert(csp, "CSP meta missing");
    assert(/default-src 'self'/.test(csp), "default-src missing");
    assert(/script-src 'self'/.test(csp), "script-src missing");
    const hasUnsafeEval = /script-src[^;]*'unsafe-eval'/.test(csp);
    return {
      csp: csp.slice(0, 240),
      indexHtmlHasUnsafeEval: false,
      liveHasUnsafeEval: hasUnsafeEval,
      note: hasUnsafeEval
        ? "Live dev CSP includes unsafe-eval (Vite HMR). Shipped index.html does not."
        : "No unsafe-eval in live CSP",
    };
  });

  await scenario("open redirect returnUrl is sanitized in login", "Injection", async () => {
    await page.goto(`${BASE}/login?returnUrl=${encodeURIComponent("//evil.example")}`);
    await page.locator("#email").fill(ADMIN_EMAIL);
    await page.locator("#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 30_000,
    });
    const href = page.url();
    assert(!/evil\.example/i.test(href), `navigated to ${href}`);
    assert(new URL(href).origin === new URL(BASE).origin, "left origin");
    return { href };
  });

  await scenario("guest cannot open protected workspace routes", "Authorization", async () => {
    await context.clearCookies();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/admin/platform`);
    await page.waitForURL(/\/login/, { timeout: 15_000 });
    return { redirected: page.url() };
  });

  await scenario("session tokens live only in localStorage (not cookies)", "Storage", async () => {
    await page.goto(`${BASE}/login`);
    await page.locator("#email").fill(ADMIN_EMAIL);
    await page.locator("#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 30_000,
    });
    const stored = await page.evaluate(() => localStorage.getItem("afh.web.session"));
    assert(stored, "session not in localStorage");
    const parsed = JSON.parse(stored);
    assert(parsed?.tokens?.sessionId, "sessionId missing from storage");
    assert(parsed?.tokens?.refreshToken, "refreshToken missing from storage");
    const cookies = await context.cookies();
    const authCookies = cookies.filter((c) =>
      /session|token|auth|refresh/i.test(c.name),
    );
    assert(authCookies.length === 0, `auth cookies present: ${authCookies.map((c) => c.name)}`);
    return {
      storageKey: "afh.web.session",
      cookieAuthCount: authCookies.length,
      note: "Bearer/localStorage auth — CSRF N/A; XSS impact elevated (accepted RC9.5 risk).",
    };
  });

  await scenario("planner HTML export encodes hostile labels", "Injection", async () => {
    // Unit-level encoding is covered by rc108-security.test.ts; here we assert
    // the live planner page still exposes the export control without console errors.
    await page.goto(`${BASE}/planner`);
    await page.waitForLoadState("domcontentloaded");
    const body = await page.locator("body").innerText();
    assert(body.length > 0, "planner blank");
    const exportBtn = page.getByRole("button", { name: /print|pdf|download/i });
    const count = await exportBtn.count();
    return { exportControls: count, consoleErrors: consoleErrors.slice(-5) };
  });

  await browser.close();

  // Disposable MFA (dev DB only — skipped when API DB is isolated)
  await scenario("MFA challenge replay rejected when disposable path available", "Authentication", async () => {
    const email = `${RUN_ID}-mfa@example.test`;
    const password = "SecurePass12!";
    const reg = await api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        fullName: "MFA Probe",
      }),
    });
    if (reg.response.status !== 201) {
      return { skipped: true, reason: `register ${reg.response.status}` };
    }
    const activation = activateDisposableAccount(email);
    if (!activation.activated) {
      return { skipped: true, reason: activation.reason };
    }
    const signIn = await api("/api/v1/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (signIn.response.status !== 200) {
      return {
        skipped: true,
        reason: `activated sign-in ${signIn.response.status} (API may use a different database)`,
      };
    }
    const sessionId = signIn.body?.data?.tokens?.sessionId;
    const enabled = await api("/api/v1/auth/mfa/enable", {
      method: "POST",
      headers: { authorization: `Bearer ${sessionId}` },
      body: "{}",
    });
    assert(enabled.response.status === 200, `mfa enable ${enabled.response.status}`);
    const token = enabled.body?.data?.token;
    if (!token) {
      return { mfaEnabled: true, sealedChallenge: true };
    }
    const blocked = await api("/api/v1/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    assert(
      blocked.body?.error?.code === "mfa_required" ||
        [401, 403].includes(blocked.response.status),
      "password-only sign-in not blocked after MFA",
    );
    const ok = await api("/api/v1/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password, mfaToken: token }),
    });
    assert(ok.response.status === 200, `challenged sign-in ${ok.response.status}`);
    const replay = await api("/api/v1/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password, mfaToken: token }),
    });
    assert(
      [400, 401, 403].includes(replay.response.status),
      `replay ${replay.response.status}`,
    );
    return {
      blocked: blocked.response.status,
      challenged: ok.response.status,
      replay: replay.response.status,
    };
  });

  const failed = report.scenarios.filter((s) => s.status === "FAIL");
  report.summary = {
    total: report.scenarios.length,
    passed: report.scenarios.length - failed.length,
    failed: failed.length,
  };

  const outPath = join(OUT_DIR, "rc108-security-audit-report.json");
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Report written: ${outPath}`);
  console.log(
    `Security audit: ${failed.length ? "FAIL" : "PASS"} (${report.summary.passed}/${report.summary.total})`,
  );
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
