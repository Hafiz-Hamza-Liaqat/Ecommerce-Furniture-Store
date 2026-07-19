/**
 * Lighthouse audit for customer surfaces.
 *
 * Usage (servers must be running):
 *   node scripts/lighthouse-audit.mjs
 *
 * Env:
 *   AFH_LIGHTHOUSE_BASE_URL  default http://localhost:5173
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "docs", "release", "lighthouse");
const base = process.env.AFH_LIGHTHOUSE_BASE_URL ?? "http://localhost:5173";

const pages = [
  { id: "home", path: "/", seoRequired: true },
  { id: "category", path: "/furniture/living-room/sofas", seoRequired: true },
  { id: "product", path: "/products/meridian-sofa", seoRequired: true },
  // Auth surfaces are Disallow'd in robots.txt on purpose — SEO gate N/A.
  { id: "login", path: "/login", seoRequired: false },
];

const targets = {
  performance: 90,
  accessibility: 95,
  "best-practices": 95,
  seo: 95,
};

async function runLighthouse(url, outputPath) {
  const args = [
    "--yes",
    "lighthouse",
    url,
    "--quiet",
    "--chrome-flags=--headless --no-sandbox --disable-gpu",
    "--only-categories=performance,accessibility,best-practices,seo",
    "--output=json",
    `--output-path=${outputPath}`,
  ];
  const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  try {
    await execFileAsync(cmd, args, {
      cwd: root,
      // Required on Windows Node 24 to avoid spawn EINVAL for .cmd shims.
      shell: true,
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (err) {
    // chrome-launcher on Windows often EPERM-cleans temp dirs after a successful run.
    const { access } = await import("node:fs/promises");
    try {
      await access(outputPath);
      return;
    } catch {
      throw err;
    }
  }
}

function scoreOf(categories, key) {
  const cat = categories?.[key];
  if (!cat || typeof cat.score !== "number") return null;
  return Math.round(cat.score * 100);
}

await mkdir(outDir, { recursive: true });

const summary = [];

for (const page of pages) {
  const url = `${base}${page.path}`;
  const jsonPath = join(outDir, `${page.id}.json`);
  console.log(`Auditing ${page.id}: ${url}`);
  await runLighthouse(url, jsonPath);
  const report = JSON.parse(await readFile(jsonPath, "utf8"));
  const cats = report.categories ?? {};
  const row = {
    id: page.id,
    url,
    performance: scoreOf(cats, "performance"),
    accessibility: scoreOf(cats, "accessibility"),
    bestPractices: scoreOf(cats, "best-practices"),
    seo: scoreOf(cats, "seo"),
  };
  summary.push(row);
  console.log(
    `  P=${row.performance} A=${row.accessibility} BP=${row.bestPractices} SEO=${row.seo}`,
  );
}

const lines = [
  "# Lighthouse audit results",
  "",
  `- Base URL: ${base}`,
  `- Generated: ${new Date().toISOString()}`,
  "",
  "| Page | Performance | Accessibility | Best Practices | SEO |",
  "|---|---:|---:|---:|---:|",
  ...summary.map(
    (r) =>
      `| ${r.id} | ${r.performance ?? "—"} | ${r.accessibility ?? "—"} | ${r.bestPractices ?? "—"} | ${r.seo ?? "—"} |`,
  ),
  "",
  "## Targets",
  "",
  `- Performance ≥ ${targets.performance}`,
  `- Accessibility ≥ ${targets.accessibility}`,
  `- Best Practices ≥ ${targets["best-practices"]}`,
  `- SEO ≥ ${targets.seo}`,
  "",
  "## Gate",
  "",
];

let failed = false;
for (const r of summary) {
  const pageDef = pages.find((p) => p.id === r.id);
  const checks = [
    ["performance", r.performance, targets.performance],
    ["accessibility", r.accessibility, targets.accessibility],
    ["best-practices", r.bestPractices, targets["best-practices"]],
  ];
  if (pageDef?.seoRequired !== false) {
    checks.push(["seo", r.seo, targets.seo]);
  } else {
    lines.push(
      `- SKIP ${r.id} seo: ${r.seo ?? "n/a"} (robots Disallow — intentional for auth)`,
    );
  }
  for (const [name, value, target] of checks) {
    if (value === null || value < target) {
      failed = true;
      lines.push(`- FAIL ${r.id} ${name}: ${value ?? "n/a"} (need ≥ ${target})`);
    } else {
      lines.push(`- PASS ${r.id} ${name}: ${value}`);
    }
  }
}

const mdPath = join(outDir, "SUMMARY.md");
await writeFile(mdPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${mdPath}`);
if (failed) {
  console.error("Lighthouse targets not fully met — see SUMMARY.md");
  process.exitCode = 1;
} else {
  console.log("All Lighthouse targets met.");
}
