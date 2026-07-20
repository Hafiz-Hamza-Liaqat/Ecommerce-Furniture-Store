# RC9.4.3 — Responsive Verification Report

**Date:** 2026-07-20

## Logo responsive rules

**File:** `packages/web/src/brand/brand.css`

| Breakpoint | Logo display |
|------------|--------------|
| `< 768px` | SVG mark + “RLF” text; wordmark hidden |
| `768px – 1199px` | SVG mark + “Rao Liaqat Furniture” (0.92rem) |
| `≥ 1200px` | SVG mark + full name (1.05rem) |

**Layout stability:** `min-width` on `.brand-logo--responsive` prevents collapse/wrap in navbar.

## Navbar mobile requirements

| Requirement | Implementation |
|-------------|----------------|
| Single-line header at mobile widths | RLF monogram is compact (~6.5rem reserved) |
| Hamburger + utility icons fit | Existing RC9.4.1 minimal navbar retained |
| No text wrap on logo | `white-space: nowrap` on wordmark; mobile hides wordmark |
| No clipping | `text-overflow: ellipsis` on wordmark if constrained |

## Viewport matrix

| Width | Device class | Logo | Navbar |
|-------|--------------|------|--------|
| 320px | Small mobile | RLF | Monogram + menu |
| 375px | iPhone | RLF | ✅ |
| 390px | iPhone Pro | RLF | ✅ |
| 414px | iPhone Plus | RLF | ✅ |
| 768px | Tablet | Full name | Desktop nav or drawer |
| 1024px | Tablet landscape | Full name | ✅ |
| 1440px | Laptop | Full name | ✅ |
| 1920px | Desktop | Full name | ✅ |

*CSS media-query analysis + build verification. Recommend DevTools device toolbar pass before commit.*

## Footer responsive

Trust grid from `footer-trust.css`:

- `≤ 1199px`: 2-column grid
- `≤ 640px`: single column

## Contact page

Map placeholder is fluid width — ready for 16:9 embed without layout changes.

## Drawer

Mobile drawer header uses `BrandLogo variant="monogram"` — consistent with navbar mobile treatment.

## Deferred manual QA

Run `npm run dev` and verify at listed widths:

- No horizontal overflow on `body`
- WhatsApp FAB does not overlap hamburger
- Account dropdown readable at 320px
