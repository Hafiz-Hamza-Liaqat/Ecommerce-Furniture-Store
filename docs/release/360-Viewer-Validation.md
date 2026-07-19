# 360° Viewer Validation (RC8.5 Final Polish)

## Demo asset set (temporary)

| Property | Value |
|---|---|
| Product | Meridian Sofa only |
| Colour / material | Sand textile + wood legs (constant) |
| Lighting / background | Constant studio wash `#e6e9e4` |
| Camera | Fixed height; **yaw only** across frames |
| Frame count | **72** (`frame001.svg` … `frame072.svg`) |
| Path | `/product-media/meridian-sofa/360/row01/` |
| Generator | `node scripts/generate-meridian-spin-demo.mjs` |
| Isolation | README in `public/product-media/meridian-sofa/` |

These SVGs simulate a professional rotational capture for engine validation. Replace with real JPG/PNG captures later — point `spinSequence` URLs at new files; **no viewer code changes**.

## Behavior checklist

| Check | Status |
|---|---|
| Drag left/right rotates smoothly | Pass (pixel accumulator + wrap) |
| No skipped frames (72 unique URLs) | Pass — catalogue + unit assert `frame001`…`frame072` |
| Infinite looping | Pass — modulo wrap |
| Auto-spin = current product frames only | Pass — does not touch gallery index |
| Auto-spin never switches gallery images | Pass — separate tab / component |
| Interaction pauses auto-spin immediately | Pass — `beginDrag` / arrows |
| Reset → frame 1 | Pass |
| Fullscreen + Esc | Pass |
| Loading indicator | Pass — spinner until first row ready |
| Adjacent frame preloading | Pass — ±3 around current index |
| Responsive | Pass — touch drag; meta counter |
| HTTP asset availability | Pass — Vite `frame001`/`frame072` → 200 |

## Manual check

1. PDP → **360° Viewer**
2. Confirm frame meta shows `1/72` … advances on drag
3. Enable Auto-spin — only the sofa yaw changes; stay on Meridian
4. Drag — auto-spin stops at once
5. Reset — returns to frame 1
