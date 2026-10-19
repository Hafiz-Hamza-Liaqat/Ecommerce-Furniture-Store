/**
 * RC10.8 Phase 1 — Full UI & UX audit harness.
 *
 * Sweeps every planned route (guest marketing + authenticated workspace),
 * exercises overlays / navigation surfaces / representative ERP entities,
 * and runs a responsive pass at 1440 / 768 / 390.
 *
 * Records per route:
 *   - every console message of type error/warning (info/log ignored by design)
 *   - every pageerror (uncaught exception)
 *   - every failed network request (requestfailed)
 *   - every HTTP response >= 400
 *   - error-boundary text, missing headings, broken images, horizontal overflow
 *   - axe-core serious/critical violations on representative routes
 *
 * ALLOWLIST (documented, justification required):
 *   1. Vite dev-client / HMR websocket messages — dev-server tooling, not app code.
 *   2. "Download the React DevTools" — React informational banner, not a defect.
 *   3. net::ERR_ABORTED on lazy-chunk/image fetches during rapid SPA navigation —
 *      the audit navigates faster than users; aborted prefetches are benign.
 *      Aborts are still counted separately and reported.
 *
 * Prerequisites:
 *   - Runtime host/API at http://127.0.0.1:8080
 *   - Vite web app at http://localhost:5173
 *
 * Usage (from repo root):
 *   node packages/web/e2e/rc108-ui-audit.mjs
 */
import { chromium } from "playwright";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const BASE = process.env.AFH_E2E_BASE_URL ?? "http://localhost:5173";
const EMAIL = process.env.AFH_E2E_EMAIL ?? "admin@afh.local";
const PASSWORD = process.env.AFH_E2E_PASSWORD ?? "Admin123!Admin123!";
const OUT_DIR = join(process.cwd(), "packages", "web", "test-results", "ui-audit");

const require = createRequire(import.meta.url);
let AXE_SOURCE = null;
try {
  AXE_SOURCE = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
} catch {
  console.warn("axe-core not installed — accessibility scan will be skipped");
}

/* ---------------------------------------------------------------- routes */

const GUEST_ROUTES = [
  "/", "/furniture", "/furniture/living-room", "/furniture/living-room/sofas",
  "/furniture/bedroom", "/furniture/dining", "/furniture/office",
  "/products", "/products/meridian-sofa", "/products/cascade-table",
  "/compare", "/wishlist", "/planner", "/consultant", "/my-projects",
  "/notifications", "/downloads", "/cookies",
  "/projects", "/projects/indus-hq",
  "/about", "/story", "/leadership", "/manufacturing", "/factory",
  "/technology", "/sustainability", "/quality", "/certifications",
  "/careers", "/partners", "/distributors", "/news",
  "/blog", "/blog/quiet-luxury-in-contract-furniture", "/events", "/faq",
  "/privacy", "/terms", "/contact", "/quote", "/demo",
  "/login", "/register", "/password-reset", "/onboarding",
  "/this-page-should-404-route",
];

const AUTH_ROUTES = [
  "/workspace", "/portal", "/admin/platform",
  "/app", "/app/me", "/app/calendar", "/app/preferences", "/app/insights",
  "/app/analytics", "/app/analytics/builder", "/app/analytics/kpis/sales",
  "/app/reports", "/app/reports/sales",
  "/app/ai", "/app/ai/workspace", "/app/ai/writing", "/app/ai/documents",
  "/app/ai/knowledge", "/app/ai/prompts", "/app/ai/search", "/app/ai/modules",
  "/app/ai/usage", "/app/settings/ai",
  "/app/integrations", "/app/integrations/health", "/app/integrations/webhooks",
  "/app/integrations/api-keys", "/app/integrations/sync", "/app/integrations/audit",
  "/app/integrations/email", "/app/integrations/messaging", "/app/integrations/storage",
  "/app/integrations/maps", "/app/integrations/calendar", "/app/integrations/payments",
  "/app/integrations/shipping", "/app/integrations/sso",
  "/app/platform", "/app/platform/subscription", "/app/platform/billing",
  "/app/platform/licenses", "/app/platform/deployment", "/app/platform/monitoring",
  "/app/platform/jobs", "/app/platform/backups", "/app/platform/audit",
  "/app/platform/releases", "/app/platform/demo",
  "/app/sales", "/app/sales/workflow", "/app/sales/analytics",
  "/app/sales/customers", "/app/sales/customers/new", "/app/sales/opportunities",
  "/app/sales/pipeline", "/app/sales/quotations", "/app/sales/orders",
  "/app/procurement", "/app/procurement/suppliers",
  "/app/inventory", "/app/inventory/products",
  "/app/finance", "/app/finance/invoices",
  "/app/projects", "/app/projects/projects",
  "/app/crm", "/app/crm/leads",
  "/app/service", "/app/hr", "/app/hr/employees",
  "/app/manufacturing", "/app/manufacturing/ops", "/app/manufacturing/work-orders",
  "/app/cms", "/app/dam",
  "/app/notifications", "/app/search", "/app/reporting",
  "/app/workflow", "/app/approvals",
  "/app/account/security", "/app/account/mfa", "/app/account/email-verification",
];

const AXE_ROUTES = [
  "/", "/furniture/living-room/sofas", "/products/meridian-sofa", "/login",
  "/planner", "/app", "/app/sales/analytics", "/app/manufacturing/ops", "/app/crm",
];

const RESPONSIVE_ROUTES = [
  "/", "/furniture/living-room/sofas", "/products/meridian-sofa", "/planner",
  "/app", "/app/sales/analytics", "/app/manufacturing/ops", "/app/crm/leads",
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

/* ------------------------------------------------------------ allowlist */

const ALLOWLIST = [
  {
    pattern: /^\[vite\]|^vite.*(connect|hmr)/i,
    reason: "Vite dev-client / HMR tooling message — not application code",
  },
  {
    pattern: /^WebSocket connection to 'ws:\/\/(localhost|127\.0\.0\.1):5173/i,
    reason: "Vite HMR websocket — dev-server tooling, not application code",
  },
  {
    pattern: /Download the React DevTools/i,
    reason: "React informational banner — not a defect",
  },
];

function allowlisted(text) {
  return ALLOWLIST.find((a) => a.pattern.test(text));
}

/* ------------------------------------------------------- instrumentation */

function instrument(page, sink) {
  page.on("console", (msg) => {
    const type = msg.type();
    if (type !== "error" && type !== "warning") return;
    const text = msg.text();
    const allow = allowlisted(text);
    const loc = msg.location();
    sink.console.push({
      type,
      text,
      location: `${loc.url}:${loc.lineNumber}`,
      allowlisted: Boolean(allow),
      reason: allow?.reason,
    });
  });
  page.on("pageerror", (err) => {
    sink.pageErrors.push(String(err?.message ?? err));
  });
  page.on("requestfailed", (req) => {
    const failure = req.failure()?.errorText ?? "unknown";
    const aborted = failure.includes("ERR_ABORTED");
    sink.failedRequests.push({ url: req.url(), failure, aborted });
  });
  page.on("response", (res) => {
    if (res.status() >= 400) {
      sink.httpErrors.push({ url: res.url(), status: res.status() });
    }
  });
}

function newSink() {
  return { console: [], pageErrors: [], failedRequests: [], httpErrors: [] };
}

function drainSink(sink) {
  const snapshot = {
    console: [...sink.console],
    pageErrors: [...sink.pageErrors],
    failedRequests: [...sink.failedRequests],
    httpErrors: [...sink.httpErrors],
  };
  sink.console.length = 0;
  sink.pageErrors.length = 0;
  sink.failedRequests.length = 0;
  sink.httpErrors.length = 0;
  return snapshot;
}

/* ------------------------------------------------------------ page checks */

async function pageChecks(page) {
  return page.evaluate(() => {
    const doc = document;
    const boundary = /unexpected application error|something went wrong/i.test(
      doc.body?.innerText?.slice(0, 3000) ?? "",
    );
    const headings = doc.querySelectorAll("h1, h2, h3, [role='heading']").length;
    const brokenImages = [...doc.querySelectorAll("img")]
      .filter((img) => img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith("data:"))
      .map((img) => img.src)
      .slice(0, 10);
    const overflow =
      doc.documentElement.scrollWidth - doc.documentElement.clientWidth > 2;
    return { boundary, headings, brokenImages, overflowPx: overflow ? doc.documentElement.scrollWidth - doc.documentElement.clientWidth : 0 };
  });
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  // Marketing shell delays content behind a 280 ms skeleton transition.
  await page.waitForTimeout(700);
  await page
    .waitForLoadState("networkidle", { timeout: 8_000 })
    .catch(() => {});
}

async function visit(page, sink, path, { expectAuth = false } = {}) {
  const entry = { path, ok: true, issues: [] };
  try {
    await page.goto(`${BASE}${path}`, { timeout: 30_000 });
    await settle(page);
    const finalUrl = new URL(page.url());
    entry.finalPath = finalUrl.pathname;
    if (expectAuth && finalUrl.pathname.includes("/login")) {
      entry.ok = false;
      entry.issues.push("redirected to login (session lost?)");
    }
    const checks = await pageChecks(page);
    entry.checks = checks;
    if (checks.boundary) {
      entry.ok = false;
      entry.issues.push("error boundary rendered");
    }
    if (checks.headings === 0) entry.issues.push("no heading elements found");
    if (checks.brokenImages.length > 0)
      entry.issues.push(`broken images: ${checks.brokenImages.length}`);
    if (checks.overflowPx > 0)
      entry.issues.push(`horizontal overflow ${checks.overflowPx}px`);
  } catch (err) {
    entry.ok = false;
    entry.issues.push(`navigation failed: ${String(err.message ?? err).slice(0, 200)}`);
  }
  const events = drainSink(sink);
  entry.events = events;
  const realConsole = events.console.filter((c) => !c.allowlisted);
  const realFailed = events.failedRequests.filter((r) => !r.aborted);
  if (events.pageErrors.length) {
    entry.ok = false;
    entry.issues.push(`pageerrors: ${events.pageErrors.length}`);
  }
  if (realConsole.length) entry.issues.push(`console errors/warnings: ${realConsole.length}`);
  if (realFailed.length) entry.issues.push(`failed requests: ${realFailed.length}`);
  if (events.httpErrors.length) entry.issues.push(`http>=400: ${events.httpErrors.length}`);
  return entry;
}

/* ------------------------------------------------------------------ axe */

async function runAxe(page, path) {
  if (!AXE_SOURCE) return { path, skipped: true };
  await page.addScriptTag({ content: AXE_SOURCE });
  const result = await page.evaluate(async () => {
    const res = await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      preload: false,
    });
    return res.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
        count: v.nodes.length,
      }));
  });
  return { path, violations: result };
}

/* ------------------------------------------------------------- sign in */

async function signIn(page) {
  await page.goto(`${BASE}/login`);
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
}

/* ---------------------------------------------------------- interactions */

async function interactionAudit(page, sink, record) {
  async function step(name, fn) {
    try {
      await fn();
      const events = drainSink(sink);
      const realConsole = events.console.filter((c) => !c.allowlisted);
      const issues = [];
      if (events.pageErrors.length) issues.push(`pageerrors: ${events.pageErrors.length}`);
      if (realConsole.length) issues.push(`console: ${realConsole.length}`);
      record.push({ step: name, ok: issues.length === 0, issues, events });
    } catch (err) {
      const events = drainSink(sink);
      record.push({
        step: name,
        ok: false,
        issues: [`failed: ${String(err.message ?? err).slice(0, 200)}`],
        events,
      });
    }
  }

  /* --- marketing shell (guest-like surfaces still work signed in) --- */
  await step("marketing: search overlay open + query + close", async () => {
    await page.goto(`${BASE}/`);
    await settle(page);
    await page.locator("button.site-nav__icon-btn[aria-label='Search']").first().click();
    const input = page.locator("#site-search-q");
    await input.waitFor({ state: "visible", timeout: 5_000 });
    await input.fill("sofa");
    await page.waitForTimeout(400);
    const results = await page.locator(".site-search__results a").count();
    if (results === 0) throw new Error("search returned no results for 'sofa'");
    await page.keyboard.press("Escape");
  });

  await step("marketing: furniture mega opens with links", async () => {
    const trigger = page.locator("button.site-nav__mega-trigger", { hasText: "Furniture" });
    await trigger.click();
    const mega = page.locator(".site-mega--furniture");
    await mega.waitFor({ state: "visible", timeout: 5_000 });
    const links = await mega.locator("a").count();
    if (links < 5) throw new Error(`furniture mega only has ${links} links`);
    await page.keyboard.press("Escape");
  });

  await step("marketing: company mega opens with links", async () => {
    const trigger = page.locator("button.site-nav__mega-trigger", { hasText: "Company" });
    await trigger.click();
    const mega = page.locator(".site-mega--company");
    await mega.waitFor({ state: "visible", timeout: 5_000 });
    const links = await mega.locator("a").count();
    if (links < 5) throw new Error(`company mega only has ${links} links`);
    await page.keyboard.press("Escape");
  });

  await step("marketing: footer newsletter subscribe", async () => {
    await page.locator("#nl-email").scrollIntoViewIfNeeded();
    await page.locator("#nl-email").fill("audit@example.com");
    await page.locator(".site-newsletter button[type='submit']").click();
    const status = await page.locator("[data-nl-status]").innerText();
    if (!/subscribed/i.test(status)) throw new Error(`newsletter status: '${status}'`);
  });

  await step("marketing: chat panel open/close", async () => {
    await page.locator("button.site-chat").click();
    await page.locator(".site-chat-panel").waitFor({ state: "visible", timeout: 5_000 });
    await page.locator(".site-chat-panel button", { hasText: "Close" }).click();
  });

  await step("marketing: category filter + sort controls respond", async () => {
    await page.goto(`${BASE}/furniture/living-room/sofas`);
    await settle(page);
    const selects = page.locator("main select");
    const count = await selects.count();
    for (let i = 0; i < Math.min(count, 3); i += 1) {
      const options = await selects.nth(i).locator("option").allInnerTexts();
      if (options.length > 1) {
        await selects.nth(i).selectOption({ index: 1 });
        await page.waitForTimeout(250);
      }
    }
  });

  await step("marketing: account menu opens", async () => {
    await page.goto(`${BASE}/`);
    await settle(page);
    await page.locator(".site-nav__account--desktop .site-nav__account-trigger").click();
    await page.locator(".site-account-menu").first().waitFor({ state: "visible", timeout: 5_000 });
    await page.keyboard.press("Escape");
  });

  /* --------------------------- workspace shell --------------------------- */
  await step("workspace: command palette via topbar trigger", async () => {
    await page.goto(`${BASE}/app`);
    await settle(page);
    await page.locator("button.ws-search-trigger").click();
    const palette = page.locator("input[placeholder*='earch'], input[placeholder*='ommand'], .ws-palette input").first();
    await palette.waitFor({ state: "visible", timeout: 5_000 });
    await page.keyboard.press("Escape");
  });

  await step("workspace: quick create modal open/close", async () => {
    await page.getByRole("button", { name: /^Create$/ }).click();
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
  });

  await step("workspace: notification drawer open/close", async () => {
    await page.locator("button.ws-notif-btn").click();
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
  });

  await step("workspace: AI panel open/close", async () => {
    await page.locator("button[aria-label='Open AI assistant']").click();
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
  });

  await step("workspace: user menu shortcuts + help overlays", async () => {
    await page.locator(".ws-user-menu__panel button", { hasText: "Keyboard shortcuts" })
      .evaluate((el) => el.click());
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.locator(".ws-user-menu__panel button", { hasText: "Help" })
      .evaluate((el) => el.click());
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
  });

  await step("workspace: sidebar collapse/expand", async () => {
    await page.locator("button.ws-collapse-nav").click();
    await page.waitForTimeout(200);
    const collapsed = await page.locator("aside.ws-sidebar.is-collapsed").count();
    if (!collapsed) throw new Error("sidebar did not collapse");
    await page.locator("button.ws-collapse-nav").click();
  });

  await step("workspace: favorite toggle + toast", async () => {
    await page.locator("button[aria-pressed]").first().click();
    await page.waitForTimeout(300);
    await page.locator("button[aria-pressed]").first().click();
  });

  await step("workspace: breadcrumbs on deep route", async () => {
    await page.goto(`${BASE}/app/sales/customers`);
    await settle(page);
    const crumbLinks = page.locator(".ws-breadcrumbs a");
    const n = await crumbLinks.count();
    if (n < 2) throw new Error(`breadcrumb only has ${n} links`);
    await crumbLinks.nth(1).click(); // module crumb -> /app/sales
    await page.waitForTimeout(400);
    if (!page.url().includes("/app/sales")) throw new Error("module crumb did not navigate");
  });

  await step("workspace: sidebar nav group toggle + navigation", async () => {
    await page.goto(`${BASE}/app`);
    await settle(page);
    const toggle = page.locator("button.nav-group__toggle").first();
    await toggle.click();
    await page.waitForTimeout(150);
    await toggle.click();
    const link = page.locator("aside .nav-link", { hasText: "CRM" }).first();
    await link.click();
    await page.waitForTimeout(500);
    if (!page.url().includes("/app/crm")) throw new Error("sidebar CRM link did not navigate");
  });

  /* ------------------------- ERP module deep dive ------------------------ */
  await step("erp: sales customers list renders rows or empty state", async () => {
    await page.goto(`${BASE}/app/sales/customers`);
    await settle(page);
    const table = await page.locator("table, [role='table'], .adv-table").count();
    if (!table) throw new Error("no table rendered on customers list");
  });

  await step("erp: list search filter responds", async () => {
    const search = page.locator("main input[type='search'], main input[placeholder*='earch']").first();
    if (await search.count()) {
      await search.fill("zzz-no-match-audit");
      await page.waitForTimeout(400);
      await search.fill("");
      await page.waitForTimeout(300);
    }
  });

  await step("erp: export button responds without error", async () => {
    const exportBtn = page.getByRole("button", { name: /export/i }).first();
    if (await exportBtn.count()) {
      await exportBtn.click();
      await page.waitForTimeout(500);
      await page.keyboard.press("Escape");
    }
  });

  await step("erp: detail drawer opens from first row", async () => {
    const row = page.locator("table tbody tr, [role='row']").nth(1);
    if (await row.count()) {
      await row.click();
      await page.waitForTimeout(500);
      await page.keyboard.press("Escape");
    }
  });

  await step("erp: create form opens and cancels", async () => {
    await page.goto(`${BASE}/app/sales/customers/new`);
    await settle(page);
    const form = await page.locator("form, .form-shell").count();
    if (!form) throw new Error("create form did not render");
    await page.goBack();
  });

  /* ------------------------------ RC10 CX ------------------------------- */
  await step("cx: manufacturing ops tabs traverse", async () => {
    await page.goto(`${BASE}/app/manufacturing/ops`);
    await settle(page);
    const tabs = page.locator("main [role='tab'], main .ops-tabs button, main button");
    const total = Math.min(await tabs.count(), 8);
    for (let i = 0; i < total; i += 1) {
      const label = (await tabs.nth(i).innerText().catch(() => "")).trim();
      if (/inventory|bom|procure|production|supplier|movement|analytic/i.test(label)) {
        await tabs.nth(i).click();
        await page.waitForTimeout(250);
      }
    }
  });

  await step("cx: sales workflow board renders", async () => {
    await page.goto(`${BASE}/app/sales/workflow`);
    await settle(page);
    const heading = await page.getByText(/sales workflow/i).first().isVisible();
    if (!heading) throw new Error("sales workflow heading missing");
  });

  await step("cx: planner loads interactive canvas", async () => {
    await page.goto(`${BASE}/planner`);
    await settle(page);
    const buttons = await page.locator("main button").count();
    if (buttons < 3) throw new Error(`planner rendered only ${buttons} buttons`);
  });
}

/* ------------------------------------------------------------ responsive */

async function responsiveAudit(browser, authState, record) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      storageState: authState,
    });
    const page = await context.newPage();
    const sink = newSink();
    instrument(page, sink);

    for (const path of RESPONSIVE_ROUTES) {
      const entry = await visit(page, sink, path, { expectAuth: path.startsWith("/app") });
      entry.viewport = vp.name;
      record.push(entry);
    }

    // Drawer behaviors on mobile only.
    if (vp.name === "mobile") {
      const drawerRecord = [];
      const step = async (name, fn) => {
        try {
          await fn();
          drainSink(sink);
          drawerRecord.push({ step: name, ok: true });
        } catch (err) {
          drainSink(sink);
          drawerRecord.push({ step: name, ok: false, issue: String(err.message ?? err).slice(0, 200) });
        }
      };

      await step("mobile: marketing drawer open + scroll lock + close", async () => {
        await page.goto(`${BASE}/`);
        await settle(page);
        await page.locator("button.site-nav-toggle").click();
        await page.locator(".site-nav-drawer.is-open").waitFor({ state: "visible", timeout: 5_000 });
        const locked = await page.evaluate(() => document.body.style.overflow === "hidden");
        if (!locked) throw new Error("body scroll not locked while drawer open");
        await page.locator("button.site-nav-drawer__close").click();
        await page.waitForTimeout(300);
        const open = await page.locator(".site-nav-drawer.is-open").count();
        if (open) throw new Error("drawer did not close");
      });

      await step("mobile: workspace nav drawer open/close", async () => {
        await page.goto(`${BASE}/app`);
        await settle(page);
        await page.locator("button.ws-mobile-nav").click();
        await page.locator("aside.ws-sidebar.is-open").waitFor({ state: "visible", timeout: 5_000 });
        await page.locator("button.ws-nav-backdrop").click();
        await page.waitForTimeout(300);
        const open = await page.locator("aside.ws-sidebar.is-open").count();
        if (open) throw new Error("workspace drawer did not close via backdrop");
      });

      record.push(...drawerRecord.map((d) => ({ path: "(drawer)", viewport: "mobile", ...d })));
    }

    await context.close();
  }
}

/* ----------------------------------------------------------------- main */

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {
    generated: new Date().toISOString(),
    base: BASE,
    allowlist: ALLOWLIST.map((a) => ({ pattern: String(a.pattern), reason: a.reason })),
    guestRoutes: [],
    authRoutes: [],
    interactions: [],
    responsive: [],
    axe: [],
  };

  /* guest sweep */
  const guestCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const guestPage = await guestCtx.newPage();
  const guestSink = newSink();
  instrument(guestPage, guestSink);
  // Dismiss cookie banner so it does not skew overlay / contrast checks.
  await guestPage.goto(`${BASE}/`);
  await guestPage.evaluate(() => localStorage.setItem("afh.site.cookies", "1"));
  await guestPage.reload();
  await settle(guestPage);
  for (const path of GUEST_ROUTES) {
    const entry = await visit(guestPage, guestSink, path);
    report.guestRoutes.push(entry);
    console.log(`${entry.ok && entry.issues.length === 0 ? "PASS" : "FLAG"} guest ${path} ${entry.issues.join("; ")}`);
  }

  /* axe on guest routes */
  for (const path of AXE_ROUTES.filter((p) => !p.startsWith("/app"))) {
    await guestPage.goto(`${BASE}${path}`);
    await settle(guestPage);
    await guestPage.locator(".site-page-transition.is-ready, main#site-main .site-page").first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
    const axe = await runAxe(guestPage, path);
    report.axe.push(axe);
    console.log(`AXE ${path}: ${axe.skipped ? "skipped" : `${axe.violations.length} serious/critical`}`);
  }
  await guestCtx.close();

  /* authenticated sweep */
  const authCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const authPage = await authCtx.newPage();
  const authSink = newSink();
  instrument(authPage, authSink);
  await signIn(authPage);
  drainSink(authSink); // discard sign-in noise from route attribution
  await authPage.evaluate(() => localStorage.setItem("afh.site.cookies", "1"));

  for (const path of AUTH_ROUTES) {
    const entry = await visit(authPage, authSink, path, { expectAuth: true });
    report.authRoutes.push(entry);
    console.log(`${entry.ok && entry.issues.length === 0 ? "PASS" : "FLAG"} auth ${path} ${entry.issues.join("; ")}`);
    // Brief pause to avoid tripping cx/workspace rate limits during rapid sweeps.
    await authPage.waitForTimeout(120);
  }

  /* axe on authed routes */
  for (const path of AXE_ROUTES.filter((p) => p.startsWith("/app"))) {
    await authPage.goto(`${BASE}${path}`);
    await settle(authPage);
    const axe = await runAxe(authPage, path);
    report.axe.push(axe);
    console.log(`AXE ${path}: ${axe.skipped ? "skipped" : `${axe.violations.length} serious/critical`}`);
  }

  /* interactions */
  await interactionAudit(authPage, authSink, report.interactions);
  for (const step of report.interactions) {
    console.log(`${step.ok ? "PASS" : "FLAG"} interaction ${step.step} ${step.issues?.join("; ") ?? ""}`);
  }

  const authState = await authCtx.storageState();
  await authCtx.close();

  /* responsive */
  await responsiveAudit(browser, authState, report.responsive);
  for (const entry of report.responsive) {
    const label = entry.step ?? entry.path;
    const issues = entry.issues?.join("; ") ?? entry.issue ?? "";
    console.log(`${(entry.ok ?? true) && !issues ? "PASS" : "FLAG"} responsive [${entry.viewport}] ${label} ${issues}`);
  }

  await browser.close();

  const outPath = join(OUT_DIR, "rc108-ui-audit-report.json");
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport written: ${outPath}`);

  const flags = [
    ...report.guestRoutes.filter((r) => !r.ok || r.issues.length),
    ...report.authRoutes.filter((r) => !r.ok || r.issues.length),
    ...report.interactions.filter((r) => !r.ok),
    ...report.responsive.filter((r) => r.ok === false || (r.issues?.length ?? 0) > 0),
  ];
  console.log(`\nTotal flagged items: ${flags.length}`);
}

await main();
