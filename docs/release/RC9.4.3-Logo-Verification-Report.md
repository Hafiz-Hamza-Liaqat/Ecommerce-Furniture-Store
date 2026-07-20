# RC9.4.3 — Logo Verification Report

**Date:** 2026-07-20

## Logo assets

| Asset | Path | Purpose |
|-------|------|---------|
| Navbar / login SVG mark | `BrandMonogramSvg` in `BrandLogo.tsx` | Inline SVG, theme-aware fill |
| Favicon 192 | `public/icons/rlf-192.svg` | Browser tab, apple-touch-icon |
| Favicon 512 | `public/icons/rlf-512.svg` | PWA maskable |
| PWA manifest | `public/manifest.webmanifest` | `name`: Rao Liaqat Furniture, `short_name`: RLF |

## Component usage matrix

| Page / shell | Component | Variant | Link |
|--------------|-----------|---------|------|
| Marketing navbar | `BrandLogo` | `responsive` | `/` |
| Mobile nav drawer | `BrandLogo` | `monogram` | `/` |
| Login | `BrandLogo` | `full` | none |
| Workspace sidebar | `BrandMark` | collapsed → SVG only | n/a |
| Admin / Portal / Onboarding | Text | `BRAND.name` (+ suffix) | Platform shell |

## Responsive verification

CSS breakpoints in `brand.css`:

```css
/* < 768px  → wordmark hidden, RLF mono text shown */
/* 768–1199 → full name, font-size 0.92rem */
/* ≥ 1200px → full name, font-size 1.05rem */
```

Reserved widths: `6.5rem` (mobile) · `10rem` (tablet) · `14rem` (desktop) to reduce navbar shift.

### Breakpoint checklist

| Width | Expected | Status |
|-------|----------|--------|
| 320px | RLF monogram, single-line header | ✅ CSS + `min-width` |
| 375px | RLF monogram | ✅ |
| 390px | RLF monogram | ✅ |
| 414px | RLF monogram | ✅ |
| 768px | Full name (tablet size) | ✅ |
| 1024px | Full name | ✅ |
| 1440px | Full name (desktop size) | ✅ |
| 1920px | Full name | ✅ |

*Verified via CSS media-query review and production build. Manual browser spot-check recommended before commit.*

## Light / dark mode

| Element | Light | Dark |
|---------|-------|------|
| SVG background | `--brand-forest` | `--brand-brass-deep` |
| SVG text | `--brand-primary-on` | `--brand-primary-on` |
| Wordmark / mono | `--brand-forest` | `--brand-brass` |

Selectors: `[data-theme="dark"]` and `.site[data-site-theme="dark"]`.

## Future-ready structure

Replace `BrandMonogramSvg` inner content with an official logo mark while keeping:

- `BrandLogo` props: `variant`, `asLink`, `className`
- Responsive CSS classes: `brand-logo--responsive|full|monogram`
- `BrandMark` collapsed behavior

## Issues / deferred

- `public/catalogue.pdf` still says “Artisan Furnish Hub Catalogue” — regenerate PDF at production
- Legacy `public/icons/afh-*.svg` may remain on disk but are no longer referenced by `index.html` or manifest
