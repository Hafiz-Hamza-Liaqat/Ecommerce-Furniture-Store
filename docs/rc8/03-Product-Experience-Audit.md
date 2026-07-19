# 03 — Product Experience Audit

- **Audit ID:** RC8.0-CX-03
- **Evidence:** `ProductsPage.tsx` (`ProductDetailPage`), `InquiryForm.tsx`, `Seo.tsx`
- **Comparators:** Amazon, Apple, Steelcase, Herman Miller, premium furniture PDPs

## 1. PDP capability matrix

| Capability | Status | Evidence / notes |
|---|---|---|
| Gallery (multi-image interactive) | **M / P** | Thumbs are static duplicates; not selectable |
| Zoom / lens / fullscreen | **M** | |
| Responsive gallery | **Partial** | CSS grid stacks; no touch gallery |
| Thumbnail carousel | **M** | Static strip |
| Touch / keyboard gallery | **M** | |
| Lazy loading | **Partial** | Related products `loading="lazy"`; hero image eager |
| Image optimization | **M** | Unsplash remote URLs; no CDN/WebP pipeline |
| Variant selector | **M** on PDP | Booklet has wood/fabric/finish/color (local state) |
| Availability / lead time | **M** | Copy only in FAQ globally |
| Downloads (specs, CAD, care) | **P** | Single `catalogue.pdf` link |
| Specifications | **I** | Fixture `specs` dl |
| Related products | **Partial** | Same-category slice of fixtures |
| Recently viewed | **M** | |
| Recommendations / cross-sell | **M** | |
| Inquiry form | **P** | Simulated success |
| Quote form | **Partial** | Link to `/quote` + inquiry |
| Lead capture (CRM) | **M** | |
| Breadcrumbs | **M** | |
| SEO title/description/OG | **I** | Via `Seo` |
| Structured data Product | **M** | JSON-LD Organization only |
| Loading states | **Partial** | Shell skeleton only |
| Empty / not-found | **Defect** | Unknown id → first product (CX-D1) |
| Price honesty | **P** | `priceFrom` string fixtures |
| Stock / configure / add | **M** | B2B quote-first model not implemented |

---

## 2. Gap records (high-impact)

### Amazon-class media experience

| Field | Value |
|---|---|
| **Current status** | Missing (placeholder thumbs) |
| **Why it matters** | Primary conversion driver for furniture (texture, scale, finish) |
| **Recommended implementation** | DAM-backed image sets + gallery component (see doc 04); Policy on private assets |
| **Dependencies** | DAM object store (RC7.5); catalogue media model (RC11) |
| **Priority** | **Critical** |

### Variants & configuration

| Field | Value |
|---|---|
| **Current status** | Missing on PDP; booklet selectors are cosmetic |
| **Why it matters** | Furniture SKUs are finish/size matrices; wrong PDP = wrong quote |
| **Recommended implementation** | Variant matrix (size/finish/fabric) → price/lead from Rules; quote lines with selected options |
| **Dependencies** | Commerce SKU model; Rules; Sales quote; Workflow |
| **Priority** | **Critical** |

### Conversion (inquiry / quote / lead)

| Field | Value |
|---|---|
| **Current status** | Presentation-only forms |
| **Why it matters** | No pipeline = marketing without business value |
| **Recommended implementation** | Authenticated-or-anonymous lead commands → CRM; quote draft → Sales; consent + audit |
| **Dependencies** | CRM/Sales CQRS; Policy; Notifications; RC13 |
| **Priority** | **Critical** |

### Discovery adjacent (recently viewed, recommendations, cross-sell)

| Field | Value |
|---|---|
| **Current status** | Missing (related = same-category fixture filter) |
| **Why it matters** | Increases AOV and specification completeness |
| **Recommended implementation** | Client recently-viewed store → server recommendations later (RC9); merchandising rules |
| **Dependencies** | Catalogue; optional AI later |
| **Priority** | **High** |

### Breadcrumbs + Product JSON-LD + real 404

| Field | Value |
|---|---|
| **Current status** | Missing / incorrect |
| **Why it matters** | SEO, accessibility, trust |
| **Recommended implementation** | Breadcrumb trail component; Product + BreadcrumbList schema; hard 404 for unknown SKU |
| **Dependencies** | Taxonomy; Seo extension |
| **Priority** | **High** |

---

## 3. Catalogue listing experience

| Concern | Status |
|---|---|
| Grid cards | **I** (fixture) |
| Filters | **Partial** (category/collection chips) |
| Sort | **M** |
| Pagination | **M** (6 items only) |
| Empty filter state | **M** (empty grid, no message) |
| Compare / wishlist actions on card | **M** |
| Hover media swap | **M** |

---

## 4. Verdict

PDP is a **static product sheet**, not a premium commerce product experience. Phase A must replace fixture PDP with DAM media, variants, truthful availability, and real conversion paths while keeping Policy/Workflow/Sales ownership intact.
