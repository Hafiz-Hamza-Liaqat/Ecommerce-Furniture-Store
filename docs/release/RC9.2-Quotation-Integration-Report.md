# RC9.2 — Quotation Integration Report

- **Date:** 2026-07-20
- **Phase:** RC9.2 Intelligent Furniture Consultant

## Principle

**Integrate with** the existing quotation /quote customer flow. **Do not replace** Sales CQRS, formal quotation workflow, or Rules.

## Bridge

`buildQuoteQuery(pkg)` →

```
/quote?from=consultant&package=<id>&lines=<sku:qty,...>&total=<pkr>&focus=<sku>
```

## Draft quote card

Includes:

- selected items (id, name, qty, unit, line total)
- subtotal label
- notes (budget, programme, display-price disclaimer)
- CTA `quoteHref` into existing quote page

## Compatibility

| System | Integration |
|---|---|
| Customer `/quote` page | Query-param seed (`from=consultant`) |
| Budget planner quote pattern | Same `lines=` encoding style |
| Formal Sales quotation | Unchanged — handoff only |
| Downloadable quote | Remains on existing quote path |

## Sales handoff CTAs

Also linked from consultant actions: WhatsApp, contact, book visit, CRM lead queue — reuse existing marketing integrations.

## Verification

Unit test asserts `buildQuoteQuery` contains `/quote?` and `from=consultant`.

## Verdict

**PASS** — quotation integration is additive and non-breaking.
