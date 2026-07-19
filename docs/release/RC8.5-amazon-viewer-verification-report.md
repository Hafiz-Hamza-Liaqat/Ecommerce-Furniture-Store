# RC8.5 — Amazon Viewer Verification Report

## Magnifier behavior

| Check | Result |
|---|---|
| Removed CSS `scale()` hover zoom of displayed bitmap | Pass — hover path uses dual-pane hi-res sampling only |
| Cursor / lens tracks pointer | Pass — rectangular lens in stage coordinates |
| Dual-pane shows high-res `zoomUrl` | Pass — Unsplash upgraded to `w=4000&q=85` when needed |
| Left↔left, right↔right, top↔top, bottom↔bottom | Pass — unit tests in `media.test.ts` |
| No clipped navigation at edges | Pass — lens clamped inside object-fit contain display rect |
| Fullscreen | Pass — Esc + focus trap |
| Keyboard | Pass — ← →, F, +/−/0 for pinch path |
| Touch | Pass — swipe gallery; pinch pan retained as separate mobile path |
| Image quality assumption (2000–6000px) | Pass — layout math uses `naturalWidth` / `naturalHeight` |

## Manual spot-check

1. Open `/products/meridian-sofa`
2. Hover gallery stage on desktop — lens + zoom pane appear
3. Move to each edge — pane shows corresponding extreme of the photo
4. Confirm stage image itself is not CSS-scaled during hover

## Unit evidence

`npm test -w @afh/web` — magnifier edge-mapping tests green.
