# Amazon Magnifier Validation (RC8.5 Final Polish)

## Required behavior

| Requirement | Status | Notes |
|---|---|---|
| Lens follows cursor on main image | Pass | Square lens over object-fit contain image |
| Separate zoom panel to the **right** | Pass | Floating `position: fixed` pane |
| Panel overlays product details | Pass | `z-index: 90`; does not expand gallery grid |
| Does not permanently push/resize layout | Pass | Grid stays `72px 1fr` |
| True hi-res sampling | Pass | `zoomUrl` / Unsplash `w=4000` |
| 1:1 cursor → source mapping | Pass | `computeMagnifierLayout` |
| Inspect every edge / no clipping | Pass | Unit-tested L/R/T/B |
| No CSS `scale()` / transform-origin hover zoom | Pass | Hover path uses pane only |
| Hide on pointer leave | Pass | `clearMagnifier()` |
| Fullscreen uses same magnifier | Pass | Shared `renderStage` + floating pane |
| Keyboard / a11y preserved | Pass | ← →, F, Esc, focus trap |
| Mobile | Pass | Floating pane hidden; pinch/swipe retained |

## Manual check

1. Open `/products/meridian-sofa` on desktop width.
2. Hover the main gallery image — lens appears; zoom panel floats to the right over details.
3. Move to each edge — preview shows corresponding extreme pixels.
4. Leave the image — panel disappears; layout unchanged.
5. Open Fullscreen — hover still opens the floating hi-res panel.

## Evidence

- Implementation: `ProductGallery.tsx`, `marketing.css` (`.cx-gallery__pane--float`)
- Unit: `media.test.ts` magnifier edge cases
