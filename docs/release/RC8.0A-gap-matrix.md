# RC8.0A — Gap Matrix

- **Created:** 2026-07-19
- **Purpose:** Master gap register for RC8.1 checklist (documentation only)
- **Status codes:** I = Implemented · P = Placeholder/presentation · B = Backend only · M = Missing · F = Future · D = Defect

---

## A. Taxonomy & navigation journeys

| ID | Item | Status | Notes | Target |
|---|---|---|---|---|
| G-NAV-01 | Furniture / All Furniture hub | M | | RC8.1 |
| G-NAV-02 | Mega menu L1/L2 taxonomy | M | Collections mega only | RC8.1 |
| G-NAV-03 | Living Room journey complete | M | | RC8.1 |
| G-NAV-04 | Dining journey complete | M | Flat chip only | RC8.1 |
| G-NAV-05 | Bedroom journey complete | M | | RC8.1 |
| G-NAV-06 | Office / workplace journeys | M | Workspace chip only | RC8.1 |
| G-NAV-07 | Outdoor journey | M/F | Confirm catalogue | RC8.1/F |
| G-NAV-08 | Storage journey complete | M | Flat chip | RC8.1 |
| G-NAV-09 | Sofas + subtypes pages | M | | RC8.1 |
| G-NAV-10 | Beds + subtypes pages | M | | RC8.1 |
| G-NAV-11 | Tables + subtypes pages | M | | RC8.1 |
| G-NAV-12 | Chairs + subtypes pages | M | | RC8.1 |
| G-NAV-13 | TV/Cabinets/Bookcases/Shelving/Wardrobes | M | | RC8.1 |
| G-NAV-14 | Reception/Conference/Executive/Workstations | M | | RC8.1 |
| G-NAV-15 | Accessories / Lighting pages | M | | RC8.1 |
| G-NAV-16 | Per-category: breadcrumbs | M | | RC8.1 |
| G-NAV-17 | Per-category: filters/sort/search/paging/count | M/P | | RC8.1 |
| G-NAV-18 | Per-category: featured + related + CMS blocks | M | | RC8.1 |
| G-NAV-19 | Per-category: SEO + structured data | M | | RC8.1 |
| G-NAV-20 | Per-category: empty/error/mobile | M/P | | RC8.1 |
| G-NAV-21 | Mobile taxonomy drawer | P | Hamburger flat list | RC8.1 |
| G-NAV-22 | Hover intent + keyboard mega | P | | RC8.1 |

---

## B. Listing, search, filters

| ID | Item | Status | Target |
|---|---|---|---|
| G-CAT-01 | Live catalogue (non-fixture) | P | RC8.1 |
| G-CAT-02 | Faceted filters (material/finish/price/…) | M | RC8.1 |
| G-CAT-03 | Sort modes | M | RC8.1 |
| G-CAT-04 | Pagination + product count | M | RC8.1 |
| G-CAT-05 | Public search typeahead | P | RC8.1 |
| G-CAT-06 | Synonyms / saved / recent search | M/F | RC8.1/F |
| G-CAT-07 | Empty listing state | M | RC8.1 |

---

## C. PDP, gallery, 360 Viewer

| ID | Item | Status | Target |
|---|---|---|---|
| G-PDP-01 | Hard 404 for unknown SKU | D | RC8.1 |
| G-PDP-02 | Breadcrumbs | M | RC8.1 |
| G-PDP-03 | Product JSON-LD | M | RC8.1 |
| G-PDP-04 | Variants / finishes | M | RC8.1 |
| G-PDP-05 | Availability / lead time | M | RC8.1 |
| G-PDP-06 | Amazon-style gallery | M | RC8.1 |
| G-PDP-07 | Zoom / magnifier / fullscreen | M | RC8.1 |
| G-PDP-08 | Keyboard / swipe / touch / wheel | M | RC8.1 |
| G-PDP-09 | Lazy / preload / placeholders / errors | P/M | RC8.1 |
| G-PDP-10 | Video support | M | RC8.1 |
| G-PDP-11 | Image optimization pipeline | M | RC8.1 |
| G-PDP-12 | **360° Product Viewer** (customer) | M | RC8.1 |
| G-PDP-13 | Sequence rotate/drag/auto-spin/FS/a11y | M | RC8.1 |
| G-PDP-14 | GLB 3D | F | Future |
| G-PDP-15 | AR readiness hooks | F | Future |
| G-PDP-16 | Remove false “360°” booklet labeling | D | RC8.1 |
| G-PDP-17 | DAM-backed downloads (PDF/CAD) | P | RC8.1 |
| G-PDP-18 | Related / recently viewed / cross-sell | P/M | RC8.1 |

---

## D. Consideration set

| ID | Item | Status | Target |
|---|---|---|---|
| G-CMP-01 | Compare 2–4 products | M | RC8.1 |
| G-CMP-02 | Compare attributes matrix | M | RC8.1 |
| G-CMP-03 | Compare export / share | M | RC8.1 |
| G-WSH-01 | Wishlist | M | RC8.1 |
| G-WSH-02 | Account sync wishlist | M | RC8.1 |

---

## E. Budget / Product Finder

| ID | Item | Status | Target |
|---|---|---|---|
| G-BUD-01 | Budget input (PKR) | M | RC8.1 |
| G-BUD-02 | End-use + headcount + room size inputs | M | RC8.1 |
| G-BUD-03 | Package recommendations | M | RC8.1 |
| G-BUD-04 | Remaining budget + utilization % | M | RC8.1 |
| G-BUD-05 | Premium / economy alternatives | M | RC8.1 |
| G-BUD-06 | Save plan | M | RC8.1 |
| G-BUD-07 | Export PDF | M | RC8.1 |
| G-BUD-08 | Convert to quotation | M | RC8.1 |
| G-BUD-09 | Generate inquiry | M | RC8.1 |
| G-BUD-10 | AI assist on planner | F | Post-8.1 / RC9 |

---

## F. AI Furniture Consultant

| ID | Item | Status | Target |
|---|---|---|---|
| G-AI-01 | Multi-turn showroom discovery | M | RC8.1 shell / RC9 full |
| G-AI-02 | Package + palette + cost (grounded) | M | RC8.1/RC9 |
| G-AI-03 | CRM lead write | M | RC8.1 |
| G-AI-04 | Quote request action | M | RC8.1 |
| G-AI-05 | WhatsApp handoff (contextual) | P | RC8.1 |
| G-AI-06 | Live sales escalation | P | RC8.1 |
| G-AI-07 | Appointment scheduling | P | RC8.1 |
| G-AI-08 | Save conversation | M | RC8.1/RC9 |
| G-AI-09 | Replace generic “Live chat” branding | P | RC8.1 |

---

## G. Conversion & post-purchase journey

| ID | Item | Status | Target |
|---|---|---|---|
| G-CNV-01 | Inquiry → CRM | M | RC8.1 |
| G-CNV-02 | Quote → Sales + Workflow | P/M | RC8.1 |
| G-CNV-03 | Newsletter → consented store | P | RC8.1 |
| G-JOY-01 | Order visibility (customer) | P | RC8.2 / RC13 |
| G-JOY-02 | Delivery / install tracking | M | Later |
| G-JOY-03 | Feedback / reviews | M | Later |
| G-JOY-04 | Support hub | M | RC8.1 page / RC13 ops |

---

## H. Motion, hover, responsive, a11y, SEO

| ID | Item | Status | Target |
|---|---|---|---|
| G-MOT-01 | Single premium motion system | P | RC8.1 |
| G-HOV-01 | Unified hover language site-wide | P | RC8.1 |
| G-RSP-01 | Mobile shop + gallery gestures | P/M | RC8.1 |
| G-A11Y-01 | Mega/gallery keyboard + alts | P | RC8.1 / RC8.3 |
| G-SEO-01 | Category/product sitemap completeness | P | RC8.1 / RC8.3 |
| G-SEO-02 | CollectionPage / Product / BreadcrumbList | M | RC8.1 |

---

## I. Room planner (future)

| ID | Item | Status | Target |
|---|---|---|---|
| G-ROOM-01 | Office/Bedroom/Meeting/… planners | F | Future |
| G-ROOM-02 | AI layout recommendations | F | Future |

---

## J. Enterprise & quality (register only)

| ID | Item | Status | Target |
|---|---|---|---|
| G-ENT-* | Dashboards/CRUD/admin/DAM/jobs/roles/… | Mixed | RC8.2 |
| G-QA-* | Perf/a11y/SEO/E2E/cross-browser | Partial | RC8.3 |
| G-REL-* | Security/sign-off/release commit | Pending | RC8.4 |

---

## Terminology lock

| Term | Meaning |
|---|---|
| **360° Product Viewer** | Customer spin/3D feature (G-PDP-12+) |
| **360° Product Audit** | Holistic documentation review practice — **not** a UI feature |

---

## Counts (approximate)

| Status | Count (A–I) |
|---|---|
| Missing (M) | Vast majority of CX rows |
| Placeholder (P) | Marketing shell, chips, forms, chat stub |
| Defect (D) | Soft-404 PDP; false 360 label |
| Future (F) | Room planners, GLB/AR, deep AI |

**Conclusion:** Gap matrix confirms RC8.1 is a full CX build-out, not a polish pass.
