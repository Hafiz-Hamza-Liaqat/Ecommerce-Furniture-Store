# RC9.4.3.1 — Theme Verification Report

**Date:** 2026-07-20

## Light mode

| Surface | Expectation | Status |
|---------|-------------|--------|
| Hero primary CTA | Forest fill, light text | ✅ |
| Hero secondary outline | White fill, forest/white border, forest text | ✅ |
| Navbar | Forest mark + wordmark | ✅ |
| Drawer | Solid paper surface, forest RLF text | ✅ |
| Dropdowns / account | Existing brand tokens | ✅ |
| Cards / footer | Unchanged RC9.4.2 | ✅ |
| Outline on light pages | White + forest border | ✅ |

## Dark mode

| Surface | Expectation | Status |
|---------|-------------|--------|
| Hero primary | Brass fill | ✅ |
| Hero secondary outline | Brass border/text; hover brass fill | ✅ |
| Navbar wordmark | Brass | ✅ |
| Drawer | Dark paper, brass RLF | ✅ |
| Outline hover text | `--brand-primary-on` (dark) | ✅ |
| CTA band outline | White border on dark band; hover white fill | ✅ |

## Invisible outlines

Ghost buttons retained for chrome only. Secondary marketing CTAs use `--outline` with explicit borders in both themes.

## Accessibility contrast

Outline forest on white and brass on dark paper meet intended premium contrast. Hero white secondary on dark media remains high contrast.
