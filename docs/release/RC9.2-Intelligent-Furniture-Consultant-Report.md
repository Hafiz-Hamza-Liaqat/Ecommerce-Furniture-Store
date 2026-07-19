# RC9.2 — Intelligent Furniture Consultant Report

- **Date:** 2026-07-20
- **Phase:** RC9.2 Intelligent Furniture Consultant (Grounded AI)
- **Commit:** pending — **do not commit until review approval**
- **Scope:** Customer-facing consultant extension only (marketing web)

## Objective

Transform the rule-based showroom assistant into a production-ready, catalog-grounded Furniture Consultant that understands natural language, retains session context, asks only for missing slots, recommends real AFH products, assembles packages, respects budget, and hands off to quotation / sales — without redesigning platform architecture.

## Architecture compliance

| Constraint | Result |
|---|---|
| No CQRS / Workflow redesign | **PASS** |
| No Authentication / Authorization / Policy changes | **PASS** |
| No Runtime Host redesign | **PASS** |
| No enterprise workspace redesign | **PASS** |
| Extend existing consultant (do not replace) | **PASS** — `nextConsultantTurn` + shell retained |
| Catalog-grounded recommendations only | **PASS** — grounding layer mandatory |
| Provider abstraction (no hard-coded vendor) | **PASS** — default `local-grounded` |

## Delivered

| Requirement | Implementation |
|---|---|
| Natural language understanding | Slot extraction in `intelligent/nlu.ts` (office/hotel/restaurant/home, seats, budget, style, industry) |
| Context-aware conversation | Structured `ConsultantMemory` merged across turns + `localStorage` persistence |
| Intelligent follow-ups | `missingFollowUps()` asks only for absent slots |
| Grounded recommendations | `searchCatalog` → score/rank → `recommendFromCatalog` |
| Explain + alternatives | Reasons + trade-off alternatives on product cards |
| Furnishing packages | Role-based packages for home / office / restaurant / hotel |
| Budget intelligence | Package totals, utilization vs stated budget, upgrades / savings tips |
| Quotation generation | Draft quote card + `/quote?from=consultant&lines=…` |
| Sales handoff | Quote, WhatsApp, contact, book visit, CRM lead queue actions |
| Provider abstraction | OpenAI / Anthropic / Gemini / Azure stubs → fall through to local grounded |
| Safety | No invented SKUs; admit catalogue/display pricing limits in notes |
| UX | Typing indicator, stream preview, product/package/quote/action cards, quick chips |

## Key files

| Path | Role |
|---|---|
| `packages/web/src/marketing/cx/consultant.ts` | Public facade (back-compat API) |
| `packages/web/src/marketing/cx/intelligent/*` | Engine, NLU, memory, grounding, packages, quote, provider |
| `packages/web/src/marketing/pages/ConsultantPage.tsx` | Premium consultant UX |
| `packages/web/src/marketing/cx/rc92-consultant.test.ts` | RC9.2 unit verification |
| `packages/web/src/styles/marketing.css` | Consultant cards / typing / reduced-motion |

## Default AI mode

Production default is **`local-grounded`**: deterministic NLU + catalog retrieval. Remote provider IDs are architecture-ready and currently fall back to the same grounded engine until API credentials are configured (future RC).

## Verdict

**IMPLEMENTED — awaiting manual review.** Do **not** commit. Do **not** begin RC9.3.
