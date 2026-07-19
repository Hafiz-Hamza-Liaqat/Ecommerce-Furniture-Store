# RC8.0A — Customer Experience Audit Expanded

- **Document type:** Implementation blueprint (documentation only)
- **Created:** 2026-07-19
- **Status:** Expanded audit complete — **RC8.1 not started**
- **Supersedes for checklist depth:** `docs/rc8/*` (RC8.0 gap audit ~9.5/10)
- **Baseline:** RC7.7 backend complete (`05032df`); marketing site = presentation fixtures
- **Authority:** This pack + sibling RC8.0A docs are the **master checklist** before any customer-facing implementation

## Non-negotiables

| Rule | Status |
|---|---|
| No code / packages / UI / API / schema changes in this phase | **Observed** |
| No commit | **Observed** |
| Do not start RC8.1 | **Observed** |
| Do not redesign RC7.1, Policy, Workflow, Approval, CQRS | **Preserved** |

## Architecture consumption (future RC8.1+)

| Concern | Owner |
|---|---|
| Authorization | Policy Engine only |
| Lifecycle / quote / order status | Workflow Engine |
| Approvals | Approval Engine |
| Media / downloads / spin frames | DAM |
| Search indexes | Search (read model) |
| Costing / package estimates | Rules Engine |
| Catalogue / SKU truth | Commerce + Inventory (not marketing fixtures) |
| Leads | CRM |
| Quotations | Sales |
| List paging (authenticated lists) | RC7.1 `buildAuthorizedListPage` |

---

# 1. Mega navigation & category journey audit

## 1.1 Current state (verified)

| Element | Today |
|---|---|
| Mega label | “Collections” (not “Furniture” / “All Furniture”) |
| Mega depth | 3 collection lines + 5 flat categories |
| Categories | Lounge, Dining, Workspace, Bedroom, Storage |
| L2 pages | **None** |
| Journey per category | Query chip on `/products?category=` only |

## 1.2 Required taxonomy (implementation checklist)

Every node below must eventually support a **complete customer journey** (see §1.3).

### L0 — Furniture (All Furniture)

### L1 — Lifestyle / room

| L1 | Example L2 (non-exhaustive) |
|---|---|
| Living Room | Sofas, Coffee Tables, Side Tables, TV Units, Cabinets, Bookcases, Shelving, Lighting, Accessories |
| Dining | Dining Tables, Dining Chairs, Sideboards, Consoles, Lighting |
| Bedroom | Beds, Wardrobes, Bedside Tables, Benches, Storage, Lighting |
| Office | Workstations, Executive, Conference, Reception, Storage, Lighting, Accessories |
| Outdoor | (future merchandising set — flag if not in V1 catalogue) |
| Storage | Cabinets, Bookcases, Shelving, Wardrobes, TV Units, Chests |

### L1 — Product families (also required as mega columns / cross-links)

| Family | Children |
|---|---|
| Sofas | Fabric, Leather, Sectional, Corner, Recliners, Modular, Chaise |
| Beds | Upholstered, King, Queen, Benches |
| Tables | Coffee, Side, Dining, Bedside, Console, Small |
| Chairs | Armchairs, Accent, Dining, Executive, Conference |
| Storage | TV Units, Cabinets, Bookcases, Shelving, Wardrobes, Sideboards |
| Workplace programs | Reception, Conference, Executive, Workstations |
| Accessories | Lighting, soft accessories (as merchandised) |

> **Note:** Living Room vs Sofas may overlap; taxonomy must use canonical IDs with aliases for SEO URLs.

## 1.3 Per-category journey checklist (apply to EVERY L1/L2)

For each category node, verify / implement:

| Capability | Current (all nodes) | Required |
|---|---|---|
| Category page (`/furniture/...`) | **Missing** | Yes |
| Landing / hero + merchandising | **Missing** | Yes |
| Product listing | **Partial** (global `/products` only) | Yes |
| Breadcrumbs | **Missing** | Yes |
| Filters | **Partial** (category/collection chips) | Full facets |
| Sorting | **Missing** | Yes |
| Search integration | **Partial** (global fixture modal) | Scoped + global |
| Pagination | **Missing** | Yes |
| Product count | **Missing** | Yes |
| Featured collections | **Missing** on category | Yes |
| Related categories | **Missing** | Yes |
| CMS promotional blocks | **Missing** | Yes |
| SEO metadata | **Missing** per category | Yes |
| Structured data (CollectionPage / ItemList) | **Missing** | Yes |
| Empty states | **Missing** | Yes |
| Error states | **Missing** | Yes |
| Mobile experience | **Partial** | Dedicated drawer + listing UX |

### Gap record — category journeys

| Field | Value |
|---|---|
| **Current status** | Missing entirely for all L2; L1 only as query filters |
| **Why it matters** | Premium furniture sites convert via deep taxonomy + SEO landings |
| **Recommended implementation** | Authoritative taxonomy → generate mega + routes + listing read model |
| **Dependencies** | Catalogue attributes; CMS blocks; Search facets; Seo |
| **Priority** | **Critical** (RC8.1) |

## 1.4 Missing pages inventory (navigation-driven)

| Page type | Status |
|---|---|
| `/furniture` hub | Missing |
| All L1 landings | Missing |
| All L2 landings | Missing |
| `/collections/:slug` hub pages | Missing (query only) |
| `/support`, `/services`, `/downloads` | Missing |
| `/wishlist`, `/compare` | Missing |
| `/planner` (budget) | Missing |
| `/consultant` (AI) | Missing |

---

# 2. Product Finder / Budget Planner audit (expanded)

## 2.1 Vision scenario

Customer enters: **“I have PKR 500,000”** (or 2,000,000 for larger programs).

Planner recommends **packages**, not single SKUs only.

### Example package — Executive Office

| Line | Role |
|---|---|
| Desk | Primary |
| Chair | Primary |
| Meeting table | Supporting |
| Cabinet | Storage |
| Reception | Optional program add-on |
| Lighting | Ambient |
| Accessories | Completers |

### Required outputs

| Output | Status |
|---|---|
| Recommended furniture package | **Missing** |
| Line items with quantities | **Missing** |
| Estimated total | **Missing** |
| Remaining budget | **Missing** |
| Budget utilization % | **Missing** |
| Alternative packages | **Missing** |
| Premium upgrade suggestions | **Missing** |
| Economy alternatives | **Missing** |
| Save plan | **Missing** |
| Export PDF | **Missing** |
| Convert to quotation | **Missing** |
| Generate inquiry | **Missing** |
| Future AI integration hook | **Missing** (roadmap) |

### End-use presets (required)

Office · Hospital · School · University · Restaurant · Hotel · Home · Coworking · Clinic · Government · Reception · Conference · Executive · Workstation cluster

### Inputs (required)

| Input | Status |
|---|---|
| Budget (PKR) | Missing |
| Room size / dimensions | Missing |
| Employee / seat count | Missing |
| Department / end use | Missing |
| Style (Modern / Executive / …) | Missing |
| Must-have categories | Missing |

### Gap record

| Field | Value |
|---|---|
| **Current status** | Missing entirely |
| **Why it matters** | Core B2B conversion; turns budget anxiety into packages + quotes |
| **Recommended implementation** | Deterministic Rules Engine estimators; UI wizard; outputs draft Sales quote / CRM inquiry; PDF via Reporting+DAM; never browser-only costing as truth |
| **Dependencies** | RC10 rules; RC11 catalogue pricing; Sales quote CQRS; Workflow; Policy; Notifications |
| **Priority** | **Critical** (RC8.1 core; AI assist later) |

---

# 3. AI Furniture Consultant audit (not a generic chatbot)

## 3.1 Role definition

**AI Furniture Consultant** = experienced showroom consultant: asks clarifying questions, proposes packages, explains trade-offs, and hands off to sales — **never** invents prices or stock outside governed data.

Public “Live chat” today is a **stub** (message + Contact link). Staff `/app/ai` is a **separate simulated** enterprise surface.

## 3.2 Example conversational flow (required)

1. Customer: “I have a 20×15 office.”  
2. AI: “How many employees?”  
3. Customer: “12”  
4. AI: “Modern or Executive?”  
5. Customer: “Modern”  
6. AI: “Budget?”  
7. Customer: “2 million”  
8. AI generates: package, desks, chairs, conference, storage, reception, color palette, estimated cost, alternatives, lead capture, quote request, WhatsApp handoff, live sales escalation, CRM write, appointment scheduling.

## 3.3 Conversational capability matrix

| Capability | Status |
|---|---|
| Multi-turn discovery (size → headcount → style → budget) | **Missing** |
| Furniture package generation | **Missing** |
| Desk / chair / conference / storage / reception recommendations | **Missing** |
| Color / material palette suggestions (grounded) | **Missing** |
| Estimated cost (from Rules/catalogue) | **Missing** |
| Alternative options (economy / premium) | **Missing** |
| Lead generation (CRM) | **Missing** |
| Request quotation (Sales) | **Missing** |
| WhatsApp handoff | **Partial** (static `wa.me` only) |
| Live sales escalation | **Partial** (contact form) |
| CRM integration | **Missing** |
| Appointment scheduling | **Missing** (`/demo` simulate only) |
| Save / resume conversation | **Missing** |
| Citations to real products | **Missing** |
| Refuse / escalate when data insufficient | **Missing** |
| Multi-language | **Missing** (future) |
| Consent & audit of AI advice | **Missing** |

### Gap record

| Field | Value |
|---|---|
| **Current status** | Missing as consultant; stub chat only |
| **Why it matters** | Highest-intent guided selling for furniture B2B/B2C |
| **Recommended implementation** | Server AI gateway; retrieval over published catalogue + Search; actions only via CRM/Sales/Notifications commands under Policy; human-in-loop for quotes |
| **Dependencies** | Catalogue truth; Search; RC9 AI governance; Budget Planner packages; consent (RC13) |
| **Priority** | **High** (shell + handoff in RC8.1; full intelligence after catalogue grounding) |

---

# 4. Product gallery audit (premium benchmark)

## 4.1 Benchmarks

Amazon · Apple · IKEA · Herman Miller · Steelcase

## 4.2 Capability matrix

| Capability | Current | Target |
|---|---|---|
| Zoom | Missing | Required |
| Magnifier / lens | Missing | Required |
| Fullscreen | Missing | Required |
| Keyboard navigation | Missing | Required |
| Swipe | Missing on PDP | Required |
| Touch gestures | Missing on PDP | Required |
| Mouse wheel (zoom/gallery) | Missing | Recommended |
| Responsive layout | Partial CSS | Required |
| Lazy loading | Partial | Required |
| Image preloading (adjacent) | Missing | Required |
| Videos | Missing | Required (hero SKUs) |
| 360° viewer entry | Missing | Required |
| PDF downloads | Placeholder link | Required via DAM |
| AR readiness | Missing | Future hook only |
| Thumbnail synchronization | Missing (static) | Required |
| Gallery responsiveness | Partial | Required |
| Image optimization (srcset/AVIF) | Missing | Required |
| Loading placeholders | Missing on PDP | Required |
| Error handling (broken asset) | Missing | Required |

### Gap record

| Field | Value |
|---|---|
| **Current status** | Non-interactive placeholder thumbs |
| **Why it matters** | Furniture decisions are visual; competitors treat gallery as PDP core |
| **Recommended implementation** | DAM-backed `ProductGallery`; roles: hero, detail, lifestyle, video, spin |
| **Dependencies** | DAM RC7.5; catalogue media model; CDN |
| **Priority** | **Critical** (RC8.1) |

---

# 5. Terminology: 360° Product Viewer vs 360° Product Audit

| Term | Meaning | Audience |
|---|---|---|
| **A. 360° Product Viewer** | Customer-facing interactive spin / 3D on PDP | Shoppers |
| **B. 360° Product Audit** | Holistic project review of the product (this documentation practice) | Team / reviewers |

These must **never** be conflated in specs, tickets, or UI copy.

## 5.1 360° Product Viewer (customer feature) — required

| Capability | Status |
|---|---|
| Image sequence (ordered frames) | **Missing** |
| GLB / 3D support | **Missing** (future) |
| Rotate | **Missing** |
| Mouse drag | **Missing** |
| Touch drag | **Missing** |
| Auto spin | **Missing** |
| Fullscreen | **Missing** |
| Responsive controls | **Missing** |
| Keyboard | **Missing** |
| Loading indicators | **Missing** |

Booklet text “Film · 360° material study” is **misleading** until Viewer ships.

### Gap record

| Field | Value |
|---|---|
| **Current status** | Missing; false labeling exists |
| **Why it matters** | Premium differentiator; finish confidence |
| **Recommended implementation** | Spin-first (24–36 frames in DAM); GLB later; `prefers-reduced-motion` → static + Play |
| **Dependencies** | DAM; ProductGallery slot; performance budget |
| **Priority** | **High** (hero SKUs in RC8.1) |

---

# 6. Hover interaction audit

## 6.1 Surfaces to unify

Buttons · Cards · Images · Categories · Mega menu · Navigation · Footer · Product cards · Wishlist · Compare · Gallery thumbnails · Dropdowns · Icons · CTA buttons

## 6.2 Current vs required

| Surface | Current | Gap |
|---|---|---|
| Nav / footer links | Basic color/underline | OK baseline |
| Product / category cards | Lift ~200ms | Missing image-swap, wishlist/compare affordances |
| Mega | Basic | Need clearer row hover + intent delay |
| Gallery thumbs | Non-interactive | **Missing** |
| Wishlist / Compare | N/A | **Missing controls** |
| CTAs | Transform/background | Standardize elevation/shadow |
| Booklet vs PDP | Booklet rich; PDP static | **Inconsistent brand** |

### Gap record

| Field | Value |
|---|---|
| **Current status** | Partial; uneven luxury signal |
| **Why it matters** | Hover is half of perceived polish |
| **Recommended implementation** | One hover token set (see Recommendations); apply site-wide |
| **Dependencies** | Motion system RC8.1 |
| **Priority** | **High** |

---

# 7. Premium motion system audit

## 7.1 Rule

**ONE** motion language. Do not mix Framer + GSAP + Lottie + ad-hoc CSS chaos.

## 7.2 Recommended language (canonical)

| Token | Value |
|---|---|
| Character | Premium, elegant, restrained, fast |
| Micro duration | 120–180ms |
| UI duration | 200–280ms |
| Section reveal | 400–600ms |
| Translate | **12–20px** fade-up |
| Image scale on hover | **1.02–1.04** |
| Elevation | Subtle lift + soft shadow |
| Easing | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Parallax | Minimal or none by default |
| Page transitions | Soft fade ≤200ms |
| Library | CSS tokens + optional **Motion One** only |

### Include

Fade-up reveals · elegant hover elevation · soft shadows · luxury section reveals · gentle card animations · smooth page transitions

### Exclude

Bounce, spin spam, heavy particles, multi-library stacks, fake long skeleton delays when data is local

### Gap record

| Field | Value |
|---|---|
| **Current status** | Custom CSS; booklet noisier than PDP |
| **Priority** | **High** (RC8.1) |

---

# 8. Product comparison audit

## 8.1 Required experience

Compare **2–4** products side-by-side.

| Column / attribute | Status |
|---|---|
| Dimensions | Missing |
| Materials | Missing |
| Finish | Missing |
| Color | Missing |
| Warranty | Missing |
| Price | Missing |
| Availability | Missing |
| Lead time | Missing |
| Downloads | Missing |
| Features | Missing |
| Related products | Missing |
| Export | Missing |
| Share | Missing |
| Add/remove from compare | Missing |
| Sticky header row | Missing |
| Mobile compare UX | Missing |

### Gap record

| Field | Value |
|---|---|
| **Current status** | Missing entirely (enterprise BI “compare” widgets are unrelated) |
| **Why it matters** | Specifiers choose between near-equivalent SKUs |
| **Recommended implementation** | Client compare tray → `/compare` table; optional account sync; export PDF via Reporting |
| **Dependencies** | Catalogue attributes; wishlist affinity |
| **Priority** | **High** (RC8.1) |

---

# 9. Room planner (future roadmap)

**Explicitly future scope** — not RC8.1 MVP unless capacity remains after Critical items.

| Planner | Status |
|---|---|
| Office Planner | Future |
| Bedroom Planner | Future |
| Meeting Room Planner | Future |
| Restaurant Planner | Future |
| Hotel Planner | Future |
| School Planner | Future |
| Hospital Planner | Future |
| AI layout recommendations | Future (post RC9 + catalogue) |

Budget Planner (§2) is the **near-term** estimator; Room Planner is **spatial layout** (different product).

---

# 10. End-to-end customer journey audit

```text
Visitor → Homepage → Mega Nav → Category → Search → Filters → Listing
  → PDP → Gallery → Zoom → 360° → Compare → Wishlist → Budget Planner
  → AI Consultant → Quotation → CRM Lead → Sales Follow-up
  → Order → Delivery → Feedback → Support
```

| Stage | UI | Actions | Dead ends / friction | Load / Error / A11y / Responsive |
|---|---|---|---|---|
| Visitor | Marketing shell | Browse | Console in primary nav distracts | Cookie accept-only |
| Homepage | **Present** | Catalogue/Demo CTAs | Booklet implies 360 falsely | Reveal OK; reduced-motion partial |
| Mega Nav | **Partial** | Shallow links | No L2 journey | Mobile flat list |
| Category | **Missing** | — | Forced to generic `/products` | — |
| Search | **Placeholder** | Fixture match | No commerce index | Dialog a11y partial |
| Filters | **Partial** | Chips only | No facets/sort/count | — |
| Listing | **Placeholder** | Open PDP | Empty filter silent | No pagination |
| PDP | **Placeholder** | Inquiry simulate | Soft-404 to first product | Specs OK |
| Gallery | **Missing** | — | Static images | — |
| Zoom | **Missing** | — | — | — |
| 360° Viewer | **Missing** | — | Misleading booklet label | — |
| Compare | **Missing** | — | Dead end | — |
| Wishlist | **Missing** | Booklet fav ephemeral | Dead end | — |
| Budget Planner | **Missing** | — | Dead end | — |
| AI Consultant | **Missing** | Chat stub | No consultative path | — |
| Quotation | **Placeholder** | Form simulate | No Sales quote | — |
| CRM Lead | **Missing** | — | Pipeline break | — |
| Sales Follow-up | Enterprise only | — | No customer visibility | — |
| Order | Portal fixture | — | Not wired | Phase RC8.2/RC13 |
| Delivery | Missing CX | — | — | Later |
| Feedback | Missing | — | — | Later |
| Support | FAQ only | WhatsApp | No support hub | — |

---

# 11. Execution roadmap (restructured)

Replaces prior Phase A/B/C naming for delivery planning:

| Release | Name | Focus |
|---|---|---|
| **RC8.1** | Customer Experience | Mega, categories, gallery, 360 Viewer, wishlist, compare, filters, budget planner, search, motion, AI consultant shell, public polish |
| **RC8.2** | Enterprise Workspace | Dashboards, CRUD, settings, reports, admin, DAM/collaboration/jobs UI, notifications, roles, profiles, org/workspace |
| **RC8.3** | Production Quality | A11y, performance, SEO, states, dialogs, shortcuts, dark mode, cross-browser, regression, E2E |
| **RC8.4** | Release Readiness | Final audits, security, docs, sign-off, production commit |

Detail: `RC8.0A-roadmap-restructure.md`.

---

## Master verdict

RC8.0 correctly identified gaps. **RC8.0A** expands them into an authoritative **implementation checklist**. Customer experience is **not ready for a completion claim**. **Do not start RC8.1** until this pack is accepted.
