# 12 — Priority Matrix

- **Audit ID:** RC8.0-CX-12
- **Phases:** A = Customer Experience Completion · B = Enterprise Workspace · C = Production & Release Audit

## Critical (block premium CX claim)

| ID | Item | Current status | Why it matters | Recommended implementation | Dependencies | Phase |
|---|---|---|---|---|---|---|
| C1 | Furniture taxonomy + mega menu + L2 pages | Missing | Primary discovery vs competitors | Taxonomy model + mega + routes | RC11 data | A |
| C2 | Live catalogue + facets/sort | Placeholder | Shoppers cannot find products | Public read models + facet UI | Search/Commerce | A |
| C3 | Amazon-style gallery | Missing | Visual conversion | DAM-backed gallery component | DAM RC7.5 | A |
| C4 | Real lead/quote capture | Placeholder forms | No pipeline | CRM/Sales commands + consent | Policy, Workflow | A |
| C5 | Product 404 + breadcrumbs + Product schema | Defect / Missing | SEO & trust | Hard 404; schema; crumbs | Seo, taxonomy | A |
| C6 | Mobile shop nav + touch gallery | Partial / Missing | Mobile traffic | Drawer IA + gestures | C1, C3 | A |

## High

| ID | Item | Current status | Why it matters | Recommended implementation | Dependencies | Phase |
|---|---|---|---|---|---|---|
| H1 | Variants / finishes on PDP | Missing (booklet cosmetic) | Correct specification | SKU matrix + Rules price | Commerce, Rules | A |
| H2 | Availability / lead time | Missing | Promise accuracy | Inventory + scheduling projections | Inventory, Workflow | A |
| H3 | 360° spin viewer | Missing (false label) | Premium differentiator | Frame scrubber via DAM | DAM, gallery | A |
| H4 | Wishlist + compare | Missing | Consideration set | Local→account sync; compare table | Identity optional | A |
| H5 | Customer search typeahead | Placeholder | Findability | Public Search index | Search CQRS | A |
| H6 | Budget / room planner | Missing | B2B conversion | Rules estimators → quote draft | RC10, Sales | A |
| H7 | AI furniture consultant | Missing (chat stub) | Guided selling | Grounded AI gateway + handoff | RC9, catalogue | A (shell) / RC9 |
| H8 | Downloads library | Missing route | Specifiers need assets | DAM download center | DAM, CMS | A |
| H9 | Unified motion system | Partial / inconsistent | Brand luxury | Motion tokens + one library | Design | A |
| H10 | A11y mega/gallery/alt | Partial | Compliance | WCAG patterns | C1, C3 | A / C |

## Medium

| ID | Item | Current status | Why it matters | Recommended implementation | Dependencies | Phase |
|---|---|---|---|---|---|---|
| M1 | Support / Services pages | Missing | Trust & post-sale | CMS pages + contact routing | CMS | A |
| M2 | Journal/News detail routes | Placeholder lists | Content SEO | CMS entries | CMS CQRS | A |
| M3 | Cookie preference center | Accept-only | Privacy | Consent categories | RC13 | A / C |
| M4 | Image CDN / AVIF pipeline | Missing | LCP/CLS | Edge transforms | Deploy | A / C |
| M5 | Hide Console for anonymous | Present in primary nav | Focus shoppers | Auth-aware nav | Session | A |
| M6 | Ultra-wide PDP polish | Partial | Premium desktop | Layout tokens | Design | A |
| M7 | Enterprise CX portals | Fixture portal | Account journeys | Policy-scoped portal | Roadmap RC8/RC13 | **B** |
| M8 | Remaining enterprise UI | Mixed | Ops completeness | ModuleApp completion | RC7 backends | **B** |

## Low / Future

| ID | Item | Current status | Notes | Phase |
|---|---|---|---|---|
| L1 | Room preview / AR | Missing | Explicit future | Post-A |
| L2 | Multi-language | Missing | Localization program | Later |
| L3 | Saved searches / personalization | Missing | After identity | Later |
| L4 | Synonyms / AI ranking | Missing | RC9 | Later |

## Performance & SEO (primarily Phase C gates)

| ID | Item | Priority | Phase |
|---|---|---|---|
| P1 | LCP / CLS / INP budgets | High | C (measure in A) |
| P2 | Complete sitemap + robots | High | A then C verify |
| P3 | Bundle split gallery/viewer/planner | Medium | A / C |
| P4 | E2E CX regression + a11y scans | Critical for release | C |
| P5 | Security review of public forms | Critical | C |

## Mapping to user phases

| Phase | Matrix coverage |
|---|---|
| **A — Customer Experience Completion** | All Critical; High H1–H10; Medium M1–M6 |
| **B — Enterprise Workspace Completion** | M7–M8 and enterprise checklist outside this CX pack |
| **C — Final Production & Release Audit** | P1–P5; a11y/perf/SEO sign-off; residual Medium polish |

## Overall CX readiness score (qualitative)

| Domain | Score |
|---|---|
| Brand pages (about, manufacturing story, etc.) | **~70%** presentation-complete |
| Commerce discovery (mega, facets, search) | **~15%** |
| PDP media & configuration | **~10%** |
| Conversion (lead/quote) | **~20%** (UI only) |
| AI consultant / budget planner | **~5%** |
| A11y / responsive commerce UX | **~40%** foundation |

**Conclusion:** Do not claim customer-experience completion until Critical items C1–C6 clear. Documentation pack RC8.0 is the planning gate only — **no code authorized by this audit**.
