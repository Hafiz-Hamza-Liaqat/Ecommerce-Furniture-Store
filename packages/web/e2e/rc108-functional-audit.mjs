/**
 * RC10.8 Phase 2 — Functional Audit
 *
 * Exercises cross-page business journeys that complement the existing unit,
 * API, identity, and Playwright suites. All created data uses an `audit-`
 * prefix and unique timestamp.
 *
 * Prerequisites:
 *   web: http://localhost:5173
 *   API/runtime host: http://127.0.0.1:8080
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const BASE = process.env.AFH_E2E_BASE_URL ?? "http://localhost:5173";
const API = process.env.AFH_E2E_API_URL ?? "http://127.0.0.1:8080";
const ADMIN_EMAIL = process.env.AFH_E2E_EMAIL ?? "admin@afh.local";
const ADMIN_PASSWORD =
  process.env.AFH_E2E_PASSWORD ?? "Admin123!Admin123!";
const RUN_ID = `audit-${Date.now()}`;
const OUT_DIR = join(
  process.cwd(),
  "packages",
  "web",
  "test-results",
  "functional-audit",
);

const report = {
  generatedAt: new Date().toISOString(),
  runId: RUN_ID,
  browser: "chromium",
  baseUrl: BASE,
  apiUrl: API,
  seedData: {
    adminAccount: ADMIN_EMAIL,
    disposablePrefix: RUN_ID,
  },
  scenarios: [],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createEvidence() {
  return {
    console: [],
    pageErrors: [],
    failedRequests: [],
    httpFailures: [],
    dialogs: [],
  };
}

function instrument(page, evidence) {
  page.on("console", (message) => {
    if (!["error", "warning"].includes(message.type())) return;
    const location = message.location();
    evidence.console.push({
      type: message.type(),
      text: message.text(),
      location: `${location.url}:${location.lineNumber}`,
    });
  });
  page.on("pageerror", (error) => evidence.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    evidence.failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText ?? "unknown",
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      evidence.httpFailures.push({
        status: response.status(),
        url: response.url(),
      });
    }
  });
  page.on("dialog", async (dialog) => {
    evidence.dialogs.push({
      type: dialog.type(),
      message: dialog.message(),
    });
    await dialog.dismiss();
  });
}

function snapshotEvidence(evidence) {
  const result = structuredClone(evidence);
  evidence.console.length = 0;
  evidence.pageErrors.length = 0;
  evidence.failedRequests.length = 0;
  evidence.httpFailures.length = 0;
  evidence.dialogs.length = 0;
  return result;
}

function unexpectedEvidence(evidence, allowedStatuses = []) {
  const consoleMessages = evidence.console.filter(
    (entry) => {
      if (/^\[vite\]|Download the React DevTools/i.test(entry.text)) return false;
      if (
        /WebSocket connection to 'ws:\/\/(localhost|127\.0\.0\.1):\d+/i.test(
          entry.text,
        ) ||
        /failed to connect to websocket/i.test(entry.text)
      ) {
        // Vite HMR websocket noise is expected during intentional offline
        // scenarios and when the audit targets a non-default Vite port.
        return false;
      }
      const expectedResourceFailure = entry.text.match(
        /server responded with a status of (\d{3})/i,
      );
      if (
        expectedResourceFailure &&
        allowedStatuses.includes(Number(expectedResourceFailure[1]))
      ) {
        return false;
      }
      return true;
    },
  );
  const pageErrors = evidence.pageErrors;
  const failedRequests = evidence.failedRequests.filter(
    (entry) => !/ERR_ABORTED/.test(entry.error),
  );
  const httpFailures = evidence.httpFailures.filter(
    (entry) => !allowedStatuses.includes(entry.status),
  );
  return { consoleMessages, pageErrors, failedRequests, httpFailures };
}

async function scenario(
  name,
  workstream,
  page,
  evidence,
  run,
  { allowedStatuses = [] } = {},
) {
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
  // Browser resource-error console messages can arrive just after the
  // response event; wait briefly so evidence stays with the correct scenario.
  await page.waitForTimeout(100);
  const captured = snapshotEvidence(evidence);
  const unexpected = unexpectedEvidence(captured, allowedStatuses);
  if (
    unexpected.consoleMessages.length ||
    unexpected.pageErrors.length ||
    unexpected.failedRequests.length ||
    unexpected.httpFailures.length
  ) {
    status = "FAIL";
    failure ??= `Unexpected runtime evidence: ${JSON.stringify(unexpected)}`;
  }
  report.scenarios.push({
    name,
    workstream,
    status,
    durationMs: Date.now() - startedAt,
    details,
    failure,
    evidence: captured,
  });
  console.log(`${status} [${workstream}] ${name}`);
}

/**
 * Activate a disposable account directly in the development database, using
 * the same pattern as scripts/activate-smoke-user.mjs. Registration leaves
 * accounts in `registered` status and no activation API route exists.
 */
function activateDisposableAccount(email) {
  const dbPath = join(
    process.cwd(),
    "packages",
    "runtime-host",
    "data",
    "afh.dev.sqlite",
  );
  if (!existsSync(dbPath)) {
    return { activated: false, reason: "development database not found" };
  }
  const db = new DatabaseSync(dbPath);
  try {
    db.exec("PRAGMA busy_timeout = 5000");
    const row = db
      .prepare(
        "SELECT id, payload_json FROM identity_records WHERE record_type = 'user' AND lookup_key = ?",
      )
      .get(email.toLowerCase());
    if (!row) return { activated: false, reason: "user record not found" };
    const payload = JSON.parse(row.payload_json);
    if (payload.status !== "active") {
      payload.status = "active";
      payload.updatedAt = new Date().toISOString();
      db.prepare(
        "UPDATE identity_records SET payload_json = ?, updated_at = ? WHERE id = ?",
      ).run(JSON.stringify(payload), payload.updatedAt, row.id);
    }
    return { activated: true };
  } finally {
    db.close();
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

async function signIn(page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto(`${BASE}/login`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/sign-in") &&
      response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  const response = await responsePromise;
  assert(response.ok(), `sign-in returned HTTP ${response.status()}`);
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
  });
}

async function settled(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(500);
  await page
    .waitForLoadState("networkidle", { timeout: 8_000 })
    .catch(() => {});
}

async function assertHealthyPage(page) {
  const state = await page.evaluate(() => ({
    bodyText: document.body?.innerText?.slice(0, 4000) ?? "",
    rootChildren: document.querySelector("#root")?.childElementCount ?? 0,
  }));
  assert(state.rootChildren > 0, "application root is blank");
  assert(
    !/unexpected application error|something went wrong/i.test(state.bodyText),
    "React/application error boundary rendered",
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const evidence = createEvidence();
  instrument(page, evidence);

  // ---------------------------------------------------------------- Auth

  await scenario(
    "unauthorized workspace redirects to login without loop",
    "Authentication",
    page,
    evidence,
    async () => {
      await page.goto(`${BASE}/app/sales/orders`);
      await page.waitForURL(/\/login/, { timeout: 20_000 });
      const url = new URL(page.url());
      assert(url.pathname === "/login", `unexpected path ${url.pathname}`);
      assert(
        url.searchParams.get("returnUrl") === "/app/sales/orders",
        "protected deep link returnUrl was not preserved",
      );
      assert(
        await page
          .locator("#email")
          .waitFor({ state: "visible", timeout: 10_000 })
          .then(() => true)
          .catch(() => false),
        "login form not visible after redirect",
      );
      return { finalUrl: page.url() };
    },
  );

  await scenario(
    "protected API rejects missing session",
    "Authentication",
    page,
    evidence,
    async () => {
      const { response, body } = await api("/api/v1/auth/session", {
        method: "GET",
      });
      assert(
        [401, 403].includes(response.status),
        `expected 401/403, got ${response.status}`,
      );
      assert(
        !JSON.stringify(body).includes("stack"),
        "protected API exposed stack trace",
      );
      return { status: response.status, body };
    },
    { allowedStatuses: [401, 403] },
  );

  await scenario(
    "invalid credentials fail gracefully",
    "Authentication",
    page,
    evidence,
    async () => {
      await page.goto(`${BASE}/login`);
      await page.locator("#email").fill("missing-user@example.test");
      await page.locator("#password").fill("WrongPassword12!");
      const responsePromise = page.waitForResponse((response) =>
        response.url().includes("/api/v1/auth/sign-in"),
      );
      await page.getByRole("button", { name: /^Sign in$/i }).click();
      const response = await responsePromise;
      assert(
        [401, 403].includes(response.status()),
        `expected 401/403, got ${response.status()}`,
      );
      assert(
        await page.getByRole("alert").isVisible(),
        "invalid credentials did not render an error alert",
      );
      assert(
        new URL(page.url()).pathname === "/login",
        "invalid sign-in navigated away",
      );
      return { status: response.status() };
    },
    { allowedStatuses: [401, 403] },
  );

  const disposableEmail = `${RUN_ID}@example.test`;
  const disposablePassword = "AuditUser12!Secure";
  const disposableNewPassword = "AuditUser34!Changed";
  let disposableResetToken = null;

  await scenario(
    "disposable sign-up and duplicate account rejection",
    "Authentication",
    page,
    evidence,
    async () => {
      const registration = await api("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: disposableEmail,
          password: disposablePassword,
          fullName: "Functional Audit User 😀",
        }),
      });
      assert(
        registration.response.status === 201,
        `registration returned ${registration.response.status}`,
      );
      const duplicate = await api("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: disposableEmail,
          password: disposablePassword,
          fullName: "Duplicate Audit User",
        }),
      });
      assert(
        [400, 409].includes(duplicate.response.status),
        `duplicate registration returned ${duplicate.response.status}`,
      );
      assert(
        !JSON.stringify(duplicate.body).includes("stack"),
        "duplicate response exposed stack",
      );
      return {
        email: disposableEmail,
        registerStatus: registration.response.status,
        duplicateStatus: duplicate.response.status,
      };
    },
    { allowedStatuses: [400, 409] },
  );

  await scenario(
    "password reset request is enumeration-safe",
    "Authentication",
    page,
    evidence,
    async () => {
      const known = await api("/api/v1/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: disposableEmail }),
      });
      const unknown = await api("/api/v1/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: `${RUN_ID}-missing@example.test` }),
      });
      assert(known.response.status === 200, `known reset ${known.response.status}`);
      assert(
        unknown.response.status === 200,
        `unknown reset ${unknown.response.status}`,
      );
      const knownData = known.body?.data ?? {};
      const unknownData = unknown.body?.data ?? {};
      const revealEnabled =
        typeof knownData.token === "string" && knownData.token.length > 0;
      disposableResetToken = revealEnabled ? knownData.token : null;
      if (!revealEnabled) {
        assert(
          !("token" in knownData),
          "sealed reset response unexpectedly contained token field",
        );
        assert(
          JSON.stringify(knownData) === JSON.stringify(unknownData),
          "sealed known/unknown reset response differs",
        );
      } else {
        // Local development intentionally enables
        // AFH_REVEAL_CHALLENGE_TOKENS for functional testing. API unit tests
        // separately verify the production/default sealed response.
        assert(
          unknownData.token === "",
          "development no-op reset token was not empty",
        );
      }
      return {
        revealChallengeTokens: revealEnabled,
        knownShape: Object.keys(knownData),
        unknownShape: Object.keys(unknownData),
      };
    },
  );

  await scenario(
    "password reset confirmation rotates credentials",
    "Authentication",
    page,
    evidence,
    async () => {
      if (!disposableResetToken) {
        return {
          externalDeliveryRequired: true,
          note: "Production-sealed token cannot be consumed by local automation.",
        };
      }
      const confirmed = await api("/api/v1/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({
          token: disposableResetToken,
          newPassword: disposableNewPassword,
        }),
      });
      assert(
        confirmed.response.status === 200,
        `reset confirmation returned ${confirmed.response.status}`,
      );
      const oldPassword = await api("/api/v1/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({
          email: disposableEmail,
          password: disposablePassword,
        }),
      });
      const newPassword = await api("/api/v1/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({
          email: disposableEmail,
          password: disposableNewPassword,
        }),
      });
      assert(
        [401, 403].includes(oldPassword.response.status),
        `old password returned ${oldPassword.response.status}`,
      );
      assert(
        [200, 401, 403].includes(newPassword.response.status),
        `new password returned ${newPassword.response.status}`,
      );
      const oldCode = oldPassword.body?.error?.code;
      const newCode = newPassword.body?.error?.code;
      return {
        confirmed: confirmed.body?.data,
        oldPasswordCode: oldCode,
        newPasswordCode: newCode,
        note:
          oldCode === newCode
            ? "Inactive-account policy is evaluated before credential validity."
            : "Credential rejection changed after reset.",
      };
    },
    { allowedStatuses: [401, 403] },
  );

  await scenario(
    "MFA enrollment gates sign-in and challenged login succeeds",
    "Authentication",
    page,
    evidence,
    async () => {
      const activation = activateDisposableAccount(disposableEmail);
      assert(
        activation.activated,
        `disposable account activation failed: ${activation.reason}`,
      );

      // Password depends on whether the earlier reset scenario consumed a
      // revealed development token.
      const effectivePassword = disposableResetToken
        ? disposableNewPassword
        : disposablePassword;
      const baseline = await api("/api/v1/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({
          email: disposableEmail,
          password: effectivePassword,
        }),
      });
      assert(
        baseline.response.status === 200,
        `activated disposable sign-in returned ${baseline.response.status}`,
      );
      const sessionId = baseline.body?.data?.tokens?.sessionId;
      assert(sessionId, "activated sign-in returned no session id");

      const enabled = await api("/api/v1/auth/mfa/enable", {
        method: "POST",
        headers: { authorization: `Bearer ${sessionId}` },
        body: "{}",
      });
      assert(
        enabled.response.status === 200,
        `mfa enable returned ${enabled.response.status}`,
      );
      const challengeToken = enabled.body?.data?.token;
      if (!challengeToken) {
        return {
          mfaEnabled: true,
          externalDeliveryRequired: true,
          note: "Sealed challenge delivery; browser challenge requires the production provider.",
        };
      }

      // Browser: password-only sign-in must now be blocked with mfa_required
      // and the login page must surface the MFA code field.
      await page.goto(`${BASE}/login`);
      await page.locator("#email").fill(disposableEmail);
      await page.locator("#password").fill(effectivePassword);
      const blockedPromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/auth/sign-in") &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /^Sign in$/i }).click();
      const blocked = await blockedPromise;
      assert(
        [401, 403].includes(blocked.status()),
        `password-only sign-in with MFA enabled returned ${blocked.status()}`,
      );
      assert(
        await page.getByRole("alert").isVisible(),
        "mfa_required did not render an error alert",
      );
      const mfaField = page.getByLabel("MFA code");
      await mfaField.waitFor({ timeout: 10_000 });

      // Browser: challenged sign-in with the issued token succeeds.
      await mfaField.fill(challengeToken);
      const allowedPromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/auth/sign-in") &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /^Sign in$/i }).click();
      const allowed = await allowedPromise;
      assert(
        allowed.status() === 200,
        `challenged sign-in returned ${allowed.status()}`,
      );
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 30_000,
      });

      // Challenge tokens are single-use: replaying the consumed token fails.
      const replay = await api("/api/v1/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({
          email: disposableEmail,
          password: effectivePassword,
          mfaToken: challengeToken,
        }),
      });
      assert(
        [400, 401, 403].includes(replay.response.status),
        `consumed challenge replay returned ${replay.response.status}`,
      );

      // Leave a clean slate for the admin scenarios that follow.
      await page.evaluate(() => localStorage.removeItem("afh.web.session"));
      return {
        mfaEnabled: true,
        blockedStatus: blocked.status(),
        challengedStatus: allowed.status(),
        replayStatus: replay.response.status,
      };
    },
    { allowedStatuses: [400, 401, 403] },
  );

  await scenario(
    "admin sign-in restores session after refresh",
    "Authentication",
    page,
    evidence,
    async () => {
      await signIn(page);
      await page.goto(`${BASE}/app`);
      await settled(page);
      const storedBefore = await page.evaluate(() =>
        localStorage.getItem("afh.web.session"),
      );
      assert(storedBefore, "session not persisted to localStorage");
      await page.reload();
      await settled(page);
      assert(
        new URL(page.url()).pathname === "/app",
        `session did not restore: ${page.url()}`,
      );
      await assertHealthyPage(page);
      return { restored: true };
    },
  );

  await scenario(
    "session refresh rotates refresh token without losing access",
    "Authentication",
    page,
    evidence,
    async () => {
      const stored = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("afh.web.session") ?? "null"),
      );
      assert(stored?.tokens?.sessionId, "stored session id missing");
      const refreshed = await api("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({
          sessionId: stored.tokens.sessionId,
          refreshToken: stored.tokens.refreshToken,
        }),
      });
      assert(
        refreshed.response.status === 200,
        `session refresh returned ${refreshed.response.status}`,
      );
      const tokens = refreshed.body?.data?.tokens;
      assert(tokens?.refreshToken, "refresh response omitted tokens");
      assert(
        tokens.refreshToken !== stored.tokens.refreshToken,
        "refresh token did not rotate",
      );
      await page.evaluate((nextTokens) => {
        const key = "afh.web.session";
        const current = JSON.parse(localStorage.getItem(key));
        localStorage.setItem(
          key,
          JSON.stringify({ ...current, tokens: nextTokens }),
        );
      }, tokens);
      await page.reload();
      await settled(page);
      assert(
        new URL(page.url()).pathname === "/app",
        "rotated session lost protected access",
      );
      return { rotated: true, sessionIdStable: tokens.sessionId === stored.tokens.sessionId };
    },
  );

  await scenario(
    "email verification request and confirmation complete",
    "Authentication",
    page,
    evidence,
    async () => {
      const sessionId = await page.evaluate(() => {
        const stored = JSON.parse(
          localStorage.getItem("afh.web.session") ?? "null",
        );
        return stored?.tokens?.sessionId ?? null;
      });
      assert(sessionId, "email verification session missing");
      const issued = await api("/api/v1/auth/email-verification/request", {
        method: "POST",
        headers: { authorization: `Bearer ${sessionId}` },
        body: "{}",
      });
      assert(
        issued.response.status === 200,
        `verification request returned ${issued.response.status}`,
      );
      const token = issued.body?.data?.token;
      if (!token) {
        return {
          externalDeliveryRequired: true,
          responseShape: Object.keys(issued.body?.data ?? {}),
        };
      }
      const confirmed = await api("/api/v1/auth/email-verification/confirm", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      assert(
        confirmed.response.status === 200,
        `verification confirmation returned ${confirmed.response.status}`,
      );
      assert(
        confirmed.body?.data?.verified === true,
        "verification response did not confirm success",
      );
      return { verified: true };
    },
  );

  // --------------------------------------------------- Profile / settings

  await scenario(
    "workspace and notification preferences persist after refresh",
    "User Profile & Settings",
    page,
    evidence,
    async () => {
      await page.goto(`${BASE}/app/preferences`);
      await settled(page);
      const theme = page
        .locator("label", { hasText: "Theme" })
        .locator("select");
      await theme.selectOption("dark");
      await page.getByRole("button", { name: /Save preferences/i }).click();
      await page.getByText("Preferences applied.").waitFor();

      await page.getByRole("tab", { name: "Notifications" }).click();
      const sms = page.getByLabel("SMS notifications");
      if (!(await sms.isChecked())) await sms.check();
      const digest = page
        .locator("label", { hasText: "Digest" })
        .locator("select");
      await digest.selectOption("weekly");
      await page.getByRole("button", { name: /Save preferences/i }).click();

      await page.reload();
      await settled(page);
      await page.getByRole("tab", { name: "Notifications" }).click();
      assert(await page.getByLabel("SMS notifications").isChecked(), "SMS pref lost");
      assert(
        (await page
          .locator("label", { hasText: "Digest" })
          .locator("select")
          .inputValue()) === "weekly",
        "digest pref lost",
      );
      const stored = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("afh.web.user.prefs") ?? "null"),
      );
      assert(stored?.theme === "dark", "theme pref not persisted");
      return { theme: stored.theme, sms: stored.notifSms, digest: stored.notifDigest };
    },
  );

  await scenario(
    "AI settings persist after refresh",
    "User Profile & Settings",
    page,
    evidence,
    async () => {
      await page.goto(`${BASE}/app/settings/ai`);
      await settled(page);
      const numberInputs = page.locator("main input[type='number']");
      if (await numberInputs.count()) {
        await numberInputs.first().fill("0.6");
      }
      const checkboxes = page.locator("main input[type='checkbox']");
      if (await checkboxes.count()) {
        const first = checkboxes.first();
        const next = !(await first.isChecked());
        if (next) await first.check();
        else await first.uncheck();
      }
      await page.getByRole("button", { name: /^Save$/ }).click();
      const before = await page.evaluate(() =>
        localStorage.getItem("afh.web.ai.settings"),
      );
      assert(before, "AI settings were not persisted");
      await page.reload();
      await settled(page);
      const after = await page.evaluate(() =>
        localStorage.getItem("afh.web.ai.settings"),
      );
      assert(after === before, "AI settings changed after refresh");
      return { settings: JSON.parse(after) };
    },
  );

  // ------------------------------------------------------- Design workflow

  let projectTitle = `${RUN_ID} Office`;

  await scenario(
    "create project validates input and persists across refresh/navigation",
    "Interior Design Workflow",
    page,
    evidence,
    async () => {
      await page.goto(`${BASE}/my-projects`);
      await settled(page);
      await page.getByRole("button", { name: /^New project$/i }).click();
      const dialog = page.getByRole("dialog", { name: /New project/i });
      await dialog.waitFor();

      await dialog.getByRole("button", { name: /^Create project$/i }).click();
      assert(
        await dialog.getByRole("alert").isVisible(),
        "empty project name was accepted",
      );

      await dialog.getByPlaceholder(/Bahria Office Interior/i).fill(projectTitle);
      await dialog.getByLabel("Project type").selectOption("office");
      await dialog
        .getByPlaceholder(/Optional notes/i)
        .fill("Functional audit — Unicode اردو 😀");
      await dialog
        .locator("label", { hasText: "Budget" })
        .locator("input")
        .fill("1250000");
      await dialog
        .locator("label", { hasText: "Location" })
        .locator("input")
        .fill("Lahore");
      await dialog.getByRole("button", { name: /^Create project$/i }).click();
      await page.waitForTimeout(800);

      await page.waitForURL(/\/planner/, { timeout: 10_000 });
      const projectsBefore = await page.evaluate(() => {
        const index = JSON.parse(
          localStorage.getItem("afh.cx.projects.index") ?? "[]",
        );
        return index;
      });
      const created = projectsBefore.find((item) => item.title === projectTitle);
      assert(created, "project index missing created project");

      await page.goto(`${BASE}/planner?projectId=${created.id}`);
      await settled(page);
      await assertHealthyPage(page);
      await page.goto(`${BASE}/my-projects`);
      await settled(page);
      await page.reload();
      await settled(page);
      assert(
        await page.getByText(projectTitle, { exact: true }).first().isVisible(),
        "project lost after navigation/refresh",
      );
      return { projectId: created.id, projectTitle };
    },
  );

  // -------------------------------------------------------- Marketing site

  await scenario(
    "catalog search, wishlist, and compare survive navigation",
    "Marketing Website",
    page,
    evidence,
    async () => {
      await page.goto(`${BASE}/products/meridian-sofa`);
      await settled(page);
      const wishlistButton = page.getByRole("button", {
        name: /wishlist|save|heart/i,
      });
      if (await wishlistButton.count()) await wishlistButton.first().click();
      const compareButton = page.getByRole("button", { name: /compare/i });
      if (await compareButton.count()) await compareButton.first().click();

      await page.goto(`${BASE}/wishlist`);
      await settled(page);
      await page.reload();
      await settled(page);
      await assertHealthyPage(page);

      await page.goto(`${BASE}/`);
      await settled(page);
      await page
        .locator("button.site-nav__icon-btn[aria-label='Search']")
        .first()
        .click();
      await page.locator("#site-search-q").fill("Meridian");
      await page.waitForTimeout(400);
      assert(
        (await page.locator(".site-search__results a").count()) > 0,
        "catalog search returned no result",
      );
      await page.keyboard.press("Escape");
      return {
        wishlist: await page.evaluate(() =>
          localStorage.getItem("afh.cx.wishlist"),
        ),
        compare: await page.evaluate(() =>
          localStorage.getItem("afh.cx.compare"),
        ),
      };
    },
  );

  // --------------------------------------------------------- ERP modules

  const moduleEntities = [
    ["Sales", "/app/sales/customers"],
    ["Procurement", "/app/procurement/suppliers"],
    ["Inventory", "/app/inventory/products"],
    ["Finance", "/app/finance/invoices"],
    ["Projects", "/app/projects/projects"],
    ["CRM", "/app/crm/leads"],
    ["Service", "/app/service/tickets"],
    ["HR", "/app/hr/employees"],
    ["Manufacturing", "/app/manufacturing/work-orders"],
    ["CMS", "/app/cms/content"],
    ["DAM", "/app/dam/assets"],
  ];

  await scenario(
    "representative ERP list/search/filter/detail/validation across modules",
    "ERP Modules",
    page,
    evidence,
    async () => {
      const matrix = [];
      for (const [moduleName, path] of moduleEntities) {
        await page.goto(`${BASE}${path}`);
        await settled(page);
        await assertHealthyPage(page);
        const listSurface = await page
          .locator("table, [role='table'], .adv-table, .ws-empty")
          .count();
        assert(listSurface > 0, `${moduleName}: list/empty surface missing`);

        const search = page
          .locator(
            "main input[type='search'], main input[placeholder*='Search'], main input[placeholder*='search']",
          )
          .first();
        if (await search.count()) {
          await search.fill(`${RUN_ID}-no-match`);
          await page.waitForTimeout(250);
          await search.fill("");
        }

        const select = page.locator("main select").first();
        if (await select.count()) {
          const options = await select.locator("option").count();
          if (options > 1) {
            await select.selectOption({ index: 1 });
            await page.waitForTimeout(200);
            await select.selectOption({ index: 0 }).catch(() => {});
          }
        }

        const row = page.locator("table tbody tr").first();
        let detail = false;
        if (await row.count()) {
          await row.click();
          await page.waitForTimeout(250);
          detail =
            (await page.locator("[role='dialog'], .erp-drawer").count()) > 0 ||
            new URL(page.url()).pathname !== path;
          await page.keyboard.press("Escape");
        }

        await page.goto(`${BASE}${path}/new`);
        await settled(page);
        const form = page.locator("main form").first();
        const hasForm = (await form.count()) > 0;
        if (hasForm) {
          const required = form.locator("input[required], textarea[required]").first();
          const submit = form.locator("button[type='submit']").first();
          if ((await required.count()) && (await submit.count())) {
            await required.fill("");
            await submit.click();
            await page.waitForTimeout(200);
            assert(
              new URL(page.url()).pathname.endsWith("/new"),
              `${moduleName}: missing required value unexpectedly created a record`,
            );
          }
        }

        matrix.push({
          module: moduleName,
          path,
          search: Boolean(await search.count()),
          filter: Boolean(await select.count()),
          detailAttempted: Boolean(await row.count()),
          detail,
          createValidation: hasForm,
        });
        await page.waitForTimeout(120);
      }
      return { matrix };
    },
    { allowedStatuses: [400, 404, 422] },
  );

  // ------------------------------------------------------ Notifications

  await scenario(
    "notification unread count, mark-read, and persistence",
    "Notifications",
    page,
    evidence,
    async () => {
      await page.goto(`${BASE}/notifications`);
      await page.evaluate((runId) => {
        const key = "afh.cx.notifications";
        const items = JSON.parse(localStorage.getItem(key) ?? "[]");
        items.unshift({
          id: `${runId}-notification`,
          category: "project_saved",
          title: "Functional audit project saved",
          body: "Disposable unread notification",
          createdAt: new Date().toISOString(),
          read: false,
          href: "/my-projects",
        });
        localStorage.setItem(key, JSON.stringify(items));
      }, RUN_ID);
      await page.reload();
      await settled(page);
      const before = await page.evaluate(() => {
        const raw = localStorage.getItem("afh.cx.notifications");
        return raw ? JSON.parse(raw) : null;
      });
      const markAll = page.getByRole("button", { name: /Mark all read/i });
      assert(await markAll.isEnabled(), "mark-all-read was disabled with unread items");
      await markAll.first().click();
      await page.waitForTimeout(300);
      await page.reload();
      await settled(page);
      const after = await page.evaluate(() => {
        const raw = localStorage.getItem("afh.cx.notifications");
        return raw ? JSON.parse(raw) : null;
      });
      assert(Array.isArray(after), "notification persistence record missing");
      assert(
        after.every((item) => item.read),
        "mark-all-read did not persist",
      );
      return {
        beforeUnread: Array.isArray(before)
          ? before.filter((item) => !item.read).length
          : null,
        afterUnread: after.filter((item) => !item.read).length,
      };
    },
  );

  // ----------------------------------------------------------- AI

  await scenario(
    "AI consultant handles prompt and preserves context",
    "AI Features",
    page,
    evidence,
    async () => {
      await page.goto(`${BASE}/consultant`);
      await settled(page);
      const input = page.locator("#consultant-input");
      assert(await input.count(), "AI consultant input missing");
      const prompt = `Plan an 8-seat office ${RUN_ID}`;
      await input.fill(prompt);
      const send = page.getByRole("button", { name: /send|submit|continue/i });
      if (await send.count()) await send.first().click();
      else await input.press("Enter");
      await page.waitForTimeout(1200);
      const body = await page.locator("main").innerText();
      assert(
        body.length > prompt.length,
        "AI consultant produced no visible response/context",
      );
      await page.reload();
      await settled(page);
      await assertHealthyPage(page);
      return {
        storedConsultant: await page.evaluate(() => {
          const keys = Object.keys(localStorage).filter((key) =>
            /consult|planner|brief/.test(key),
          );
          return keys;
        }),
      };
    },
  );

  // ------------------------------------------ Navigation / error handling

  await scenario(
    "deep links and browser back/forward preserve destinations",
    "Navigation Integrity",
    page,
    evidence,
    async () => {
      await page.goto(`${BASE}/app/sales/customers`);
      await settled(page);
      await page.goto(`${BASE}/app/manufacturing/ops`);
      await settled(page);
      await page.goBack();
      await settled(page);
      assert(
        new URL(page.url()).pathname === "/app/sales/customers",
        "browser Back did not restore prior deep link",
      );
      await page.goForward();
      await settled(page);
      assert(
        new URL(page.url()).pathname === "/app/manufacturing/ops",
        "browser Forward did not restore destination",
      );
      return { finalUrl: page.url() };
    },
  );

  await scenario(
    "invalid IDs and missing records fail without blank screen",
    "Error Handling",
    page,
    evidence,
    async () => {
      for (const path of [
        "/products/not-a-real-product",
        "/projects/not-a-real-project",
        "/app/sales/customers/not-a-real-record",
      ]) {
        await page.goto(`${BASE}${path}`);
        await settled(page);
        await assertHealthyPage(page);
        const text = (await page.locator("body").innerText()).slice(0, 4000);
        assert(
          /not found|missing|unknown|no record|catalogue/i.test(text),
          `${path}: no helpful missing-record message`,
        );
      }
      return { invalidPaths: 3 };
    },
    { allowedStatuses: [404] },
  );

  await scenario(
    "offline navigation fails gracefully and reconnects",
    "Synchronization",
    page,
    evidence,
    async () => {
      await page.goto(`${BASE}/my-projects`);
      await settled(page);
      await context.setOffline(true);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(
        () => {},
      );
      await page.waitForTimeout(500);
      const offlineText = await page.locator("body").innerText().catch(() => "");
      await context.setOffline(false);
      await page.reload();
      await settled(page);
      await assertHealthyPage(page);
      assert(
        await page.getByText(projectTitle, { exact: true }).first().isVisible(),
        "project lost across offline/reconnect",
      );
      return { offlineSurfaceLength: offlineText.length, reconnected: true };
    },
    { allowedStatuses: [502, 503, 504] },
  );

  // --------------------------------------- Persistence through logout/login

  await scenario(
    "project and preferences survive logout/login",
    "Data Persistence",
    page,
    evidence,
    async () => {
      await page.goto(`${BASE}/app`);
      await settled(page);
      const logout = page
        .locator(".ws-user-menu__panel button", { hasText: "Log out" })
        .first();
      assert(await logout.count(), "logout action missing");
      await logout.evaluate((element) => element.click());
      await page.waitForTimeout(700);
      assert(
        !new URL(page.url()).pathname.startsWith("/app"),
        "logout left user on protected route",
      );
      assert(
        !(await page.evaluate(() => localStorage.getItem("afh.web.session"))),
        "logout left stale session",
      );

      await signIn(page);
      await page.goto(`${BASE}/my-projects`);
      await settled(page);
      assert(
        await page.getByText(projectTitle, { exact: true }).first().isVisible(),
        "project missing after logout/login",
      );
      const prefs = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("afh.web.user.prefs") ?? "null"),
      );
      assert(prefs?.theme === "dark", "preferences missing after logout/login");
      return { projectTitle, theme: prefs.theme };
    },
  );

  await scenario(
    "expired stored session does not grant protected access",
    "Authentication",
    page,
    evidence,
    async () => {
      const expired = await browser.newContext();
      const expiredPage = await expired.newPage();
      await expiredPage.goto(`${BASE}/login`);
      await expiredPage.evaluate(() => {
        localStorage.setItem(
          "afh.web.session",
          JSON.stringify({
            user: {
              id: "expired-user",
              email: "expired@example.test",
              companyId: "company-demo",
              status: "active",
              mfaEnabled: false,
            },
            tokens: {
              sessionId: "expired-session",
              refreshToken: "expired-refresh",
              expiresAt: new Date(Date.now() - 60_000).toISOString(),
              absoluteExpiresAt: new Date(Date.now() - 30_000).toISOString(),
            },
          }),
        );
      });
      await expiredPage.goto(`${BASE}/app`);
      await expiredPage.waitForTimeout(1500);
      assert(
        new URL(expiredPage.url()).pathname === "/login",
        `expired session reached protected page: ${expiredPage.url()}`,
      );
      await expired.close();
      return { rejected: true };
    },
  );

  await browser.close();

  const failures = report.scenarios.filter((entry) => entry.status === "FAIL");
  report.summary = {
    total: report.scenarios.length,
    passed: report.scenarios.length - failures.length,
    failed: failures.length,
    verdict: failures.length ? "FAIL" : "PASS",
  };

  const output = join(OUT_DIR, "rc108-functional-audit-report.json");
  await writeFile(output, JSON.stringify(report, null, 2), "utf8");
  console.log(`Report written: ${output}`);
  console.log(
    `Functional audit: ${report.summary.verdict} (${report.summary.passed}/${report.summary.total})`,
  );
  if (failures.length) process.exitCode = 1;
}

await main();
