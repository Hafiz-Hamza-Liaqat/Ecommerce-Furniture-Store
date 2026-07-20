# RC9.4.3.1 — Navigation & Hero Polish Report

**Date:** 2026-07-20  
**Status:** Implemented — awaiting manual review (**no commit**)

## Objective

Resolve UI inconsistencies found in RC9.4.3 manual review. Branding/navigation polish only — no auth, routing, backend, AI Consultant, Budget Planner, persistence, or business logic changes.

---

## 1. Hero Secondary CTA

**Problem:** `site-btn--ghost` used dark ink + subtle line border — nearly invisible on light surfaces and inconsistent as a secondary CTA.

**Fix:** New `site-btn--outline` / `btn--outline` in `tokens/button-system.css`.

| Mode | Default | Hover |
|------|---------|-------|
| Light | White fill, forest border & text | Forest fill, white text |
| Dark | Transparent, brass border & text | Brass fill, dark text |

**Hero media override:** On dark hero imagery, light-mode outline uses white fill/border for contrast; dark-mode uses brass outline.

**Surfaces updated:**

| Page | Secondary CTA |
|------|---------------|
| Home hero | Book a demo → `--outline` |
| Home CTA band | Book demo + Download catalogue → `--outline` |
| Journal CTA | Request quote → `--outline` |
| Article CTA | Browse furniture → `--outline` |
| Consultant | Book consultation → `--outline` |
| Projects case study | Back to portfolio → `--outline` |

Ghost retained for utility chrome (filters, wishlist, form cancel, etc.).

---

## 2. Mobile Drawer Branding

**Problem:** Monogram showed SVG mark (RLF inside) + separate “RLF” text → triple branding.

**Fix:**

| Context | Treatment |
|---------|-----------|
| Drawer header | `BrandLogo variant="text"` — **RLF** letters only |
| Navbar &lt;768px | SVG mark only (no mono-text duplicate) |
| Navbar ≥768px | SVG mark + “Rao Liaqat Furniture” |
| `monogram` variant | SVG mark only |

New `text` variant for compact letterform without the box mark.

---

## 3. Drawer as Modal Panel

| Requirement | Implementation |
|-------------|----------------|
| Solid surface | Opaque `--site-paper`, stronger shadow, `isolation: isolate` |
| Overlay blocks page | Backdrop opacity ↑ + light blur |
| Hide WhatsApp / Consultant / Top FABs | `.site.is-nav-open` hides floating chrome |
| Hide hero CTAs | `.site.is-nav-open .site-hero__actions` |
| Pause hero zoom | `animation-play-state: paused` |
| Lock body scroll | `position: fixed` + restore scrollY on close |
| Drawer scrollable | Existing `overflow: auto` on `.site-nav` |

---

## 4. Drawer Header Layout

```
[ RLF ]                    [ Close ]
```

- Balanced padding (`space-5`), min-height 4rem
- Close: dedicated `.site-nav-drawer__close` with 44px touch target
- No duplicate marks

---

## 5. Header Utilities (1200–1439)

Tighter nav gap, compact CTA padding, shorter account name max-width so utilities never collide with primary links. Below 1200px: drawer mode (Logo + Hamburger only in chrome).

---

## 6. Unchanged (regression)

- AI Consultant / Planner logic
- Auth, portal, persistence
- Role menus, notifications UI, company mega menu
- Theme toggle behavior (Appearance in account menu)
- Routing contracts

---

## Validation

| Gate | Result |
|------|--------|
| Typecheck | ✅ |
| Lint | ✅ |
| Unit tests | ✅ 153 |
| Production build | ✅ |

See companion reports for theme, responsive, CTA, branding, and test detail.

## 7. Hotfix — Menu bar containment (post-review)

**Root cause:** `.site-header` used `backdrop-filter`, which creates a containing block for `position: fixed` descendants. The drawer was trapped to **header height only**, so:

- Split header (logo left + Close strip right)
- Hero still visible / scrollable behind “menu”
- Tiny scrollbar with Windows up/down arrows
- Nav links floating without a solid panel

**Also:** `@media (max-width: 640px)` forced `width: min(100vw - 2.5rem, 22.5rem)`, shrinking the panel on phones.

**Fix:**

1. Move blur to `.site-header::before` (header itself no longer traps fixed)
2. Full-viewport drawer ≤1199px (`inset: 0`, `100dvh`, solid paper)
3. Hide header logo + hamburger while open
4. Nav body: `flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain`
5. Remove 640px width override
6. Desktop ≥1200 resets drawer to static flex bar

**Verify at:** 320 · 668 · 1024 (light + dark) — hard refresh after pull.

