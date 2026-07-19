# RC8.5 — Final Polish Report (Pre-Commit)

- **Date:** 2026-07-19
- **Scope:** Product Viewer polish only
- **Commit:** none (awaiting review)

## Changes

### 1. Amazon-style floating magnifier

- Zoom preview is now a **`position: fixed`** panel to the **right** of the main image.
- High `z-index` (90) so it overlays product details without permanently resizing the PDP grid.
- Hides immediately on pointer leave.
- Still uses true hi-res sampling (`computeMagnifierLayout` + `zoomUrl`) — **no CSS `scale()` hover path**.
- Fullscreen reuses the same stage/lens/floating-pane magnifier behavior.

### 2. Realistic 72-frame 360 demo assets

- Generated under `packages/web/public/product-media/meridian-sofa/360/row01/frame001.svg` … `frame072.svg`.
- Same product identity (sand Meridian Sofa, wood legs, fixed lighting/background); only yaw changes.
- Clearly temporary — see folder README + `scripts/generate-meridian-spin-demo.mjs`.
- Catalogue wires `meridianSofaDemoSpinSequence()` (72 frames). Replace URLs later without viewer changes.

### 3. Validation

- Frames HTTP 200 via Vite (`frame001`, `frame072`)
- Typecheck / lint / unit tests (87) / production build — pass

## Reports in this polish

| Doc |
|---|
| `docs/release/RC8.5-final-polish-report.md` (this file) |
| `docs/release/Amazon-Magnifier-Validation.md` |
| `docs/release/360-Viewer-Validation.md` |
| `docs/release/RC8.5-final-test-summary.md` |

## Stop rule

Polish complete. **Do not commit** until manual review approval.
