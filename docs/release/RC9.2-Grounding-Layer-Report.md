# RC9.2 — Grounding Layer Report

- **Date:** 2026-07-20
- **Phase:** RC9.2 Intelligent Furniture Consultant

## Rule

**The AI must never bypass the grounding layer.** All product IDs shown to customers must resolve in the AFH catalogue.

## Flow

```
AI / engine intent
    ↓
Grounding Service (searchCatalog)
    ↓
Catalog metadata score / rank
    ↓
recommendFromCatalog / assembleIntelligentPackage
    ↓
assertGroundedIds (safety check)
    ↓
UI cards
```

## Inputs used for retrieval

| Signal | Source |
|---|---|
| Category / taxonomy | `endUse` / `roomType` → slug maps |
| Style | style hint tokens (e.g. walnut, linen, mesh) |
| Materials / colours | memory slots + product fields |
| Budget | soft penalty when unit price exceeds budget band |
| Preference | desk / lounge / dining / bedroom / storage hints |
| Tags / collection / availability | product haystack |
| Exclusions | rejected / already-selected IDs |

## Ranking

Deterministic weighted score over catalogue metadata (no invented SKUs). Cache holds the catalogue snapshot for the session (`clearGroundingCache` for tests/hot reload).

## Safety APIs

| API | Behavior |
|---|---|
| `searchCatalog(query)` | Returns only real `CatalogueProduct` rows |
| `recommendFromCatalog(memory)` | Primary + alternatives with reasons |
| `assertGroundedIds(ids)` | Splits `{ ok, missing }` — missing must never be shown as products |

## Vector search readiness

`searchCatalog` is the sole retrieval entry point. A future vector index can replace or augment the scorer **inside** this module without changing engine or UI contracts.

## Verification

Unit tests assert:

- Hits resolve via `getCatalogueProduct`
- Fake IDs appear in `missing`
- Packages only contain grounded lines

## Verdict

**PASS** — grounding is mandatory and verified for RC9.2.
