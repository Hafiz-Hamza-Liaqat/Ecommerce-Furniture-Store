/**
 * Build 72 photographic spin frames from the Meridian Sofa product image
 * with the original room background removed (cutout on a clean studio backdrop).
 */
import { mkdir, writeFile, unlink, readdir, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { removeBackground } from "@imgly/background-removal-node";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(
  root,
  "packages",
  "web",
  "public",
  "product-media",
  "meridian-sofa",
  "360",
  "row01",
);
const cacheDir = join(
  root,
  "packages",
  "web",
  "public",
  "product-media",
  "meridian-sofa",
  "_source",
);
const SOURCE_URL =
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=2000&q=90";
const FRAME_COUNT = 72;

async function downloadSource(dest) {
  const res = await fetch(SOURCE_URL);
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function blobToBuffer(blob) {
  return blob.arrayBuffer().then((ab) => Buffer.from(ab));
}

function viewerHtml(dataUrl) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body {
    margin: 0; width: 900px; height: 680px; overflow: hidden;
    background: #eceee9;
    font-family: system-ui, sans-serif;
  }
  .stage {
    position: relative;
    width: 900px; height: 680px;
    display: grid; place-items: center;
    background:
      radial-gradient(ellipse 62% 22% at 50% 76%, rgba(0,0,0,0.10), transparent 72%),
      linear-gradient(180deg, #f7f8f5 0%, #eceee9 55%, #e4e7e1 100%);
  }
  .turn {
    width: 760px; height: 520px;
    display: grid; place-items: center;
  }
  .product {
    width: 700px; height: 460px;
    object-fit: contain;
    filter: drop-shadow(0 26px 22px rgba(20, 32, 26, 0.20));
    transform-origin: 50% 70%;
    will-change: transform;
  }
  .badge {
    position: absolute; left: 20px; top: 16px;
    font-size: 13px; color: #5a635c; opacity: 0.85;
  }
</style>
</head>
<body>
  <div class="stage" id="stage">
    <div class="badge" id="badge">Meridian Sofa · cutout spin demo</div>
    <div class="turn">
      <img class="product" id="product" src="${dataUrl}" alt="Meridian Sofa" />
    </div>
  </div>
  <script>
    window.__setAngle = (deg) => {
      const el = document.getElementById('product');
      const badge = document.getElementById('badge');
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sx = Math.max(0.42, Math.abs(cos));
      const flip = cos < 0 ? -1 : 1;
      const skew = Math.sin(rad) * 6;
      el.style.transform = 'skewX(' + skew.toFixed(3) + 'deg) scaleX(' + (flip * sx).toFixed(4) + ')';
      badge.textContent = 'Meridian Sofa · bg removed · yaw ' + Math.round(deg) + '°';
    };
  </script>
</body>
</html>`;
}

await mkdir(outDir, { recursive: true });
await mkdir(cacheDir, { recursive: true });

const sourcePath = join(cacheDir, "meridian-sofa-source.jpg");
const cutoutPath = join(cacheDir, "meridian-sofa-cutout.png");

console.log("Downloading Meridian Sofa product photo…");
await downloadSource(sourcePath);

console.log("Removing product background (this can take a minute)…");
const sourceBytes = await readFile(sourcePath);
const cutoutBlob = await removeBackground(new Blob([sourceBytes], { type: "image/jpeg" }), {
  output: { format: "image/png", quality: 0.92 },
});
const cutoutBuf = await blobToBuffer(cutoutBlob);
await writeFile(cutoutPath, cutoutBuf);
console.log(`Cutout saved → ${cutoutPath}`);

const dataUrl = `data:image/png;base64,${cutoutBuf.toString("base64")}`;

for (const name of await readdir(outDir)) {
  if (/^frame\d+\.(svg|jpg|jpeg|png|webp)$/i.test(name)) {
    await unlink(join(outDir, name)).catch(() => {});
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 900, height: 680 },
  deviceScaleFactor: 1,
});

await page.setContent(viewerHtml(dataUrl), { waitUntil: "load" });
await page.waitForFunction(() => {
  const img = document.getElementById("product");
  return Boolean(img && img.complete && img.naturalWidth > 0);
});

console.log(`Rendering ${FRAME_COUNT} cutout frames…`);
for (let i = 0; i < FRAME_COUNT; i += 1) {
  const deg = (i / FRAME_COUNT) * 360;
  await page.evaluate((d) => window.__setAngle(d), deg);
  await page.waitForTimeout(20);
  const name = `frame${String(i + 1).padStart(3, "0")}.jpg`;
  await page.locator("#stage").screenshot({
    path: join(outDir, name),
    type: "jpeg",
    quality: 92,
  });
  if ((i + 1) % 12 === 0) console.log(`  ${i + 1}/${FRAME_COUNT}`);
}

await browser.close();

await writeFile(
  join(outDir, "..", "..", "README.md"),
  `# Meridian Sofa — temporary 360° demo assets

- Source photo with **background removed** (product cutout)
- Composited on a clean studio gradient (no room / wall / floor from the original)
- 72 JPG frames — same product every angle
- Files: \`360/row01/frame001.jpg\` … \`frame072.jpg\`

\`\`\`bash
node scripts/generate-meridian-spin-photo.mjs
\`\`\`
`,
  "utf8",
);

console.log(`Done → ${outDir}`);
