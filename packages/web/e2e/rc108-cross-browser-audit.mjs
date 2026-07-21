/**
 * RC10.8 Phase 5 — Cross-browser compatibility audit harness.
 *
 * Runs the complete guest + authenticated route sweep, interaction checks,
 * platform-capability probes, download/print checks, responsive viewport
 * passes and screenshot capture across six browser profiles:
 *
 *   desktop-chrome   Chromium           1440x900 (+1920x1080 sweep subset)
 *   desktop-edge     Chromium msedge    1440x900
 *   desktop-firefox  Firefox            1440x900
 *   desktop-webkit   WebKit (Safari)    1440x900
 *   mobile-chrome    Pixel 7 profile    (device viewport + landscape check)
 *   mobile-webkit    iPhone 14 profile  (device viewport + landscape check)
 *
 * Records per route: console errors/warnings, pageerrors, failed requests,
 * HTTP >= 400 responses, error boundaries, missing headings, broken images
 * and horizontal overflow — same evidence model as the accepted Phase 1
 * UI audit so results are directly comparable across browsers.
 *
 * ALLOWLIST (documented, justification required):
 *   1. Vite dev-client / HMR websocket messages — dev-server tooling.
 *   2. "Download the React DevTools" — React informational banner.
 *   3. Firefox-only advisory warnings (layout forced / font fallback /
 *      unsupported PerformanceObserver entryTypes) — engine advisories,
 *      not application defects. Counted separately and reported.
 *   4. net::ERR_ABORTED / NS_BINDING_ABORTED on lazy-chunk fetches during
 *      rapid SPA navigation — benign prefetch aborts, counted separately.
 *
 * Prerequisites:
 *   - Runtime host/API at http://127.0.0.1:8080
 *   - Vite web app at http://localhost:5173 (or AFH_E2E_BASE_URL)
 *
 * Usage (from repo root):
 *   node packages/web/e2e/rc108-cross-browser-audit.mjs                  # all profiles
 *   node packages/web/e2e/rc108-cross-browser-audit.mjs --profile=desktop-firefox
 */
import { chromium, firefox, webkit, devices } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.AFH_E2E_BASE_URL ?? "http://localhost:5173";
const EMAIL = process.env.AFH_E2E_EMAIL ?? "admin@afh.local";
const PASSWORD = process.env.AFH_E2E_PASSWORD ?? "Admin123!Admin123!";
const OUT_DIR = join(process.cwd(), "packages", "web", "audit-results", "cross-browser");
const SHOT_DIR = join(OUT_DIR, "screenshots");

const onlyProfile = process.argv
  .find((a) => a.startsWith("--profile="))
  ?.slice("--profile=".length);

/* ------------------------------------------------------------- profiles */

const PROFILES = [
  {
    name: "desktop-chrome",
    engine: chromium,
    launch: {},
    context: { viewport: { width: 1440, height: 900 } },
    kind: "desktop",
    extraViewport: { width: 1920, height: 1080 },
    tabletViewport: { width: 768, height: 1024 },
  },
  {
    name: "desktop-edge",
    engine: chromium,
    launch: { channel: "msedge" },
    context: { viewport: { width: 1440, height: 900 } },
    kind: "desktop",
  },
  {
    name: "desktop-firefox",
    engine: firefox,
    launch: {},
    context: { viewport: { width: 1440, height: 900 } },
    kind: "desktop",
  },
  {
    name: "desktop-webkit",
    engine: webkit,
    launch: {},
    context: { viewport: { width: 1440, height: 900 } },
    kind: "desktop",
  },
  {
    name: "mobile-chrome",
    engine: chromium,
    launch: {},
    context: { ...devices["Pixel 7"] },
    kind: "mobile",
  },
  {
    name: "mobile-webkit",
    engine: webkit,
    launch: {},
    context: { ...devices["iPhone 14"] },
    kind: "mobile",
  },
];

/* --------------------------------------------------------------- routes */

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

/** Representative subset for mobile devices, the 1920x1080 pass and screenshots. */
const KEY_ROUTES = [
  "/", "/furniture/living-room/sofas", "/products/meridian-sofa", "/planner",
  "/consultant", "/blog", "/contact", "/login",
  "/app", "/app/sales/analytics", "/app/manufacturing/ops", "/app/crm/leads",
  "/app/calendar", "/app/reports", "/app/dam", "/app/platform",
];

const SCREENSHOT_ROUTES = [
  "/", "/furniture/living-room/sofas", "/products/meridian-sofa", "/planner",
  "/login", "/app", "/app/sales/analytics", "/app/manufacturing/ops",
];

/* ------------------------------------------------------------ allowlist */

const ALLOWLIST = [
  {
    pattern: /^\[vite\]|^vite.*(connect|hmr)/i,
    reason: "Vite dev-client / HMR tooling message — not application code",
  },
  {
    pattern: /WebSocket connection to 'ws:\/\/(localhost|127\.0\.0\.1):\d+/i,
    reason: "Vite HMR websocket — dev-server tooling, not application code",
  },
  {
    pattern: /Download the React DevTools/i,
    reason: "React informational banner — not a defect",
  },
  {
    pattern: /Layout was forced before the page was fully loaded/i,
    reason: "Firefox engine advisory during rapid automation — not app code",
  },
  {
    pattern: /downloadable font:|font-family.*not found|Glyph.*not found/i,
    reason: "Firefox font pipeline advisory — fallback behavior, verified visually",
  },
  {
    pattern: /Ignoring unsupported entryTypes|entryTypes.*(longtask|not supported)/i,
    reason: "PerformanceObserver longtask unsupported in Firefox/WebKit — feature-detected advisory",
  },
  {
    pattern: /InstallTrigger is deprecated/i,
    reason: "Firefox platform deprecation notice — not application code",
  },
  {
    pattern: /Loading failed for the module with source/i,
    reason: "Firefox counterpart of aborted Vite module fetches during rapid SPA navigation — benign prefetch cancel",
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
    const aborted =
      failure.includes("ERR_ABORTED") ||
      failure.includes("NS_BINDING_ABORTED") ||
      failure.includes("Load request cancelled") ||
      failure.includes("cancelled");
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
    return {
      boundary,
      headings,
      brokenImages,
      overflowPx: overflow
        ? doc.documentElement.scrollWidth - doc.documentElement.clientWidth
        : 0,
    };
  });
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  // Marketing shell delays content behind a 280 ms skeleton transition;
  // wait for the ready class (or workspace/auth shells) before checking DOM.
  await page
    .locator(".site-page-transition.is-ready, .ws-shell, .auth-layout, main.auth-layout")
    .first()
    .waitFor({ state: "attached", timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(350);
  await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
}

async function visit(page, sink, path, { expectAuth = false } = {}) {
  const entry = { path, ok: true, issues: [] };
  try {
    await page.goto(`${BASE}${path}`, { timeout: 45_000 });
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

/* ------------------------------------------------------------- sign in */

async function signIn(page) {
  const authResponses = [];
  const onResponse = async (res) => {
    if (/\/api\/v1\/auth\//.test(res.url())) {
      let body = "";
      try {
        body = (await res.text()).slice(0, 300);
      } catch {}
      authResponses.push({ status: res.status(), url: res.url(), body });
    }
  };
  page.on("response", onResponse);
  try {
    await page.goto(`${BASE}/login`);
    // Wait for the module graph to settle: on slower engines (Firefox/WebKit
    // against the Vite dev server) the login route can remount once more
    // after first paint, which would discard values filled too early.
    await settle(page);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.locator("#email").fill(EMAIL);
      await page.locator("#password").fill(PASSWORD);
      await page.waitForTimeout(150);
      const values = await page.evaluate(() => ({
        email: document.querySelector("#email")?.value ?? "",
        password: document.querySelector("#password")?.value ?? "",
      }));
      if (values.email === EMAIL && values.password === PASSWORD) break;
    }
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
  } catch (err) {
    const bodyText = await page
      .evaluate(() => document.body.innerText.slice(0, 600))
      .catch(() => "(unreadable)");
    throw new Error(
      `sign-in failed: ${String(err.message).slice(0, 120)} | url=${page.url()} | auth=${JSON.stringify(authResponses.slice(-3))} | page="${bodyText.replace(/\s+/g, " ").slice(0, 300)}"`,
    );
  } finally {
    page.off("response", onResponse);
  }
}

/* --------------------------------------------------- capability probing */

async function capabilityProbe(page) {
  await page.goto(`${BASE}/`);
  await settle(page);
  return page.evaluate(async () => {
    const supports = (q) => {
      try {
        return CSS.supports(q);
      } catch {
        return false;
      }
    };
    let fontsLoaded = null;
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((r) => setTimeout(r, 4000)),
      ]);
      fontsLoaded = document.fonts.status === "loaded";
    } catch {
      fontsLoaded = null;
    }
    const loadedFamilies = [...new Set([...document.fonts].map((f) => f.family))];
    return {
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio,
      css: {
        grid: supports("display: grid"),
        flexGap: supports("gap: 1rem"),
        sticky: supports("position: sticky"),
        hasSelector: supports("selector(:has(a))"),
        containerQueries: supports("container-type: inline-size"),
        backdropFilter:
          supports("backdrop-filter: blur(2px)") ||
          supports("-webkit-backdrop-filter: blur(2px)"),
        aspectRatio: supports("aspect-ratio: 1 / 1"),
        dvh: supports("height: 100dvh"),
      },
      api: {
        dialog: typeof HTMLDialogElement !== "undefined",
        clipboard: Boolean(navigator.clipboard),
        clipboardWrite: Boolean(navigator.clipboard?.writeText),
        resizeObserver: typeof ResizeObserver !== "undefined",
        intersectionObserver: typeof IntersectionObserver !== "undefined",
        matchMedia: typeof window.matchMedia === "function",
        localStorage: (() => {
          try {
            localStorage.setItem("__probe", "1");
            localStorage.removeItem("__probe");
            return true;
          } catch {
            return false;
          }
        })(),
        broadcastChannel: typeof BroadcastChannel !== "undefined",
        webSocket: typeof WebSocket !== "undefined",
        urlPattern: typeof URLPattern !== "undefined",
        structuredClone: typeof structuredClone === "function",
      },
      fonts: { loaded: fontsLoaded, families: loadedFamilies.slice(0, 12) },
      svgIcons: document.querySelectorAll("svg").length,
    };
  });
}

/* --------------------------------------------------------- interactions */

async function interactionAudit(page, sink, record, { mobile = false } = {}) {
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

  if (!mobile) {
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

    await step("marketing: furniture mega menu opens", async () => {
      const trigger = page.locator("button.site-nav__mega-trigger", { hasText: "Furniture" });
      await trigger.click();
      const mega = page.locator(".site-mega--furniture");
      await mega.waitFor({ state: "visible", timeout: 5_000 });
      const links = await mega.locator("a").count();
      if (links < 5) throw new Error(`furniture mega only has ${links} links`);
      await page.keyboard.press("Escape");
    });

    await step("marketing: category filter + sort selects respond", async () => {
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

    await step("workspace: command palette opens/closes", async () => {
      await page.goto(`${BASE}/app`);
      await settle(page);
      await page.locator("button.ws-search-trigger").click();
      const palette = page
        .locator("input[placeholder*='earch'], input[placeholder*='ommand'], .ws-palette input")
        .first();
      await palette.waitFor({ state: "visible", timeout: 5_000 });
      await page.keyboard.press("Escape");
    });

    await step("workspace: notification drawer + AI panel open/close", async () => {
      await page.locator("button.ws-notif-btn").click();
      await page.waitForTimeout(400);
      await page.keyboard.press("Escape");
      await page.locator("button[aria-label='Open AI assistant']").click();
      await page.waitForTimeout(400);
      await page.keyboard.press("Escape");
    });

    await step("workspace: sidebar collapse/expand", async () => {
      await page.locator("button.ws-collapse-nav").click();
      await page.waitForTimeout(200);
      const collapsed = await page.locator("aside.ws-sidebar.is-collapsed").count();
      if (!collapsed) throw new Error("sidebar did not collapse");
      await page.locator("button.ws-collapse-nav").click();
    });

    await step("workspace: breadcrumbs navigate on deep route", async () => {
      await page.goto(`${BASE}/app/sales/customers`);
      await settle(page);
      const crumbLinks = page.locator(".ws-breadcrumbs a");
      const n = await crumbLinks.count();
      if (n < 2) throw new Error(`breadcrumb only has ${n} links`);
      await crumbLinks.nth(1).click();
      await page.waitForTimeout(400);
      if (!page.url().includes("/app/sales")) throw new Error("module crumb did not navigate");
    });

    await step("erp: customers table renders + detail drawer + search filter", async () => {
      await page.goto(`${BASE}/app/sales/customers`);
      await settle(page);
      const table = await page.locator("table, [role='table'], .adv-table").count();
      if (!table) throw new Error("no table rendered on customers list");
      const search = page
        .locator("main input[type='search'], main input[placeholder*='earch']")
        .first();
      if (await search.count()) {
        await search.fill("zzz-no-match-audit");
        await page.waitForTimeout(400);
        await search.fill("");
        await page.waitForTimeout(300);
      }
      const row = page.locator("table tbody tr, [role='row']").nth(1);
      if (await row.count()) {
        await row.click();
        await page.waitForTimeout(500);
        await page.keyboard.press("Escape");
      }
    });

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

    await step("cx: planner loads interactive canvas", async () => {
      await page.goto(`${BASE}/planner`);
      await settle(page);
      const buttons = await page.locator("main button").count();
      if (buttons < 3) throw new Error(`planner rendered only ${buttons} buttons`);
    });

    await step("history: back/forward preserve SPA state", async () => {
      await page.goto(`${BASE}/app/crm/leads`);
      await settle(page);
      await page.goto(`${BASE}/app/calendar`);
      await settle(page);
      await page.goBack();
      await page.waitForTimeout(600);
      if (!page.url().includes("/app/crm/leads")) throw new Error("back did not return to leads");
      await page.goForward();
      await page.waitForTimeout(600);
      if (!page.url().includes("/app/calendar")) throw new Error("forward did not return to calendar");
    });

    await step("history: refresh keeps authenticated route", async () => {
      await page.goto(`${BASE}/app/reports`);
      await settle(page);
      await page.reload();
      await settle(page);
      if (page.url().includes("/login")) throw new Error("refresh dropped the session");
    });

    await step("compat: print stylesheet renders body", async () => {
      await page.goto(`${BASE}/products/meridian-sofa`);
      await settle(page);
      await page.emulateMedia({ media: "print" });
      const visible = await page.evaluate(() => {
        const style = getComputedStyle(document.body);
        return style.display !== "none" && document.body.innerText.trim().length > 100;
      });
      await page.emulateMedia({ media: "screen" });
      if (!visible) throw new Error("body not visible under print media");
    });

    await step("compat: CSV export triggers a download (BI report)", async () => {
      // ERP list "Export" is a documented UI stub; the real CSV download
      // lives on the CX analytics BI report surface.
      await page.goto(`${BASE}/app/sales/analytics`);
      await settle(page);
      const exportBtn = page.getByRole("button", { name: /^Export CSV$/i }).first();
      await exportBtn.waitFor({ state: "visible", timeout: 8_000 });
      const downloadPromise = page.waitForEvent("download", { timeout: 10_000 }).catch(() => null);
      await exportBtn.click();
      const download = await downloadPromise;
      if (!download) throw new Error("no download event after Export CSV click");
      const name = download.suggestedFilename();
      if (!/\.csv$/i.test(name)) throw new Error(`unexpected download filename: ${name}`);
    });
  } else {
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
      // The open drawer (z-index 30) covers the backdrop's center point;
      // users tap the visible strip to the right of the drawer.
      const vp = page.viewportSize();
      const backdrop = page.locator("button.ws-nav-backdrop");
      const box = await backdrop.boundingBox();
      await backdrop.click({
        position: { x: (box?.width ?? vp.width) - 12, y: (box?.height ?? vp.height) / 2 },
      });
      await page.waitForTimeout(300);
      const open = await page.locator("aside.ws-sidebar.is-open").count();
      if (open) throw new Error("workspace drawer did not close via backdrop");
    });

    await step("mobile: search overlay usable via drawer", async () => {
      await page.goto(`${BASE}/`);
      await settle(page);
      // At mobile widths the Search button lives inside the nav drawer.
      await page.locator("button.site-nav-toggle").click();
      await page.locator(".site-nav-drawer.is-open").waitFor({ state: "visible", timeout: 5_000 });
      await page.locator("button.site-nav__icon-btn[aria-label='Search']").first().click();
      const input = page.locator("#site-search-q");
      await input.waitFor({ state: "visible", timeout: 5_000 });
      await input.fill("sofa");
      await page.waitForTimeout(400);
      const results = await page.locator(".site-search__results a").count();
      if (results === 0) throw new Error("search returned no results for 'sofa'");
      await page.keyboard.press("Escape");
    });

    await step("mobile: touch targets meet WCAG 2.5.8 (>= 24px)", async () => {
      await page.goto(`${BASE}/`);
      await settle(page);
      const targets = await page.evaluate(() => {
        const els = [
          ...document.querySelectorAll(
            "header button, header a, .site-nav__icon-btn, .site-nav-toggle",
          ),
        ];
        return els
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30),
              w: Math.round(r.width),
              h: Math.round(r.height),
              visible: r.width > 0 && r.height > 0,
            };
          })
          .filter((t) => t.visible);
      });
      const failing = targets.filter((t) => t.w < 24 || t.h < 24);
      const advisories = targets.filter((t) => (t.w < 44 || t.h < 44) && t.w >= 24 && t.h >= 24);
      if (advisories.length)
        console.log(
          `  advisory: targets between 24-44px: ${JSON.stringify(advisories.slice(0, 5))}`,
        );
      if (failing.length > 0)
        throw new Error(`touch targets under 24px: ${JSON.stringify(failing.slice(0, 5))}`);
    });
  }
}

/* ------------------------------------------------------------ screenshots */

async function captureScreenshots(page, profileName) {
  const dir = join(SHOT_DIR, profileName);
  await mkdir(dir, { recursive: true });
  for (const path of SCREENSHOT_ROUTES) {
    try {
      await page.goto(`${BASE}${path}`, { timeout: 30_000, waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      const slug = path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "_");
      await page.screenshot({
        path: join(dir, `${slug}.png`),
        fullPage: false,
        timeout: 15_000,
      });
    } catch (err) {
      console.warn(`screenshot failed ${profileName} ${path}: ${String(err.message).slice(0, 120)}`);
    }
  }
}

/* -------------------------------------------------------------- profile run */

async function runProfile(profile) {
  const started = Date.now();
  console.log(`\n===== ${profile.name} =====`);
  const browser = await profile.engine.launch({ headless: true, ...profile.launch });
  try {
    return await runProfileInner(profile, browser, started);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function runProfileInner(profile, browser, started) {
  const result = {
    profile: profile.name,
    kind: profile.kind,
    guestRoutes: [],
    authRoutes: [],
    interactions: [],
    extraViewportRoutes: [],
    landscapeRoutes: [],
    tabletRoutes: [],
    capabilities: null,
    startedAt: new Date(started).toISOString(),
  };

  /* guest sweep */
  const guestCtx = await browser.newContext(profile.context);
  const guestPage = await guestCtx.newPage();
  const guestSink = newSink();
  instrument(guestPage, guestSink);
  await guestPage.goto(`${BASE}/`);
  await guestPage.evaluate(() => localStorage.setItem("afh.site.cookies", "1"));
  drainSink(guestSink);

  result.capabilities = await capabilityProbe(guestPage);
  drainSink(guestSink);

  const guestList = profile.kind === "mobile" ? KEY_ROUTES.filter((r) => !r.startsWith("/app")) : GUEST_ROUTES;
  for (const path of guestList) {
    const entry = await visit(guestPage, guestSink, path);
    result.guestRoutes.push(entry);
    console.log(
      `${entry.ok && entry.issues.length === 0 ? "PASS" : "FLAG"} [${profile.name}] guest ${path} ${entry.issues.join("; ")}`,
    );
  }
  await guestCtx.close();

  /* authenticated sweep */
  const authCtx = await browser.newContext(profile.context);
  const authPage = await authCtx.newPage();
  const authSink = newSink();
  instrument(authPage, authSink);
  await signIn(authPage);
  await authPage.evaluate(() => localStorage.setItem("afh.site.cookies", "1"));
  drainSink(authSink);

  const authList = profile.kind === "mobile" ? KEY_ROUTES.filter((r) => r.startsWith("/app")) : AUTH_ROUTES;
  for (const path of authList) {
    const entry = await visit(authPage, authSink, path, { expectAuth: true });
    result.authRoutes.push(entry);
    console.log(
      `${entry.ok && entry.issues.length === 0 ? "PASS" : "FLAG"} [${profile.name}] auth ${path} ${entry.issues.join("; ")}`,
    );
    await authPage.waitForTimeout(100);
  }

  /* interactions */
  await interactionAudit(authPage, authSink, result.interactions, {
    mobile: profile.kind === "mobile",
  });
  for (const step of result.interactions) {
    console.log(
      `${step.ok ? "PASS" : "FLAG"} [${profile.name}] interaction ${step.step} ${step.issues?.join("; ") ?? ""}`,
    );
  }

  /* screenshots for visual comparison */
  await captureScreenshots(authPage, profile.name);
  drainSink(authSink);

  /* extra desktop viewport (1920x1080) on desktop-chrome; landscape on mobiles */
  if (profile.extraViewport) {
    await authPage.setViewportSize(profile.extraViewport);
    for (const path of KEY_ROUTES) {
      const entry = await visit(authPage, authSink, path, {
        expectAuth: path.startsWith("/app"),
      });
      entry.viewport = `${profile.extraViewport.width}x${profile.extraViewport.height}`;
      result.extraViewportRoutes.push(entry);
      console.log(
        `${entry.ok && entry.issues.length === 0 ? "PASS" : "FLAG"} [${profile.name}] ${entry.viewport} ${path} ${entry.issues.join("; ")}`,
      );
    }
  }
  if (profile.tabletViewport) {
    await authPage.setViewportSize(profile.tabletViewport);
    for (const path of KEY_ROUTES) {
      const entry = await visit(authPage, authSink, path, {
        expectAuth: path.startsWith("/app"),
      });
      entry.viewport = `tablet ${profile.tabletViewport.width}x${profile.tabletViewport.height}`;
      result.tabletRoutes.push(entry);
      console.log(
        `${entry.ok && entry.issues.length === 0 ? "PASS" : "FLAG"} [${profile.name}] ${entry.viewport} ${path} ${entry.issues.join("; ")}`,
      );
    }
  }
  if (profile.kind === "mobile") {
    const vp = profile.context.viewport;
    await authPage.setViewportSize({ width: vp.height, height: vp.width });
    for (const path of ["/", "/products/meridian-sofa", "/app", "/app/sales/analytics"]) {
      const entry = await visit(authPage, authSink, path, {
        expectAuth: path.startsWith("/app"),
      });
      entry.viewport = `landscape ${vp.height}x${vp.width}`;
      result.landscapeRoutes.push(entry);
      console.log(
        `${entry.ok && entry.issues.length === 0 ? "PASS" : "FLAG"} [${profile.name}] landscape ${path} ${entry.issues.join("; ")}`,
      );
    }
  }

  await authCtx.close();
  result.durationMs = Date.now() - started;
  return result;
}

/* ----------------------------------------------------------------- main */

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const profiles = onlyProfile ? PROFILES.filter((p) => p.name === onlyProfile) : PROFILES;
  if (profiles.length === 0) {
    console.error(`Unknown profile '${onlyProfile}'. Known: ${PROFILES.map((p) => p.name).join(", ")}`);
    process.exit(1);
  }

  const report = {
    generated: new Date().toISOString(),
    base: BASE,
    allowlist: ALLOWLIST.map((a) => ({ pattern: String(a.pattern), reason: a.reason })),
    profiles: [],
  };

  for (const profile of profiles) {
    try {
      report.profiles.push(await runProfile(profile));
    } catch (err) {
      console.error(`PROFILE FAILURE ${profile.name}: ${String(err?.message ?? err)}`);
      report.profiles.push({ profile: profile.name, fatal: String(err?.message ?? err) });
    }
  }

  const suffix = onlyProfile ? `-${onlyProfile}` : "";
  const outPath = join(OUT_DIR, `rc108-cross-browser-report${suffix}.json`);
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport written: ${outPath}`);

  let flagged = 0;
  for (const p of report.profiles) {
    if (p.fatal) {
      flagged += 1;
      continue;
    }
    const all = [
      ...(p.guestRoutes ?? []),
      ...(p.authRoutes ?? []),
      ...(p.extraViewportRoutes ?? []),
      ...(p.tabletRoutes ?? []),
      ...(p.landscapeRoutes ?? []),
    ];
    const routeFlags = all.filter((r) => !r.ok || r.issues.length > 0).length;
    const interactionFlags = (p.interactions ?? []).filter((s) => !s.ok).length;
    flagged += routeFlags + interactionFlags;
    console.log(
      `${p.profile}: ${all.length} routes (${routeFlags} flagged), ${(p.interactions ?? []).length} interactions (${interactionFlags} flagged), ${Math.round((p.durationMs ?? 0) / 1000)}s`,
    );
  }
  console.log(`Total flagged items: ${flagged}`);
}

await main();
