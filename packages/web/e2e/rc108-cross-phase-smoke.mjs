/**
 * RC10.8 — Cross-phase RC10.1–RC10.7 smoke verification.
 *
 * Prerequisites:
 * - Runtime host/API at http://127.0.0.1:8080
 * - Vite web app at http://localhost:5173
 *
 * Usage (from repo root):
 *   node packages/web/e2e/rc108-cross-phase-smoke.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.AFH_E2E_BASE_URL ?? "http://localhost:5173";
const EMAIL = process.env.AFH_E2E_EMAIL ?? "admin@afh.local";
const PASSWORD = process.env.AFH_E2E_PASSWORD ?? "Admin123!Admin123!";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function signIn(page) {
  await page.goto(`${BASE}/login`);
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
  });
}

async function verifyRoute(page, phase, path, expected) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState("domcontentloaded");
  await page.getByText(expected, { exact: false }).first().waitFor({
    state: "visible",
    timeout: 30_000,
  });
  assert(!page.url().includes("/login"), `${phase} redirected to login`);
  console.log(`PASS ${phase}: ${path}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await signIn(page);

  await verifyRoute(page, "RC10.1 Design Studio", "/my-projects", /Design Studio/i);
  await verifyRoute(page, "RC10.2 Notifications", "/notifications", /Notifications/i);
  await verifyRoute(page, "RC10.3 Configurator/Planner", "/planner", /Intelligent budget planner/i);
  await verifyRoute(page, "RC10.4 CRM/Orders", "/app/sales/workflow", /Sales workflow/i);

  await page.goto(`${BASE}/app`);
  const syncChip = page.getByRole("button", { name: /Synchronization:/i }).first();
  await syncChip.waitFor({ state: "visible", timeout: 30_000 });
  console.log("PASS RC10.5 Sync chip");

  const auth = await page.evaluate(() => {
    const raw = localStorage.getItem("afh.web.session");
    if (!raw) return { sessionId: "", companyId: "" };
    const parsed = JSON.parse(raw);
    return {
      sessionId: parsed?.tokens?.sessionId ?? "",
      companyId: parsed?.user?.companyId ?? "",
    };
  });
  const syncResponse = await page.request.get(`${BASE}/api/v1/cx/workspace`, {
    headers: {
      Authorization: `Bearer ${auth.sessionId}`,
      ...(auth.companyId ? { "X-Company-Id": auth.companyId } : {}),
    },
  });
  assert(
    syncResponse.status() === 200 || syncResponse.status() === 404,
    `RC10.5 sync GET failed: ${syncResponse.status()}`,
  );
  console.log(`PASS RC10.5 Sync API: HTTP ${syncResponse.status()}`);

  await verifyRoute(page, "RC10.6 Workspace BI", "/app/sales/analytics", /Workspace BI/i);
  await verifyRoute(
    page,
    "RC10.7 Manufacturing Ops",
    "/app/manufacturing/ops",
    /Manufacturing operations/i,
  );

  console.log("RC10.8 cross-phase smoke: PASS");
} finally {
  await context.close();
  await browser.close();
}
