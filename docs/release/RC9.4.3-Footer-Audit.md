# RC9.4.3 — Footer Audit

**Date:** 2026-07-20  
**Implementation:** `MarketingShell.tsx` + `footer-trust.css`

## Layout

Existing footer structure from RC9.4.2 preserved:

1. **Trust strip** (`site-footer__trust`) — business information grid
2. **Main footer columns** — collections, company, newsletter
3. **Legal bar** — copyright, privacy, terms

## Trust strip contents

| Label | Content | Link |
|-------|---------|------|
| Business | Rao Liaqat Furniture | — |
| Phone | +92 300 7922450 | `tel:+923007922450` |
| Phone | +92 313 8897350 | `tel:+923138897350` |
| WhatsApp | +92 300 7922450 | `wa.me/923007922450` |
| Showroom | Showroom location will be added before production launch. | — |
| Company | About · Contact | `/about`, `/contact` |
| Catalogue | Download catalogue | `/downloads` |

## Social placeholders

Below trust grid — dashed pill controls (not yet linked):

- LinkedIn
- Instagram
- Facebook

`title` attribute: “Social URL — configure before launch”

Styles: `site-footer__social-link` in `footer-trust.css`

## Styling

- `.site-footer__trust-value` — production typography for real data (replaces italic placeholders)
- Responsive grid: 2 columns ≤1199px, 1 column ≤640px

## Copyright bar

```
© {year} Rao Liaqat Furniture
```

Tagline from `BRAND.tagline`.

## Floating WhatsApp

Fixed-position CTA uses `whatsappUrl()` — same number as footer.

## Verification

| Check | Status |
|-------|--------|
| Business name matches `BRAND.name` | ✅ |
| Phones match canonical | ✅ |
| WhatsApp matches canonical | ✅ |
| Contact link present | ✅ |
| Catalogue download link | ✅ |
| Showroom placeholder (no fake map) | ✅ |
| Social slots prepared | ✅ |
