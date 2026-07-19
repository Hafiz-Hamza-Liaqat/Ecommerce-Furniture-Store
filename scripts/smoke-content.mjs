/**
 * Browser-less content smoke: fetch SPA shell then use Playwright-less
 * approach via puppeteer-free fetch of Vite HTML is insufficient.
 * This script uses the experimental undici + jsdom is heavy.
 *
 * Instead: HTTP shell + API query probe after login.
 */
const api = "http://127.0.0.1:8080";
const web = "http://localhost:5173";

const pages = [
  "/",
  "/furniture",
  "/furniture/living-room",
  "/furniture/living-room/sofas",
  "/products",
  "/products/meridian-sofa",
  "/compare",
  "/wishlist",
  "/planner",
  "/consultant",
  "/downloads",
  "/projects",
  "/about",
  "/manufacturing",
  "/contact",
  "/quote",
  "/login",
  "/register",
];

async function main() {
  const email = `rc84.browser.${Date.now()}@example.com`;
  const password = "SmokeTest12!A";
  const reg = await fetch(`${api}/api/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, fullName: "Smoke Browser" }),
  });
  const regBody = await reg.json();
  console.log("register", reg.status, regBody.ok);

  // Activate via sqlite helper already run separately; for new users we note status.
  const pageResults = [];
  for (const p of pages) {
    const res = await fetch(`${web}${p}`);
    const html = await res.text();
    pageResults.push({
      path: p,
      status: res.status,
      hasRoot: html.includes('id="root"'),
      hasMainScript: /src=\"\/src\/main\.tsx\"/.test(html) || html.includes("/src/main"),
    });
  }

  // Auth pages render
  const loginHtml = await (await fetch(`${web}/login`)).text();

  // API health + openapi
  const openapi = await fetch(`${api}/api/v1/openapi.json`).then(async (r) => ({
    status: r.status,
    ok: r.ok,
  }));

  // Query probe without auth should fail closed
  const unauthQuery = await fetch(`${api}/api/v1/queries`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ queryType: "crm.ListLead", payload: {} }),
  }).then(async (r) => ({ status: r.status, body: await r.text() }));

  console.log(
    JSON.stringify(
      {
        pages: pageResults,
        pagesOk: pageResults.every((p) => p.status === 200 && p.hasRoot),
        loginShellOk: loginHtml.includes('id="root"'),
        openapi,
        unauthQueryStatus: unauthQuery.status,
        registerStatus: reg.status,
        registerUserStatus: regBody?.data?.user?.status,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
