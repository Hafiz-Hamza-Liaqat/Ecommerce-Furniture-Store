# RC9.4.3 — Theme Verification Report

**Date:** 2026-07-20  
**Scope:** Brand logo and trust surfaces in light and dark modes (RC9.4.2 token foundation unchanged)

## Logo theme tokens

From `brand.css`:

| Token | Light usage | Dark usage |
|-------|-------------|------------|
| `--brand-forest` | Wordmark, SVG bg | — |
| `--brand-brass` | — | Wordmark, mono text |
| `--brand-brass-deep` | — | SVG background |
| `--brand-primary-on` | SVG “RLF” letterform | Same |

Dark triggers:

- `[data-theme="dark"]` (workspace)
- `.site[data-site-theme="dark"]` (marketing appearance toggle)

## Surfaces verified

| Surface | Light | Dark |
|---------|-------|------|
| Marketing navbar logo | Forest wordmark | Brass wordmark |
| Mobile RLF mono | Forest | Brass |
| Login full logo | Centered, forest | Brass via site theme |
| Footer trust links | Forest links | Brass links |
| Contact page links | Forest | Brass |
| WhatsApp FAB | Brand green icon | Inherits site theme |
| Workspace sidebar mark | Enterprise theme | Workspace dark tokens |

## No theme redesign

RC9.4.3 did **not** modify:

- `tokens/index.css` color palette
- `workspace-theme.css` gradients
- `marketing.css` layout or hero
- Button system or motion scale

Only brand-specific CSS added in `brand.css` and trust value styles in `footer-trust.css`.

## Account menu appearance toggle

🌓 **Appearance** menu action toggles marketing light/dark via existing `MarketingShell` theme state — notifications UI expands inline without backend.

## Manual check recommendation

Before commit, spot-check in browser:

1. Marketing home → Appearance → Dark → verify logo brass tone
2. Login page in both themes
3. Workspace sidebar (uses app theme, not site theme)
