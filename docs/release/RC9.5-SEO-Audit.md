# RC9.5 — SEO Audit

**Status:** Verified — awaiting review  
**Date:** 2026-07-20

## Controls

- `Seo.tsx` sets title (`· BRAND.name`), description, canonical, OG, Twitter
- Static `robots.txt` + `sitemap.xml`
- Brand identity from RC9.4.3 `BRAND`

## Sample pages (code-path verified)

| Page | Title/desc/canonical via Seo |
|------|------------------------------|
| Home | Yes |
| Wishlist | Yes |
| Products / Category / Blog | Yes (existing) |

## Residual

- Edge/server CSP headers for SPA: meta CSP only (document; edge HSTS separate from API HSTS)
