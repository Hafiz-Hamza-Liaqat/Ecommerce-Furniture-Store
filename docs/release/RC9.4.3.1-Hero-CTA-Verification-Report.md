# RC9.4.3.1 — Hero CTA Verification Report

**Date:** 2026-07-20

## Primary / secondary pairing

| Role | Class | Purpose |
|------|-------|---------|
| Primary | `site-btn site-btn--primary` | Explore catalogue, Request quote, etc. |
| Secondary | `site-btn site-btn--outline` | Book a demo, companion actions |

## Spec compliance

### Light mode (`--outline`)

- ✅ White background  
- ✅ Forest text  
- ✅ Forest border  
- ✅ Hover: forest background, white text  

### Dark mode (`--outline`)

- ✅ Transparent background  
- ✅ Brass border  
- ✅ Brass text  
- ✅ Hover: brass fill, dark text (`--brand-primary-on`)  

### Spacing

Same `min-height: var(--brand-touch-min)` and padding scale as primary; shared `.site-hero__actions` gap `0.75rem`.

## Page coverage

| Location | Primary | Secondary |
|----------|---------|-----------|
| Home hero | Explore catalogue | Book a demo (outline) |
| Home bottom band | Request quotation | Book demo + Download (outline) |
| Journal index CTA | Browse catalogue | Request quote (outline) |
| Journal article | Request quote | Browse furniture (outline) |
| Consultant quick actions | Request quotation | Book consultation (outline) |
| Projects detail | Start similar project | Back to portfolio (outline) |

## CTA band (dark image band)

Special override: outline uses translucent white border; hover fills white with forest text — readable on dark photography band.
