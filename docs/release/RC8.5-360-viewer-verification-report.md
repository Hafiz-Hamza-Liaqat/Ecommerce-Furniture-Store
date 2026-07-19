# RC8.5 — 360° Viewer Verification Report

## Engine

| Check | Result |
|---|---|
| Image-sequence (not product carousel) | Pass |
| Frame count from data (not hard-coded 72) | Pass — Meridian demo uses **36**; builder tested for 24/36/48/72/96/120 |
| Infinite horizontal loop | Pass — modulo wrap |
| Drag mouse / touch | Pass |
| Auto-spin current product only | Pass — `setInterval` on `frameIndex` of resolved sequence |
| Interaction pauses auto-spin | Pass — `beginDrag` / arrow keys call `pauseInteraction` |
| Resume only when Auto-spin toggled on | Pass |
| Multi-row architecture | Pass — `rows[]` + vertical drag / ↑↓ ready; single row used today |
| Preload / cache adjacent frames | Pass |
| Loading spinner | Pass |
| Fullscreen + Esc | Pass |
| Reduced motion | Pass — auto-spin disabled when preferred |
| Graceful fallback without frames | Pass |

## Demo vs production assets

Meridian uses `buildSpinSequenceFromSources(...)` as an **isolated placeholder**. Replace with:

```text
/product-media/meridian-sofa/360/row01/frame001.jpg … frameNNN.jpg
```

by setting `spinSequence` (or DAM-backed URLs) — **no viewer code changes**.

## Manual spot-check

1. PDP → **360° Viewer**
2. Enable Auto-spin — frames advance; product does not change
3. Drag — auto-spin stops immediately
4. Reset returns to frame 1
