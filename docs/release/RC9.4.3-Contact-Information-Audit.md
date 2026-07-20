# RC9.4.3 — Contact Information Audit

**Date:** 2026-07-20  
**Canonical source:** `packages/web/src/brand/index.ts`

## Canonical values

| Channel | Display | Machine |
|---------|---------|---------|
| Primary phone | +92 300 7922450 | `tel:+923007922450` |
| Secondary phone | +92 313 8897350 | `tel:+923138897350` |
| WhatsApp | +92 300 7922450 | `https://wa.me/923007922450` |
| Email | info@raoliaquatfurniture.com | `mailto:` |

## Consumer audit

| Surface | Source | Hardcoded? |
|---------|--------|------------|
| Contact page | `BRAND` + `whatsappUrl()` | No |
| Footer trust strip | `BRAND` + `whatsappUrl()` | No |
| Floating WhatsApp CTA | `whatsappUrl()` | No |
| SEO JSON-LD | `BRAND.phone`, `BRAND.email` | No |
| Company / legal copy | `content.ts` → re-exports `BRAND` | No |
| Consultant handoff link | `whatsappUrl()` + `BRAND.name` in message | No |
| Consultant engine prefill | `BRAND.whatsapp` via `content.ts` re-export | No (logic unchanged) |
| Login SEO | `BRAND.name` | No |

## Email domain migration

Company page copy updated from `@artisanfurnish.example` to `@raoliaquatfurniture.com`:

- careers@
- press@
- events@
- privacy@

## Not in scope (internal fixtures)

These retain `@afh.local` or dev URLs — not customer branding:

- Platform store audit actors
- Integrations catalog `docs.afh.local`
- Analytics placeholder inputs
- E2E test credentials (`AFH_E2E_*` env vars)

## Grep verification

```
packages/web/src — phone digits 7922450 / 8897350 / 923007922450
→ Only in brand/index.ts and brand.test.ts
```

No placeholder `+92 300 000 0000` or `923000000000` in `packages/web/src`.

## Recommendation before production

1. Wire CRM / quote templates to import `BRAND` when those modules gain customer-facing PDFs
2. Regenerate `catalogue.pdf` with official name and contact block
3. Populate `BRAND.social.*` URLs when accounts are live
