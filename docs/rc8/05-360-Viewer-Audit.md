# 05 — 360° Viewer Audit

- **Audit ID:** RC8.0-CX-05
- **Clarification:** “360°” means interactive product spin / 3D — **not** merely a complete written audit.

## 1. Intended platform capabilities

| Capability | Target | Status |
|---|---|---|
| 360 image sequences | Spin frames (N images) | **M** |
| 3D models | glTF/GLB in viewer | **M** |
| Interactive rotation | Mouse drag | **M** |
| Touch drag | Mobile spin | **M** |
| Fullscreen | Viewer chrome | **M** |
| Zoom within viewer | **M** | |
| Hotspots | Material/feature callouts | **P** (booklet only) |
| Material / finish preview | Live map to textures | **P** (booklet selectors; no visual remap) |
| Room preview | Future | **M** (deferred) |
| AR readiness | Future | **M** (deferred) |

## 2. What currently exists

| Surface | Claim | Reality |
|---|---|---|
| Booklet panel | “Film · 360° material study” | **Label only** — no sequence, video, or viewer |
| Booklet hotspots | Frame / Textile | Local spotlight text + selector state |
| Booklet drag | Page turn | Horizontal page change, **not** product orbit |
| PDP | — | No 360 entry point |
| DAM | Object store for assets | Can store spin frames/models later; **no viewer** |
| Enterprise AI / modules | — | No product spin tooling |

## 3. Gap record

| Field | Value |
|---|---|
| **Current status** | Missing entirely as product experience; misleading “360°” copy in booklet |
| **Why it matters** | Differentiates premium furniture brands; reduces sample requests; supports finish confidence |
| **Recommended implementation** | (1) Authoring: DAM asset role `spin` (ordered frames) or `model` (GLB). (2) Viewer: progressive frame scrubber first (lighter than full 3D); optional Three.js/model-viewer for hero SKUs. (3) PDP tab: “360° / 3D”. (4) Hotspots optional overlay. (5) Room/AR explicitly Phase later |
| **Dependencies** | DAM; media pipeline; ProductGallery slots; performance budget; no Workflow/Policy redesign |
| **Priority** | **High** (Critical for hero SKUs; Medium for long-tail) |

## 4. Recommended approach (phased)

1. **V1 spin:** 24–36 frame JPEG/WebP sequences + drag scrubber + keyboard.  
2. **V1.1:** Finish/material swaps via texture sets tied to variants.  
3. **V2:** glTF for top collections; AR via `model-viewer` where supported.  
4. **Future:** room composer / AR placement (out of Phase A MVP).

## 5. Performance considerations

- Lazy-load spin only on tab open.
- Use low-res proxy frames for drag; upgrade on settle.
- Cap concurrent decodes; prefer CSS `transform` scrub over canvas when possible.
- Respect `prefers-reduced-motion` → static hero + “Play rotation” button.

## 6. Verdict

**No real 360°/3D product experience.** Remove or relabel booklet copy until a viewer ships. Implement spin-first, 3D-second, AR later.
