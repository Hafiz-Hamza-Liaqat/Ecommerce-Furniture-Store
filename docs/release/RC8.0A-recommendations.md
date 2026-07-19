# RC8.0A — Recommendations

- **Created:** 2026-07-19
- **Status:** Guidance only — **no implementation in this phase**
- **Audience:** RC8.1 implementers after audit acceptance

---

## 1. How to use this pack

1. Treat `RC8.0A-customer-experience-audit-expanded.md` as the narrative blueprint.  
2. Track work against `RC8.0A-gap-matrix.md` IDs.  
3. Sequence with `RC8.0A-priority-matrix.md` waves.  
4. Plan releases with `RC8.0A-roadmap-restructure.md` (RC8.1→8.4).  
5. Keep `docs/rc8/*` as the original RC8.0 evidence pack.

**Do not start RC8.1 until stakeholders accept this expansion.**

---

## 2. Architecture recommendations (mandatory)

| Do | Do not |
|---|---|
| Drive catalogue from Commerce/Inventory publish pipeline | Keep Unsplash fixtures as production truth |
| Authorize with Policy only | Add parallel ACL/RLS for storefront |
| Quotes/orders via Sales + Workflow | Set status in UI components |
| Media/spin/PDF via DAM | Hotlink unmanaged binaries forever |
| Estimates via Rules Engine | Hard-code package math only in React |
| Search as read model for typeahead | Make Search a business owner |
| Reuse RC7.1 list patterns for authenticated lists | Fork paging/total semantics |

---

## 3. Mega navigation & category journeys

**Recommend:**

- Single canonical taxonomy graph (IDs stable; URL slugs localized later).  
- Mega generated from taxonomy (no hard-coded duplicate trees).  
- Every L2 gets: landing + listing + breadcrumbs + facets + count + SEO + empty/error.  
- Mobile: full-screen drawer with accordion L1→L2 + sticky Request Quote.  
- Hover intent (~100ms) + keyboard disclosure pattern (Escape closes, focus trap optional).

**Honesty:** Outdoor / sparse branches — hide or mark “Coming soon” rather than empty SEO traps.

---

## 4. Budget / Product Finder

**Recommend MVP (RC8.1):**

1. Wizard: end-use → seats/size → style → budget (PKR).  
2. Rules returns ranked packages with line SKUs + qty + estimate.  
3. UI shows total, remaining budget, utilization %.  
4. Actions: save (account or local), export PDF (Reporting+DAM), create inquiry, draft quote.  
5. Premium / economy toggles as alternate Rule scenarios.

**Defer:** Full spatial room layout AI (see §9 future).

---

## 5. AI Furniture Consultant

**Recommend positioning:** Showroom consultant, not “chatbot.”

**MVP conversation contract:**

- Collect: space, headcount, style, budget, constraints.  
- Propose: grounded package + alternatives + palette from catalogue attributes.  
- Act: CRM lead, quote request, WhatsApp deep link with context, appointment (`/demo` real), escalate to human.  
- Guardrails: no invented price/stock; cite product IDs; Policy on all writes; audit prompts/responses.

**Staging:** Ship UX shell + deterministic package engine first; swap in model gateway when RC9-ready.

**Copy:** Retire generic “Live chat” label when consultant ships.

---

## 6. Gallery & 360° Product Viewer

**Recommend component split:**

| Component | Responsibility |
|---|---|
| `ProductGallery` | Thumbs, zoom, magnifier, fullscreen, keyboard, swipe, video |
| `ProductSpinViewer` | Frame sequence / future GLB — **360° Product Viewer** |

**Terminology lock:** Never call documentation reviews “360 Viewer.” Never call the viewer a “360 audit.”

**Performance:** Lazy-load spin on tab open; LQIP; srcset/AVIF; preload neighbors only.

**Content ops:** Relabel booklet “360° material study” until Viewer exists.

---

## 7. Hover & motion (one system)

**Motion language:**

- Fade-up 12–20px, 400–600ms section reveals  
- Hover scale 1.02–1.04 + soft shadow  
- Durations 120–280ms UI; easing `cubic-bezier(0.22, 1, 0.36, 1)`  
- Optional Motion One for orchestration only  
- Honor `prefers-reduced-motion`

**Hover:** One token set applied to buttons, cards, mega rows, thumbs, CTAs, icons — no one-off booklet physics on PDP.

**Avoid:** GSAP+Framer+Lottie stacks; particle spam; bounce.

---

## 8. Compare & wishlist

**Recommend:**

- Compare tray (max 4) → `/compare` matrix (dimensions, materials, finish, color, warranty, price, availability, lead time, downloads, features).  
- Export/share from compare.  
- Wishlist heart on cards/PDP; localStorage → account merge on login.  
- Do not confuse with enterprise analytics “compare” widgets.

---

## 9. Future — Room planners

Document as **future roadmap**, separate from Budget Finder:

Office · Bedroom · Meeting · Restaurant · Hotel · School · Hospital + AI layout recommendations.

Requires mature catalogue, accurate dimensions, and likely RC9 — **not** RC8.1 P0.

---

## 10. Customer journey wiring

**Minimum happy path for RC8.1 exit:**

Visitor → Home → Mega → Category → Filters → Listing → PDP (gallery/zoom/360) → Compare/Wishlist → Budget Planner and/or AI Consultant → Inquiry/Quote → CRM/Sales follow-up.

**Post-purchase** (Order → Delivery → Feedback → Support) largely **RC8.2 / RC13** — provide Support hub page in RC8.1 as presence, deep ops later.

---

## 11. Execution recommendations

| Phase | Recommendation |
|---|---|
| RC8.1 | Execute priority waves W1→W6; freeze taxonomy early |
| RC8.2 | Parallelize only after W1–W2 APIs/contracts stable |
| RC8.3 | Start quality instrumentation during RC8.1, hard-gate before RC8.4 |
| RC8.4 | No production commit without security + E2E + sign-off |

---

## 12. Definition of “done” for Customer Experience (RC8.1)

RC8.1 may be called complete only when:

- [ ] All P0 items closed or formally waived  
- [ ] Category journeys exist for agreed taxonomy set  
- [ ] Gallery meets zoom/fullscreen/touch/keyboard bar  
- [ ] 360° Product Viewer ships for ≥1 hero collection **or** all false 360 claims removed  
- [ ] Budget Finder produces packages with remaining % and quote/inquiry actions  
- [ ] AI Consultant is showroom-capable at least via grounded packages + handoff  
- [ ] Compare + wishlist usable  
- [ ] Conversion writes CRM/Sales under Policy  
- [ ] Fixtures not presented as production catalogue  

---

## 13. Stop

This recommendations document authorizes **planning**, not coding.  
**Do not implement. Do not commit. Do not start RC8.1** until explicitly approved.
