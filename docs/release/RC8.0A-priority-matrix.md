# RC8.0A — Priority Matrix

- **Created:** 2026-07-19
- **Use:** Sequence RC8.1 work; gate RC8.2–RC8.4
- **Companion:** `RC8.0A-gap-matrix.md`, `RC8.0A-roadmap-restructure.md`

## Priority definitions

| Level | Meaning |
|---|---|
| **P0 Critical** | Blocks any claim of complete customer experience |
| **P1 High** | Required for premium parity in RC8.1 |
| **P2 Medium** | Important polish / secondary journeys |
| **P3 Low / Future** | Explicitly deferred |

---

## P0 — Critical (RC8.1 must clear)

| ID | Gap refs | Item | Why | Dependencies |
|---|---|---|---|---|
| P0-01 | G-NAV-01…22 | Taxonomy + mega + full category journeys | Primary discovery | Catalogue, CMS, Seo |
| P0-02 | G-CAT-01…05,07 | Live listing + facets + sort + paging + count | Shopability | Search, Commerce |
| P0-03 | G-PDP-06…11 | Amazon-style gallery | Visual conversion | DAM, CDN |
| P0-04 | G-CNV-01…02 | Real inquiry/quote → CRM/Sales | Pipeline | Policy, Workflow, CRM, Sales |
| P0-05 | G-PDP-01…03 | Hard 404 + breadcrumbs + Product schema | Trust/SEO | Seo |
| P0-06 | G-RSP-01 | Mobile shop nav + touch gallery | Mobile majority | P0-01, P0-03 |
| P0-07 | G-BUD-01…09 | Budget / Product Finder packages | B2B conversion | Rules, catalogue, Sales |

---

## P1 — High (RC8.1)

| ID | Gap refs | Item | Why | Dependencies |
|---|---|---|---|---|
| P1-01 | G-PDP-12…13,16 | 360° Product Viewer + honest labeling | Differentiator | DAM, gallery |
| P1-02 | G-PDP-04…05,17–18 | Variants, availability, downloads, related | Spec accuracy | Inventory, Rules, DAM |
| P1-03 | G-CMP-01…03 | Product compare 2–4 | Specifier choice | Catalogue attrs |
| P1-04 | G-WSH-01…02 | Wishlist | Consideration | Identity optional |
| P1-05 | G-AI-01…09 | AI Furniture Consultant (grounded + handoff) | Guided selling | Catalogue, RC9 gateway |
| P1-06 | G-MOT-01, G-HOV-01 | Single motion + hover system | Brand luxury | Design tokens |
| P1-07 | G-CAT-05 | Commerce search typeahead | Findability | Search index |
| P1-08 | G-JOY-04 / pages | Support / Downloads / Services hubs | Trust | CMS, DAM |
| P1-09 | G-A11Y-01 early | Mega/gallery keyboard + alts | Compliance baseline | P0-01, P0-03 |
| P1-10 | G-SEO-01…02 | Sitemap + Collection/Product schema | Organic | P0-01 |

---

## P2 — Medium

| ID | Item | Target |
|---|---|---|
| P2-01 | Journal/news article routes (CMS) | RC8.1 late |
| P2-02 | Cookie preference center | RC8.1 / RC8.3 |
| P2-03 | Hide Console for anonymous primary nav | RC8.1 |
| P2-04 | Ultra-wide PDP layout | RC8.1 |
| P2-05 | Image CDN / AVIF pipeline hardening | RC8.1 / RC8.3 |
| P2-06 | Contextual WhatsApp from planner/consultant | RC8.1 |
| P2-07 | Enterprise workspace completion | **RC8.2** |
| P2-08 | Portal order visibility polish | RC8.2 / RC13 |

---

## P3 — Low / Future

| ID | Item | Target |
|---|---|---|
| P3-01 | Room planners (office/hotel/school/…) | Future |
| P3-02 | AI spatial layouts | Future |
| P3-03 | GLB 3D + AR | Future |
| P3-04 | Multi-language | Future |
| P3-05 | Saved searches / personalization | Future |
| P3-06 | AI cost assist inside planner | Post catalogue + RC9 |

---

## Quality & release priorities

| ID | Item | Priority | Phase |
|---|---|---|---|
| Q-01 | Accessibility full pass | P0 for release | RC8.3 |
| Q-02 | Performance budgets (LCP/CLS/INP) | P0 for release | RC8.3 |
| Q-03 | SEO verification | P1 | RC8.3 |
| Q-04 | E2E critical journeys | P0 for release | RC8.3 |
| Q-05 | Security review (public forms, AI) | P0 for release | RC8.4 |
| Q-06 | Production sign-off + commit | Gate | RC8.4 |

---

## Suggested RC8.1 implementation waves

| Wave | Focus | P0/P1 IDs |
|---|---|---|
| **W1** | Taxonomy, mega, category listings, SEO basics, PDP 404 | P0-01, P0-02, P0-05, P1-10 |
| **W2** | Gallery + mobile gestures + motion/hover | P0-03, P0-06, P1-06, P1-09 |
| **W3** | Wishlist, compare, variants, downloads | P1-02…04 |
| **W4** | Budget planner + conversion CRM/Sales | P0-04, P0-07 |
| **W5** | 360 Viewer + search typeahead + public hubs | P1-01, P1-07, P1-08 |
| **W6** | AI Furniture Consultant shell + handoffs | P1-05 |

Enterprise (RC8.2) starts after W1–W2 stabilize or on a parallel track that does not fork Policy/CQRS.

---

## Acceptance rule

RC8.1 is **not complete** while any **P0** remains open without written waiver.  
RC8.4 must not proceed with open **Q-01/Q-02/Q-04/Q-05** Critical defects.
