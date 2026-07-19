# 08 — Responsive Audit

- **Audit ID:** RC8.0-CX-08
- **Evidence:** `marketing.css` breakpoints (`max-width: 980px`), component layouts

## 1. Viewport matrix

| Viewport | Status | Notes |
|---|---|---|
| Desktop (≥1200) | **Partial** | Brochure layouts work; mega shallow |
| Laptop (1024–1440) | **Partial** | Same |
| Tablet (~768–980) | **Partial** | Nav collapses at 980; grids go 1-col |
| Mobile (<768) | **Partial** | Usable; mega/PDP/gallery weak |
| Ultra-wide (>1600) | **Partial** | Content max-width helps; hero may feel sparse |
| Landscape mobile | **Partial** | Not specially tuned |
| Portrait mobile | **Partial** | Default path |

## 2. Surface-specific findings

| Surface | Responsive issues |
|---|---|
| Header / mega | Mobile mega is stacked list — not a shop drawer with L1→L2 |
| Product grid | Stacks; cards OK |
| PDP | Gallery above info; no swipe gallery; thumbs cramped |
| Booklet | Spread becomes single column; drag still works |
| Forms | Stack labels; OK |
| Search modal | Full overlay; OK |
| Sticky floats | WhatsApp + chat + top may collide on small screens |

## 3. Gap records

### Mobile shop navigation

| Field | Value |
|---|---|
| **Current status** | Partial — hamburger opens flat links |
| **Why it matters** | Majority of catalogue browsing is mobile |
| **Recommended implementation** | Full-screen mobile nav with taxonomy accordion + sticky Quote CTA |
| **Dependencies** | Taxonomy (doc 02) |
| **Priority** | **Critical** |

### Touch PDP media

| Field | Value |
|---|---|
| **Current status** | Missing swipe/pinch gallery |
| **Why it matters** | Parity with Amazon/Apple mobile PDP |
| **Recommended implementation** | Touch gestures in ProductGallery (doc 04) |
| **Dependencies** | Gallery component |
| **Priority** | **Critical** |

### Ultra-wide / density

| Field | Value |
|---|---|
| **Current status** | Partial |
| **Why it matters** | Premium brands use cinematic but controlled measure |
| **Recommended implementation** | Explicit content measure tokens; optional dual-pane PDP on xl |
| **Dependencies** | Design tokens |
| **Priority** | **Medium** |

## 4. Verdict

Basic responsive brochure behavior exists via one breakpoint. Commerce-grade mobile UX (taxonomy drawer, gallery gestures, non-colliding utilities) is **not** complete.
