/**
 * Generates TEMPORARY RC8.5 demo 360° frames for Meridian Sofa validation.
 *
 * Isolated under packages/web/public/product-media/meridian-sofa/360/row01/
 * Replace with real production photography later — no viewer code changes required.
 *
 * Same product / colour / material / lighting / camera height / background;
 * only yaw (camera angle) changes across 72 frames.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(
  __dirname,
  "..",
  "packages",
  "web",
  "public",
  "product-media",
  "meridian-sofa",
  "360",
  "row01",
);

const FRAME_COUNT = 72;
const BG = "#e6e9e4";
const TEXTILE = "#c4b59a";
const TEXTILE_SHADOW = "#a89578";
const WOOD = "#6b4f35";
const WOOD_DARK = "#4a3524";
const SEAM = "#b09a7e";

function sofaGroup(angleRad) {
  // Horizontal foreshortening simulates turntable yaw; product identity stays fixed.
  const sx = 0.28 + 0.72 * Math.abs(Math.cos(angleRad));
  const skew = Math.sin(angleRad) * 8;
  const face = Math.cos(angleRad) >= 0 ? 1 : -1;
  return `
  <g transform="translate(400 310) scale(${sx.toFixed(4)} 1) skewX(${skew.toFixed(3)}) scale(${face} 1) translate(-400 -310)">
    <!-- legs -->
    <rect x="250" y="360" width="22" height="70" rx="3" fill="${WOOD}"/>
    <rect x="528" y="360" width="22" height="70" rx="3" fill="${WOOD}"/>
    <rect x="250" y="425" width="22" height="8" rx="2" fill="${WOOD_DARK}"/>
    <rect x="528" y="425" width="22" height="8" rx="2" fill="${WOOD_DARK}"/>
    <!-- seat base -->
    <rect x="220" y="300" width="360" height="70" rx="18" fill="${TEXTILE}"/>
    <rect x="230" y="310" width="340" height="18" rx="8" fill="${TEXTILE_SHADOW}" opacity="0.35"/>
    <!-- back cushion -->
    <rect x="230" y="170" width="340" height="140" rx="22" fill="${TEXTILE}"/>
    <path d="M250 200 Q400 230 550 200" stroke="${SEAM}" stroke-width="3" fill="none" opacity="0.55"/>
    <!-- seat cushions -->
    <rect x="235" y="285" width="160" height="55" rx="14" fill="${TEXTILE}"/>
    <rect x="405" y="285" width="160" height="55" rx="14" fill="${TEXTILE}"/>
    <line x1="395" y1="290" x2="395" y2="335" stroke="${SEAM}" stroke-width="2" opacity="0.5"/>
    <!-- arm rests -->
    <rect x="205" y="240" width="40" height="120" rx="16" fill="${TEXTILE_SHADOW}"/>
    <rect x="555" y="240" width="40" height="120" rx="16" fill="${TEXTILE_SHADOW}"/>
  </g>`;
}

function frameSvg(index, total) {
  const angle = (index / total) * Math.PI * 2;
  const label = String(index + 1).padStart(3, "0");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img" aria-label="Meridian Sofa demo spin frame ${label}">
  <title>Meridian Sofa — demo 360 frame ${label}/072 (temporary validation asset)</title>
  <rect width="800" height="600" fill="${BG}"/>
  <ellipse cx="400" cy="455" rx="210" ry="18" fill="#000" opacity="0.08"/>
  ${sofaGroup(angle)}
  <text x="24" y="36" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14" fill="#5a635c">
    AFH demo spin · Meridian Sofa · frame ${label}/072
  </text>
</svg>
`;
}

await mkdir(outDir, { recursive: true });
const paths = [];
for (let i = 0; i < FRAME_COUNT; i += 1) {
  const name = `frame${String(i + 1).padStart(3, "0")}.svg`;
  const file = join(outDir, name);
  await writeFile(file, frameSvg(i, FRAME_COUNT), "utf8");
  paths.push(file);
}
await writeFile(
  join(outDir, "..", "..", "README.md"),
  `# Temporary product-media demo assets (RC8.5)

**NOT production photography.**

- Product: Meridian Sofa (sand textile, wood legs)
- Purpose: validate the 360° image-sequence engine with a full **72-frame** turntable
- Same colour / material / lighting / camera height / background; only yaw changes
- Location: \`360/row01/frame001.svg\` … \`frame072.svg\`

Replace this folder with real captures (\`frame001.jpg\` …) and point catalogue
\`spinSequence\` URLs at them — **no viewer code changes required**.

Regenerate:

\`\`\`bash
node scripts/generate-meridian-spin-demo.mjs
\`\`\`
`,
  "utf8",
);

console.log(`Wrote ${paths.length} frames to ${outDir}`);
