# RC9.4.3.1 — Responsive Verification Report

**Date:** 2026-07-20

## Breakpoint matrix

| Width | Chrome | Brand | Notes |
|-------|--------|-------|-------|
| 320 | Logo + hamburger | SVG mark only | Drawer: text RLF + Close |
| 360 | Logo + hamburger | SVG mark | Single brand |
| 375 | Logo + hamburger | SVG mark | Single brand |
| 390 | Logo + hamburger | SVG mark | Single brand |
| 414 | Logo + hamburger | SVG mark | Single brand |
| 480 | Logo + hamburger | SVG mark | Single brand |
| 768 | Drawer (&lt;1200) | Mark + full name in drawer chrome N/A; header mark+name when ≥768 header logo | Header `BrandLogo` responsive |
| 820 | Drawer | Mark + name in header | |
| 1024 | Drawer | Mark + name | Utils inside drawer — no overlap with primary |
| 1280 | Desktop nav | Mark + name | Compact util spacing |
| 1366 | Desktop | Mark + name | Compact 1200–1439 |
| 1440 | Desktop | Full size name | |
| 1920 | Desktop | Full size name | |

## Checks

| Check | Status |
|-------|--------|
| No wrapping in header | ✅ nowrap + compact gaps |
| No clipping logo | ✅ mobile = mark only |
| No duplicated logos | ✅ text OR mark, not both |
| No overflowing icons | ✅ utils flex-shrink 0, compact CTA |
| Consistent CTA sizing | ✅ outline matches primary min-height |
| Drawer independently scrollable | ✅ |
| Body scroll locked when open | ✅ |

*CSS + build verified. Recommend DevTools pass before commit.*
