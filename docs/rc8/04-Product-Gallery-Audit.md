# 04 — Product Gallery Audit (Amazon-style)

- **Audit ID:** RC8.0-CX-04
- **Evidence:** `ProductDetailPage` gallery markup; `marketing.css` `.site-pdp__gallery`

## 1. Capability checklist

| Feature | Status | Notes |
|---|---|---|
| Desktop hover zoom | **M** | |
| Lens zoom | **M** | |
| Cursor-follow zoom | **M** | |
| Fullscreen lightbox | **M** | |
| Keyboard arrows | **M** | |
| Touch swipe | **M** | Booklet has swipe; PDP does not |
| Responsive thumbnails | **Partial** | CSS only; not interactive |
| Thumbnail carousel (overflow) | **M** | Fixed 3 static imgs |
| Video | **M** | Booklet “Film” is a label |
| 360 viewer | **M** | See doc 05 |
| Image sequence | **M** | |
| 3D viewer | **M** | |
| Pinch zoom | **M** | |
| Lazy loading (gallery set) | **Partial** | Main image not lazy; thumbs not gated |
| Progressive loading / LQIP | **M** | |
| Image preloading (adjacent) | **M** | |
| Accessibility (alt, live region, focus) | **Partial** | Main has alt; thumbs `aria-hidden` with empty alt |
| Selectable thumb → main | **M** | Thumbs do nothing |
| Image optimization (srcset, AVIF/WebP) | **M** | Single remote JPEG URLs |

## 2. What exists today

```text
.site-pdp__gallery
  <img main>
  .site-pdp__thumbs
    <img> <img> <img>   ← decorative / non-interactive
```

No gallery state machine, no DAM asset versions, no zoom layer.

## 3. Gap record

| Field | Value |
|---|---|
| **Current status** | Missing Amazon-style gallery; placeholder strip only |
| **Why it matters** | Furniture purchase decisions are visual; competitors treat gallery as PDP core |
| **Recommended implementation** | Dedicated `ProductGallery` presentation component: keyboard-accessible carousel, hover zoom (desktop), pinch/swipe (mobile), fullscreen, optional video/360 slots fed by DAM asset roles (`hero`, `detail`, `lifestyle`, `spin`, `model`) |
| **Dependencies** | DAM binaries + metadata (RC7.5); catalogue media associations (RC11); CDN/image pipeline; reduced-motion fallbacks |
| **Priority** | **Critical** |

## 4. Performance considerations

- Serve responsive `srcset` / AVIF-WebP with JPEG fallback.
- Preload only LCP hero; lazy remaining angles.
- Defer 360/3D until user intent (button) to protect LCP/INP.
- Never block PDP on model download.

## 5. Verdict

**0% Amazon-class gallery.** Treat as greenfield UI component in Phase A, backed by DAM—not marketing Unsplash URLs.
