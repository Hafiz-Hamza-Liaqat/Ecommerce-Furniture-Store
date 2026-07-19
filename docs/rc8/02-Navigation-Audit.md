# 02 — Navigation Audit

- **Audit ID:** RC8.0-CX-02
- **Evidence:** `MarketingShell.tsx`, `marketing.css`, premium furniture site patterns (BMS, Herman Miller, Steelcase, Knoll, Haworth, Workspace.ae)

## 1. Current navigation map

### Top nav (desktop)

| Item | Behavior | Status |
|---|---|---|
| Logo → `/` | Link | **I** |
| Collections | Hover/click mega (lines + categories + booklet CTA) | **Partial** |
| Products | `/products` | **I** |
| Projects | `/projects` | **I** |
| Manufacturing | `/manufacturing` | **I** |
| Company | `/about` (label ≠ hub) | **Partial** |
| Contact | `/contact` | **I** |
| Search | Opens modal | **P** |
| Request quote CTA | `/quote` | **I** route / **P** form |
| Console | `/app` | Enterprise escape hatch |
| Theme toggle | Light/dark | **I** |

### Footer

Company / Capabilities / Explore columns cover most static pages. **No** Support, Downloads library, Wishlist, Compare, Services.

### Utility

WhatsApp float, Live chat stub, Back-to-top, Cookie banner, Skip link.

---

## 2. Comparison vs premium furniture sites

| Pattern | Premium reference | AFH today | Gap |
|---|---|---|---|
| Primary “Shop / All furniture” | Deep L1→L2 mega | “Collections” shallow mega | **Missing taxonomy mega** |
| Sticky header | Shrink + persist CTAs | `is-scrolled` after 480px | **Partial** (visual only) |
| Mega columns | 4–6 L1 with L2 lists + imagery | 2 cols + feature | **Missing depth** |
| Hover intent delay | Prevent accidental open | Immediate mouse enter | **Missing polish** |
| Keyboard mega | Focus trap, Escape, arrows | Esc closes search only; mega via click | **Partial** |
| Mobile drawer | Full-screen shop tree | `site-nav-toggle` expands list | **Partial** |
| Search placement | Persistent icon + typeahead | Nav button + modal | **Partial** |
| CTA placement | Quote + Find a dealer | Quote + Console | Console is internal; **dealer locator missing** |
| Secondary nav | Support, Resources, Specs | Footer only | **Partial** |
| Breadcrumbs | Everywhere below L1 | None | **Missing** |
| Account / wishlist icons | Persistent | None (booklet fav only) | **Missing** |

---

## 3. Mega menu vs required furniture tree

**Required (user reference) — all Missing as pages:**

- Sofas → Fabric, Leather, Sectional, Corner, Recliners, Modular, Chaise Lounges  
- Beds → Upholstered, King, Queen, Benches  
- Tables → Coffee, Side, Dining, Bedside, Console, Small  
- Chairs → Armchairs, Accent, Dining  
- Storage → TV Units, Wall Units, Sideboards, Bookcases, Chest of Drawers  

| Field | Value |
|---|---|
| **Current status** | Missing entirely (menu + routes + products + SEO) |
| **Why it matters** | Primary discovery path for furniture shoppers; SEO landing pages |
| **Recommended implementation** | Taxonomy-driven mega; each L2 → catalogue List with facets; preserve Policy for any authenticated B2B price views |
| **Dependencies** | Catalogue taxonomy (RC11); CMS optional for merchandising; Search facets |
| **Priority** | **Critical** |

---

## 4. Interaction & a11y behaviors

| Concern | Status | Notes |
|---|---|---|
| Sticky behavior | **Partial** | Class toggle; no compact CTA bar |
| Dropdown interactions | **Partial** | Mouse + click; no hover intent |
| Category hierarchy | **Missing** | Flat 5 categories |
| Mobile navigation | **Partial** | Works; not app-like shop tree |
| Keyboard navigation | **Partial** | Skip link; limited mega keyboard |
| Accessibility | **Partial** | `aria-expanded` on menu/search; mega region labeled |
| Search placement | **Partial** | ⌘/Ctrl+K; no header typeahead field |
| CTA placement | **Partial** | Quote strong; secondary CTAs uneven |
| Hover states | **Partial** | Link underline/color; product lift |
| Animations | **Partial** | See doc 10 |
| Loading behavior | **Partial** | 280ms page skeleton transition |

### Gap — navigation information architecture

| Field | Value |
|---|---|
| **Current status** | Brand-site IA, not commerce IA |
| **Why it matters** | Users cannot browse like competitor furniture sites |
| **Recommended implementation** | Redesign public IA: Shop (mega) · Projects · Specs/Downloads · Company · Support; keep Console behind auth only |
| **Dependencies** | Content model; taxonomy; Phase A design system |
| **Priority** | **Critical** |

---

## 5. Route / SEO navigation gaps

| Expected URL pattern | Status |
|---|---|
| `/furniture/sofas/leather-sofas` | **R** |
| `/collections/:slug` | **R** (query only) |
| `/categories/:slug` | **R** |
| `/support`, `/downloads`, `/services` | **R** |
| `/wishlist`, `/compare` | **R** |
| Product URLs in sitemap | **Missing** (sitemap lists marketing pages only) |

---

## 6. Verdict

Navigation is adequate for a **brand brochure** and insufficient for a **premium furniture commerce** experience. Mega menu must be rebuilt around a real taxonomy; Company/Support/Resources IA needs expansion; Console should not compete with shop CTAs on the public primary bar.
