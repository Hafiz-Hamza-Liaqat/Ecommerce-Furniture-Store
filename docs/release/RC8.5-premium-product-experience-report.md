# RC8.5 — Premium Product Experience Report

- **Date:** 2026-07-19
- **Scope:** Customer product media only (gallery magnifier + 360° sequence engine)
- **Commit:** none (awaiting review)

## Objective

Upgrade the PDP media experience to premium retail quality (Amazon / IKEA / Herman Miller class interaction) without redesigning architecture, CQRS, Policy, Workflow, Approval, Authentication, or backend domains.

## Implementation rules (honored)

- Upgraded existing `ProductGallery` and `ProductSpinViewer` in place
- Existing `/products/:productId` routing and catalogue pages preserved
- Demo assets isolated; production URLs replace data only
- No backend / CQRS / Policy changes

## What shipped

| Area | Change |
|---|---|
| Amazon magnifier | True hi-res dual-pane magnifier via `computeMagnifierLayout` — **no CSS `scale()` zoom path** for hover inspection |
| 360° engine | Configurable multi-row image-sequence engine (`useImageSequenceEngine`) |
| Auto-spin | Advances frames of the **current product sequence only**; pauses on interaction |
| Media architecture | `ProductMediaCollection` resolver + `spinSequence` / `models` extension points |
| Future 3D | GLB / GLTF / USDZ detected via `data-future-*` attributes; no renderer |
| Tests | +11 media unit tests (87 total web tests) |

## Definition of Done

| Criterion | Status |
|---|---|
| Magnifier inspects every area without clipping | ✓ |
| Magnifier follows cursor 1:1 (edge↔edge) | ✓ |
| High-resolution source used (`zoomUrl` / Unsplash w=4000) | ✓ |
| Gallery desktop / tablet / mobile | ✓ |
| 360 driven by configurable sequences | ✓ |
| Frame count configurable (24…216+) | ✓ |
| Infinite loop | ✓ |
| Auto-spin = current product frames only | ✓ |
| Interaction pauses auto-spin | ✓ |
| Multi-row architecture ready | ✓ |
| GLB/USDZ extension points | ✓ |
| No backend architecture changes | ✓ |
| Existing product pages continue | ✓ |
| Build / typecheck / lint / tests / runtime verify | ✓ |

## Key files

- `packages/web/src/marketing/media/*`
- `packages/web/src/marketing/components/ProductGallery.tsx`
- `packages/web/src/marketing/components/ProductSpinViewer.tsx`
- `packages/web/src/marketing/pages/ProductsPage.tsx`
- `packages/web/src/marketing/data/catalogue.ts`
- `packages/web/src/styles/marketing.css`

## Stop rule

Implementation, testing, verification, and documentation complete. **Do not commit** until manual review approval.
