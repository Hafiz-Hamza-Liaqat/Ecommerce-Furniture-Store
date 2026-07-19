/**
 * Sequential page render smoke via fetch + optional note.
 * Full DOM checks are done in the Cursor browser after waiting for pageReady (~300ms).
 */
const paths = [
  "/",
  "/furniture",
  "/furniture/living-room",
  "/furniture/living-room/sofas",
  "/furniture/bedroom/beds",
  "/furniture/office/workstations",
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
];

const web = "http://localhost:5173";
const api = "http://127.0.0.1:8080";

async function login() {
  const body = {
    email: "rc84.smoke@example.com",
    password: "SmokeTest12!A",
  };
  const res = await fetch(`${api}/api/v1/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function query(token, queryType, payload = {}) {
  const res = await fetch(`${api}/api/v1/queries`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ queryType, payload }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, ok: json.ok === true, code: json.error?.code, queryType };
}

async function main() {
  const pageResults = [];
  for (const p of paths) {
    const res = await fetch(`${web}${p}`);
    const html = await res.text();
    pageResults.push({
      path: p,
      ok: res.status === 200 && html.includes('id="root"'),
      status: res.status,
    });
  }

  const auth = await login();
  const token = auth.json?.data?.tokens?.accessToken ?? auth.json?.data?.accessToken;
  // Session cookie style API may use sessionId header — inspect shape
  const tokenShape = auth.json?.data?.tokens
    ? Object.keys(auth.json.data.tokens)
    : Object.keys(auth.json?.data ?? {});

  const session = await fetch(`${api}/api/v1/auth/session`, {
    headers: token
      ? { authorization: `Bearer ${token}` }
      : {
          "x-afh-session-id": auth.json?.data?.tokens?.sessionId ?? "",
          "x-afh-refresh-token": auth.json?.data?.tokens?.refreshToken ?? "",
        },
  }).then(async (r) => ({ status: r.status, body: await r.text() }));

  // Try common auth header patterns used by the web client
  let authedQueries = [];
  if (auth.status === 200) {
    // Read how web client sends auth
  }

  console.log(
    JSON.stringify(
      {
        marketingPages: {
          total: pageResults.length,
          passed: pageResults.filter((p) => p.ok).length,
          failed: pageResults.filter((p) => !p.ok),
        },
        loginStatus: auth.status,
        tokenShape,
        sessionProbe: { status: session.status, sample: session.body.slice(0, 180) },
        health: await (await fetch(`${api}/health/ready`)).json().then((j) => j.status),
      },
      null,
      2,
    ),
  );
}

main();
