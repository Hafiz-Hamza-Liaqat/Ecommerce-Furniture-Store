# 01 — Customer Experience Gap Audit

- **Audit ID:** RC8.0-CX-01
- **Evidence:** `App.tsx`, `MarketingShell.tsx`, `marketing/pages/*`, `marketing/data/content.ts`

## Status legend

| Code | Meaning |
|---|---|
| **I** | Implemented (usable as intended for a marketing prototype) |
| **P** | Placeholder / presentation-only (UI exists; data or action simulated) |
| **B** | Backend only (server capability exists; no customer UI) |
| **M** | Missing entirely |
| **R** | Route missing |
| **Partial** | Some aspects exist; critical parts missing |

For each gap below: **Current status · Why it matters · Recommended implementation · Dependencies · Priority**

---

## 1. Page inventory (customer-facing)

| Page / surface | Route today | Status | Notes |
|---|---|---|---|
| Home | `/` | **I** (marketing) | Full hero + sections; static content |
| Collections (standalone) | — | **R / M** | Only query `?collection=` on `/products`; no `/collections` hub |
| Products / Catalogue | `/products` | **P** | 6 fixture SKUs; chip filters only |
| Categories (standalone) | — | **R / M** | Home category tiles → query string; no taxonomy pages |
| Product Detail | `/products/:id` | **P** | Single image “gallery”; unknown id soft-falls to first product |
| Catalogue booklet | `/#booklet` | **P** | Interactive booklet UI; not a PDF storefront |
| Search | modal (⌘K) | **P** | Client filter over fixtures; not Search module |
| Wishlist | — | **M** | Booklet “Favorite” is local UI state only |
| Compare | — | **M** | Analytics “compare” widgets are enterprise BI, not CX |
| Inquiry | embedded + `/contact` | **P** | Form success simulated; no CRM lead write |
| Quotation | `/quote` | **P** | Same simulated form; no Sales quote CQRS |
| Projects (public) | `/projects`, `/:id` | **P** | Fixture projects |
| About / Story / Leadership | yes | **I** | CMS-like static pages |
| Services | — | **M** | No public services landing |
| Manufacturing (brand) | `/manufacturing` | **I** | Brand story; not ERP manufacturing |
| Company hub | `/about` as “Company” nav | **Partial** | Nav label “Company” → About; no company mega |
| Contact | `/contact` | **I** + **P** form | |
| Journal | `/blog` | **P** | Single static page; no article routes |
| News | `/news` | **P** | List of 3 fixture items; no detail URLs |
| Downloads | — | **R / M** | Links to `/catalogue.pdf` (may 404); no downloads library |
| Support | — | **M** | Chat stub + FAQ only |
| FAQ | `/faq` | **I** | Accordion fixtures |
| Careers / Partners / Distributors | yes | **I** | Static |
| Book Demo | `/demo` | **P** | Simulated form |
| Request Quote | `/quote` | **P** | Simulated form |
| Privacy / Terms | yes | **I** | Static legal copy |
| Sitemap / Robots | `public/` | **Partial** | Exists; incomplete product URLs; example domain |

---

## 2. Hierarchical furniture taxonomy (mega-menu reference)

**Vision reference:** premium furniture sites (BMS / Herman Miller / Steelcase / Knoll / Haworth / Workspace.ae style) with **ALL FURNITURE** mega menu and deep subcategory pages.

**Current:** mega menu label is **“Collections”** with 3 lines + 5 flat categories (`Lounge`, `Dining`, `Workspace`, `Bedroom`, `Storage`). **No** Sofas/Beds/Tables/Chairs subcategory tree.

| Reference page | Status | Detail |
|---|---|---|
| ALL FURNITURE (hub) | **M** | Not present |
| Sofas (and Fabric/Leather/Sectional/Corner/Recliners/Modular/Chaise) | **M** | No routes, no products, no SEO pages |
| Beds (Upholstered/King/Queen/Benches) | **M** | Only one fixture bed SKU under Bedroom |
| Tables (Coffee/Side/Dining/Bedside/Console/Small) | **M** | One dining table fixture |
| Chairs (Armchairs/Accent/Dining) | **M** | One lounge chair fixture |
| Storage (TV/Wall/Sideboards/Bookcases/Chests) | **M** | One sideboard fixture; category exists flat |

### Gap record — taxonomy pages

| Field | Value |
|---|---|
| **Current status** | Missing entirely (no routes, no CMS taxonomy, no products per leaf) |
| **Why it matters** | SEO crawl depth, shopper mental model, conversion parity with premium furniture sites |
| **Recommended implementation** | Authoritative category tree in Commerce/CMS; public routes `/furniture/:l1/:l2?`; mega menu generated from taxonomy; List/read models Policy-scoped for B2B later |
| **Dependencies** | RC11 catalogue data; DAM media; Search index; Seo component extension; **no** Policy redesign |
| **Priority** | **Critical** |

---

## 3. Cross-cutting CX capabilities

| Capability | Status | Gap summary |
|---|---|---|
| Live catalogue from backend | **M** (UI) / **Partial** (backend inventory exists for ops) | Marketing uses fixtures only |
| Faceted filters + sort | **Partial** | Category/collection chips only |
| Global search (commerce) | **P** | Fixture modal; Search CQRS is enterprise `/app/search` |
| Wishlist / Compare | **M** | |
| Budget planner / room estimator | **M** | RC10 territory |
| Amazon-style gallery | **M** | Static thumbs, non-interactive |
| 360° / 3D viewer | **M** | Booklet labels “360°” without viewer |
| AI furniture consultant | **M** | Marketing “Live chat” stub; `/app/ai` is staff simulated AI |
| Lead → CRM | **M** | Form does not POST |
| Quote → Sales | **M** | |
| Product structured data | **Partial** | Org JSON-LD only; no Product schema |
| Breadcrumbs | **M** | |
| Empty / loading / error states (catalogue) | **Partial** | Page skeleton exists; catalogue has no empty filter state UI |
| Mobile mega UX | **Partial** | Toggle nav; mega collapses poorly vs premium apps |
| Premium motion system | **Partial** | Custom CSS; inconsistent; see doc 10 |

---

## 4. Backend vs customer UI (important)

RC7 delivered **enterprise** CQRS for inventory, CRM, manufacturing, etc. That does **not** equal customer storefront truth.

| Backend area | Customer use today |
|---|---|
| Inventory / DAM / Search / Sales quotes | **Not wired** to marketing catalogue/PDP |
| CRM leads | **Not** written by `InquiryForm` |
| Notifications | App module only |
| CMS Content CQRS | **Not** driving marketing pages (static `SITE_PAGES`) |

### Gap — conversion path

| Field | Value |
|---|---|
| **Current status** | Presentation-only inquiry/quote/demo/newsletter |
| **Why it matters** | Without CRM/Sales capture, marketing generates zero operational pipeline |
| **Recommended implementation** | Public command adapters → CRM Lead / Sales Quote under Policy; consent + audit; keep Workflow for quote lifecycle |
| **Dependencies** | RC5 Policy; RC6 quote workflow; RC7 CRM/Sales handlers; RC13 consent |
| **Priority** | **Critical** |

---

## 5. Defects found during audit (document only)

| ID | Issue | Severity |
|---|---|---|
| CX-D1 | Unknown `/products/:productId` falls back to first product instead of 404 | High |
| CX-D2 | Product schema.org type set in Seo props but JSON-LD always Organization | Medium |
| CX-D3 | Booklet/PDF “360° material study” and Downloads imply assets that are not interactive/real | Medium |
| CX-D4 | Category filter ids work, but taxonomy depth is marketing-shallow vs vision | Critical (scope) |

---

## 6. Summary verdict

**Customer experience is Incomplete.** Brand storytelling pages are largely present as static routes. Commerce-grade discovery, PDP media, conversion, and AI consultant journeys are **missing or placeholder**. Phase A must treat marketing fixtures as disposable presentation, not production catalogue.
