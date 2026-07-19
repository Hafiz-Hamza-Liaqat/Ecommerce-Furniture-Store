# 07 — Filters, Search & Budget Planner Audit

- **Audit ID:** RC8.0-CX-07
- **Evidence:** `ProductsPage.tsx`, `MarketingShell` SiteSearch, `ProjectsPage.tsx`, roadmap RC10/RC11

## A. Catalogue filters

### Present today

- Query params: `category`, `collection`
- Chip links for 5 categories + 3 collections
- Client-side `Array.filter` over 6 fixtures

### Required filter dimensions

| Filter | Status |
|---|---|
| Category | **Partial** (flat) |
| Subcategory | **M** |
| Collection | **Partial** |
| Material | **M** |
| Finish | **M** |
| Wood | **M** |
| Color | **M** |
| Price / Budget band | **M** |
| Availability | **M** |
| Lead time | **M** |
| Brand / Manufacturer | **M** |
| Dimensions | **M** |
| Usage (Commercial / Residential / Luxury / Eco / Customizable) | **M** |

### Sort

| Sort | Status |
|---|---|
| Newest / Popular / Price / Featured / Alphabetical / Best Selling / Recently Added | **All M** |

### Gap — faceted catalogue

| Field | Value |
|---|---|
| **Current status** | Minimal chip filters; no facets/sort/paging |
| **Why it matters** | Non-negotiable for furniture catalogue UX and SEO landing pages |
| **Recommended implementation** | Public read model + facet aggregations; reuse Search/Reporting as read models; UI facet panel; URL-serialized state; empty states |
| **Dependencies** | RC11 taxonomy & attributes; RC7 Search foundations; RC7.1 patterns for any authenticated lists |
| **Priority** | **Critical** |

---

## B. Search experience

| Capability | Public site | Backend Search module |
|---|---|---|
| Global search | **P** modal over fixtures | **B** CQRS Index/Query (ops) |
| Autocomplete | **Partial** (simple includes) | **M** for commerce |
| Suggestions / synonyms | **M** | **M** |
| Categories / Products / Collections / Projects / Articles / Manufacturing / Downloads | **Partial** (products, projects, news titles, categories) | Bounded indexes only |
| Filters in search | **M** | Company filter inject |
| Saved / recent searches | **M** | **M** |

### Gap — customer search

| Field | Value |
|---|---|
| **Current status** | Presentation search; enterprise Search not wired to storefront |
| **Why it matters** | Primary navigation for large catalogues |
| **Recommended implementation** | Public search API over published catalogue index; typeahead; no Policy bypass for unpublished SKUs |
| **Dependencies** | Search read model; catalogue publish pipeline; Policy for B2B exclusives |
| **Priority** | **Critical** |

---

## C. Customer budget planner

### Required (vision)

Budget calculator, furniture/room planner, end-use selector, estimator, package generator, quantity estimator for Office / Hospital / School / University / Restaurant / Hotel / Home / Coworking / Clinic / Government.

**Inputs:** room size, budget, employees, department, end use.  
**Outputs:** recommended products, quantities, estimated total, alternative packages, savings, premium upgrades.

### Current status

| Item | Status |
|---|---|
| Any public budget/room planner | **M** |
| Enterprise finance “budget” screens | Unrelated ERP budgets |
| Booklet material selectors | Cosmetic; no costing |

### Gap record

| Field | Value |
|---|---|
| **Current status** | Missing entirely (required implementation for vision) |
| **Why it matters** | Core B2B conversion tool for furniture manufacturers; feeds quotes |
| **Recommended implementation** | Deterministic estimators in Rules Engine (RC10); UI wizard on marketing/portal; outputs draft quote lines via Sales commands; disclaimers; audit of inputs |
| **Dependencies** | RC10 formulas; RC11 catalogue pricing; RC6 Workflow for quotes; Policy; **no** browser-only costing as source of truth |
| **Priority** | **High** (Critical for commercial B2B launch) |

---

## D. Wishlist & compare (related)

| Feature | Status |
|---|---|
| Wishlist | **M** (booklet Favorite is ephemeral UI) |
| Compare table | **M** |

Both are RC11 scope; list under Phase A CX completion.

## Verdict

Filters/search are prototype-grade; budget planner is absent and must be Rules-owned when built.
