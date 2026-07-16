# RC1 — Accessibility Verification Report

## Validated

- Skip links: `#site-main`, `#main-content`, `#plt-main`
- Auth forms: labels, autocomplete, required fields
- Status badges and live regions on newsletter / security / probes
- Keyboard: command palette, overlays, buttons (existing workspace a11y)
- Focus-visible tokens unchanged
- `prefers-reduced-motion` honored in workspace, marketing, AI, platform CSS
- Touch targets: platform coarse-pointer min-height 44px
- ARIA: booklet hotspots labeled; tabs role=tablist patterns reused

## Residual risk (RC2)

- Full automated axe suite against live authenticated ERP record forms
- Screen-reader pass on ModuleApp bulk actions in every module
