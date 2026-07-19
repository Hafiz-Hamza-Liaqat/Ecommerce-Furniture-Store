/**
 * Smoke-check marketing + auth HTML routes against Vite (SPA must 200).
 * Also probes API health through the Vite proxy.
 */
const base = process.env.SMOKE_BASE ?? "http://localhost:5173";
const api = process.env.SMOKE_API ?? "http://127.0.0.1:8080";

const marketing = [
  "/",
  "/furniture",
  "/furniture/living-room",
  "/furniture/living-room/sofas",
  "/furniture/bedroom",
  "/furniture/dining",
  "/furniture/office",
  "/products",
  "/products/meridian-sofa",
  "/products/cascade-table",
  "/compare",
  "/wishlist",
  "/planner",
  "/consultant",
  "/downloads",
  "/cookies",
  "/projects",
  "/about",
  "/story",
  "/leadership",
  "/manufacturing",
  "/factory",
  "/technology",
  "/sustainability",
  "/quality",
  "/certifications",
  "/careers",
  "/partners",
  "/distributors",
  "/news",
  "/blog",
  "/events",
  "/faq",
  "/privacy",
  "/terms",
  "/contact",
  "/quote",
  "/demo",
  "/login",
  "/register",
  "/password-reset",
  "/this-page-should-404-route",
];

const app = [
  "/app",
  "/app/me",
  "/app/sales",
  "/app/procurement",
  "/app/inventory",
  "/app/finance",
  "/app/projects",
  "/app/crm",
  "/app/service",
  "/app/hr",
  "/app/manufacturing",
  "/app/cms",
  "/app/dam",
  "/app/notifications",
  "/app/search",
  "/app/reporting",
  "/app/workflow",
  "/app/approvals",
  "/app/preferences",
  "/app/analytics",
  "/app/reports",
  "/app/platform",
  "/app/platform/jobs",
  "/app/platform/monitoring",
  "/app/platform/audit",
  "/app/account/security",
];

async function check(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: "manual" });
    const text = await res.text();
    const hasRoot = text.includes('id="root"') || text.includes("id='root'");
    const hasVite = text.includes("/@vite") || text.includes("vite");
    return {
      url,
      status: res.status,
      ms: Date.now() - started,
      ok: res.status >= 200 && res.status < 400 && hasRoot,
      hasRoot,
      hasVite,
    };
  } catch (e) {
    return { url, status: 0, ms: Date.now() - started, ok: false, error: String(e) };
  }
}

async function main() {
  const healthLive = await fetch(`${api}/health/live`).then((r) => r.json());
  const healthReady = await fetch(`${api}/health/ready`).then((r) => r.json());
  const proxyLive = await fetch(`${base}/health/live`)
    .then(async (r) => ({ status: r.status, body: await r.text() }))
    .catch((e) => ({ status: 0, body: String(e) }));

  const results = [];
  for (const path of [...marketing, ...app]) {
    results.push(await check(`${base}${path}`));
  }

  const failed = results.filter((r) => !r.ok);
  const summary = {
    healthLive,
    healthReadyStatus: healthReady.status,
    readyChecksUp: (healthReady.checks ?? []).filter((c) => c.status === "up").length,
    readyChecksTotal: (healthReady.checks ?? []).length,
    proxyLive,
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: failed.length,
    failures: failed,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (failed.length) process.exitCode = 1;
}

main();
