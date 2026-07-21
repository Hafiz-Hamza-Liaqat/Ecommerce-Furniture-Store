/**
 * Authenticated Lighthouse audit for the production-preview app shell.
 *
 * Prerequisites:
 * - Vite preview at http://127.0.0.1:4173 with /api proxy enabled
 * - Runtime host at http://127.0.0.1:8080
 */
import { execFile, spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const base = process.env.AFH_LIGHTHOUSE_AUTH_BASE_URL ?? "http://127.0.0.1:4173";
const email = process.env.AFH_E2E_EMAIL ?? "admin@afh.local";
const password = process.env.AFH_E2E_PASSWORD ?? "Admin123!Admin123!";
const port = Number(process.env.AFH_LIGHTHOUSE_DEBUG_PORT ?? "9223");
const outDir = join(process.cwd(), "docs", "release", "lighthouse");
const userDataDir = await mkdtemp(join(tmpdir(), "afh-lighthouse-"));

const chrome = spawn(
  chromium.executablePath(),
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function waitForChrome() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for Chrome debug endpoint");
}

async function runLighthouse(id, path) {
  const outputPath = join(outDir, `${id}.json`);
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  await execFileAsync(
    command,
    [
      "--yes",
      "lighthouse",
      `${base}${path}`,
      "--quiet",
      `--port=${port}`,
      "--only-categories=performance,accessibility,best-practices",
      "--output=json",
      `--output-path=${outputPath}`,
    ],
    {
      shell: process.platform === "win32",
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  const report = JSON.parse(await readFile(outputPath, "utf8"));
  const score = (key) => Math.round((report.categories?.[key]?.score ?? 0) * 100);
  return {
    id,
    path,
    performance: score("performance"),
    accessibility: score("accessibility"),
    bestPractices: score("best-practices"),
  };
}

try {
  await waitForChrome();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`${base}/login`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
  });

  const results = [];
  results.push(await runLighthouse("app-shell", "/app"));
  results.push(await runLighthouse("workspace-bi", "/app/sales/analytics"));

  const lines = [
    "# Authenticated Lighthouse audit",
    "",
    `- Base URL: ${base}`,
    `- Generated: ${new Date().toISOString()}`,
    "",
    "| Surface | Path | Performance | Accessibility | Best Practices |",
    "|---|---|---:|---:|---:|",
    ...results.map(
      (r) =>
        `| ${r.id} | \`${r.path}\` | ${r.performance} | ${r.accessibility} | ${r.bestPractices} |`,
    ),
    "",
  ];
  await writeFile(join(outDir, "AUTH-SUMMARY.md"), `${lines.join("\n")}\n`, "utf8");
  for (const result of results) {
    console.log(
      `${result.id}: P=${result.performance} A=${result.accessibility} BP=${result.bestPractices}`,
    );
  }
  await browser.close();
} finally {
  chrome.kill();
  await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
}
