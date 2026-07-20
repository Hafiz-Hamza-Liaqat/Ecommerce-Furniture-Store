# RC9.4.2 — Premium Design System & Theme Audit

**Date:** 2026-07-20  
**Status:** Audit only — no code changes, no commit  
**Scope:** Full AFH web UI (`packages/web`) — marketing, workspace, portal, admin, planner, consultant, CRM surfaces

---

## Executive Summary

AFH operates **two parallel design systems** that share fonts (Manrope + Syne) but diverge on color philosophy, motion timing, button styling, and hero patterns. The **marketing layer** (`--site-*`, `--cx-*`) is the strongest visual expression and approaches premium furniture-brand quality on Home, Journal, and catalogue pages. The **enterprise layer** (`--afh-*`) is functional and consistent internally but feels like a separate product when users cross from `/products` to `/portal` or `/app`.

Dark mode is **partially intentional** (marketing uses forest/brass accents with deep green-black surfaces) but **not fully tokenized** — several surfaces rely on hardcoded fallbacks (`#1a1a1a`, `#1e1e1e`, `#8b6914`). Motion language is close to unified (shared easing curve) but **duration and lift values conflict** across `marketing.css` and `premium-ui.css`.

**Overall premium score: 6.8 / 10** — strong foundation, not yet Herman Miller / RH tier. See §14 for full scorecard.

---

## 1. Premium Theme Audit

### 1.1 Light Theme

| Surface | Token / value | Assessment |
|---------|---------------|------------|
| Page background | `--site-paper` `#f7f8f7` + `--site-mist` `#eef1ef` gradient + forest radial | Warm, editorial; premium feel ✓ |
| Cards / panels | `--site-paper`, `color-mix` borders `--site-line` | Subtle, consistent ✓ |
| Navbar | Frosted `--site-paper` 82%, `--site-line` border | Clean; post-RC9.4.1 consolidation improved balance ✓ |
| Hero (Home) | Full-bleed image + dual gradient overlay | Cinematic; strong ✓ |
| Inner page heroes | Plain paper — no elevation | Functional but flat vs Home |
| Footer | `color-mix(mist 70%, paper)` | Appropriate depth ✓ |
| Dashboard / app | `--afh-paper` `#fafbfc`, copper/teal radial body | Different personality — enterprise, not furniture showroom |
| Forms | `--afh-border`, 12px radius (enterprise); marketing inputs inherit `--site-line` | Two form aesthetics |
| Modals / dropdowns | Marketing: paper + `--cx-shadow`; Enterprise: `--afh-elev-*` | Both readable; shadow systems differ |
| Tables | Workspace `.ws-table` — compact, border rows | Dense; appropriate for admin, not premium retail |

**Light theme strengths:** Marketing light mode has genuine hierarchy — forest primary, brass accents, Syne display headlines. Readability is strong (`#14201a` on `#f7f8f7` ≈ 12.5:1).

**Light theme weaknesses:**
- Enterprise body gradient uses copper/teal radials unrelated to marketing forest/brass
- `--site-accent` undefined — focus rings fall back to `#8b6914` (brass-adjacent) in `production-quality.css` but `#1f6f6a` (teal) elsewhere
- Company pages: text-only heroes with imagery below fold — feels template-like vs Home

### 1.2 Dark Theme

| Surface | Token / value | Assessment |
|---------|---------------|------------|
| Background | `--site-paper` `#0d1310`, `--site-mist` `#121a16` + brass radial | Intentional luxury green-black ✓ — **not simple inversion** |
| Cards | Same tokens + `--cx-shadow` dark overrides | Adequate elevation |
| Primary CTA | `--site-brass` on `#12140f` text | Warm accent; premium ✓ |
| Forest/brass | **Not redefined in dark** — same hex as light | Acceptable for accent; forest stays `#2f4f3f` |
| Enterprise dark | `--afh-paper` `#12171f`, cool blue-gray palette | Feels SaaS dashboard, not furniture |
| Overlays | `rgba(12, 18, 15, 0.42)` drawer backdrop | Appropriate |
| Modals (dark) | `--site-surface` fallback `#1a1a1a` — **undefined token** | Patch layer; not canonical |
| Form inputs (dark) | `color-mix(afh-surface #111 88%, #000)` on marketing pages | Uses enterprise fallback on marketing DOM — **semantic leak** |

**Dark theme verdict:** Marketing dark mode **does** feel like a luxury furniture site (deep greens, brass highlights, restrained contrast). Enterprise dark mode feels like a standard B2B admin panel. The gap between them is the main dark-theme inconsistency.

**Not inverted — evidence:**
- Light paper `#f7f8f7` → dark `#0d1310` (custom green-black, not `#080808`)
- Dark adds brass radial gradient at 80% 0%
- Primary button swaps forest → brass in dark (`.site[data-site-theme="dark"] .site-btn--primary`)

---

## 2. Color Palette Report

### 2.1 Actual palette in use

#### Marketing (`--site-*`) — public site

| Role | Hex / value | Usage | Duplicated? |
|------|-------------|-------|-------------|
| **Primary (forest)** | `#2f4f3f` | CTAs light, logo mark, links, FABs | Fallback `#1e3a2f` in premium-ui badges |
| **Secondary (brass)** | `#9a7b4f` | Eyebrows, focus rings, dark primary | Deep variant `#7a5f3a` |
| **Ink (text)** | `#14201a` / dark `#e8eee9` | Body, headings | Near-duplicate of `--afh-ink` |
| **Ink soft** | `#3a4a42` / dark `#b7c2bb` | Secondary text, nav | — |
| **Background paper** | `#f7f8f7` / dark `#0d1310` | Page, cards | — |
| **Background mist** | `#eef1ef` / dark `#121a16` | Sections, footer mix | — |
| **Border / line** | `rgba(20,32,26,0.12)` / dark `rgba(232,238,233,0.14)` | Cards, inputs, dividers | — |
| **Hero text on image** | `#f5f7f6`, `#f4f7f5` | Home hero, CTA band | Hardcoded, not tokenized |
| **Overlay gradients** | `rgba(10,16,13,0.15–0.72)` | Hero, CTA band | Multiple similar literals |

#### Enterprise (`--afh-*`) — `/app`, portal, admin

| Role | Hex | Usage |
|------|-----|-------|
| **Primary (copper)** | `#a34f28` / deep `#7a3a1c` | `.btn--primary`, focus ring base |
| **Secondary (teal)** | `#1f6f6a` | AI chips, info alerts, mentions focus |
| **Success** | `#1b7a4a` | `.alert--ok` |
| **Warning** | `#a15c12` | `.alert--warn`, offline banner |
| **Danger** | `#b42318` | `.btn--danger`, errors |
| **Neutral ink** | `#141a22` / dark `#eef2f6` | Body |
| **Neutral soft** | `#2a3444` / dark `#c5ced8` | Secondary |
| **Paper / mist / stone** | `#fafbfc`, `#f3f5f7`, `#dfe5ec` | Surfaces |
| **Border** | `rgba(20,26,34,0.12)` | Universal |

#### Undefined / fallback colors (inconsistency risk)

| Fallback | Appears in | Issue |
|----------|------------|-------|
| `--site-surface` → `#1a1a1a` | production-quality dark modals | Not in token files |
| `--site-accent` → `#8b6914` vs `#1f6f6a` | Focus rings | **Two different accents** |
| `--afh-surface` → `#fff` / `#111` | Dark forms on marketing | Enterprise token on marketing DOM |
| `--afh-elevated` → `#1e1e1e` | Dark modals | Not in tokens.css |
| `#fef3c7`, `#f59e0b` | Offline banner dark | Tailwind-adjacent amber, not in palette |

### 2.2 Recommended canonical palette (for RC10)

**Brand (marketing + bridge to app):**

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--afh-brand-primary` | `#2f4f3f` | `#3d6b54` | Forest — furniture identity |
| `--afh-brand-accent` | `#9a7b4f` | `#b8956a` | Brass — luxury highlight |
| `--afh-brand-accent-deep` | `#7a5f3a` | `#9a7b4f` | Hover / pressed |
| `--afh-ink` | `#14201a` | `#e8eee9` | Text |
| `--afh-ink-muted` | `#3a4a42` | `#b7c2bb` | Secondary text |
| `--afh-surface-0` | `#f7f8f7` | `#0d1310` | Page |
| `--afh-surface-1` | `#ffffff` | `#121a16` | Cards |
| `--afh-border` | `rgba(20,32,26,0.12)` | `rgba(232,238,233,0.14)` | Dividers |

**Semantic (shared):**

| Token | Value |
|-------|-------|
| `--afh-success` | `#1b7a4a` |
| `--afh-warning` | `#a15c12` |
| `--afh-danger` | `#b42318` |
| `--afh-info` | `#1f6f6a` |

**App-only action:** Map `.btn--primary` copper → brand forest OR introduce explicit `--afh-app-accent` copper for ERP-only contexts.

---

## 3. Typography Audit

### 3.1 Font families

| Context | UI | Display |
|---------|-----|---------|
| Marketing | `--site-font` Manrope | `--site-display` Syne |
| Enterprise | `--afh-font-ui` Manrope | `--afh-font-brand` Syne |

**Consistent families ✓** — good foundation.

### 3.2 Type scale (actual)

| Element | Size | Weight | Letter-spacing | Location |
|---------|------|--------|----------------|----------|
| Home hero h1 | `clamp(2.4rem, 6vw, 4.6rem)` | 800 | default | marketing.css |
| Page hero h1 | `clamp(2rem, 4vw, 3rem)` | 750 | -0.02em | marketing.css |
| Blog index h1 | `clamp(2rem, 4vw, 3rem)` | — | — | blog.css |
| Blog article h1 | `clamp(1.85rem, 3.5vw, 2.75rem)` | — | — | blog.css |
| Section titles | `clamp(1.8rem, 3vw, 2.6rem)` | 750 | — | marketing.css |
| Enterprise page title | `clamp(1.6rem, 2vw, 2rem)` | — | -0.03em | global.css |
| Eyebrow | 0.75–0.78rem | 650–700 | 0.08–0.12em uppercase | marketing |
| Nav links | 0.9375rem → 0.8125rem (responsive) | — | — | premium-ui.css |
| Body / lead | 1rem / 1.1rem | 400–500 | — | various |
| Footer legal | 0.9rem | — | — | marketing.css |
| KPI stat values | 1.35rem | 700 | — | workspace.css |
| Platform brand | 1.15rem | 700 | -0.02em | platform.css |

### 3.3 Inconsistencies

1. **No centralized type scale** — sizes are component-local, not `--text-xs` … `--text-display`
2. **Weight sprawl** — 650, 750, 800 used in marketing; enterprise mostly 600–700
3. **Three hero headline sizes** — Home (4.6rem max) vs page hero (3rem) vs blog article (2.75rem) — intentional tiering but undocumented
4. **Enterprise page titles smaller than marketing inner pages** — portal feels “less important” than `/about`
5. **Line height** — body `1.5` global; marketing prose varies; tables use tighter rows
6. **`site-display` vs `afh-font-brand`** — same Syne stack, different variable names
7. **Product PDP h1** — inherits PDP layout sizing, not `site-page-hero` scale

### 3.4 Recommendations

- Define `--type-display-xl`, `--type-display`, `--type-title`, `--type-body`, `--type-caption`, `--type-overline`
- Limit weights to 400, 500, 600, 700 (drop 650, 750, 800 or map explicitly)
- Document hero tier system: Cinematic / Page / Article / App-header

---

## 4. Button Audit

### 4.1 Button systems

| Class | Radius | Padding | Primary bg | Hover | Transition | Focus |
|-------|--------|---------|------------|-------|------------|-------|
| `.btn` | 999px pill | 0.65×1.1rem | `--afh-copper-deep` | translateY(-1px) | 160ms ease | `--afh-focus` box-shadow |
| `.site-btn` | 999px pill | similar | `--site-forest` / dark brass | translateY(-3px) scale(1.015) | `--cx-duration` 280ms | 2px `--site-brass` outline |
| Icon buttons | 999px | 2.4rem min | transparent | bg mix | varies | brass outline |
| Filter pills | rounded rect | varies | mist mix | border color | 280ms | inconsistent |
| Tabs (`.ws-tabs`) | small radius | compact | teal/copper mix | bg change | 160ms | partial |
| Pagination | text buttons | minimal | — | underline/color | — | weak |

### 4.2 Issues

1. **Two primary button colors** — copper (app) vs forest/brass (marketing)
2. **Triple `.site-btn` definition** — marketing.css base, RC8.1 block, premium-ui.css override (cascade fragility)
3. **Hover lift mismatch** — `.btn` -1px vs `.site-btn` -3px + scale
4. **Disabled** — `.btn:disabled` opacity 0.55; `.site-btn.is-disabled` opacity 0.48
5. **Loading** — `.site-btn.is-loading` spinner; `.btn` has no loading state
6. **Danger** — `.btn--danger` only; marketing uses ghost + text for destructive actions
7. **Domain-specific buttons** — 15+ bespoke button patterns (planner templates, gallery thumbs, AI chips) without shared primitive

### 4.3 Verdict

Buttons do **not** belong to one design system today. Marketing buttons are closer to premium furniture; enterprise buttons are closer to generic SaaS.

---

## 5. Hover & Motion Audit

### 5.1 Token conflict (critical)

| Token | marketing.css RC8.1 | premium-ui.css (wins) |
|-------|----------------------|------------------------|
| `--cx-duration` | 240ms | **280ms** |
| `--cx-duration-slow` | 360ms | **560ms** |
| `--cx-lift` | 4px | **3px** |
| `--cx-scale` | 1.02 | **1.015** |
| `--cx-reveal-y` | 12px | **16px** |

Stale RC8.1 block in `marketing.css` (L1251+) should be removed in a future RC — creates confusion for maintainers even if overridden.

### 5.2 Motion inventory

| Interaction | Duration | Easing | Transform |
|-------------|----------|--------|-----------|
| Card hover | `--cx-duration` | `--cx-ease` | translateY(-3px) scale(1.015) |
| Product/card (legacy) | 200ms | ease | translateY(-3px) |
| Button hover | 280ms / 160ms | mixed | translateY(-1px to -3px) |
| Hero zoom | 18s | ease | scale 1.06→1 (**disabled** in premium-ui) |
| Scroll reveal | 600ms | ease | translateY(16px) → 0 |
| Nav drawer | `--cx-duration-slow` | `--cx-ease` | translateX |
| Account menu | `--cx-duration` | `--cx-ease` | fade + translateY |
| Enterprise page enter | `--afh-motion-base` | `--afh-ease-out` | fade-in |
| Planner progress | `--cx-duration-slow` | — | width transition |

**Shared easing ✓:** `cubic-bezier(0.22, 1, 0.36, 1)` (`--afh-ease-out` = `--cx-ease`)

### 5.3 Reduced motion

Four layers: `prefers-reduced-motion`, `[data-motion="reduce"]`, marketing overrides, premium-ui disables reveals/spinners. **Well covered ✓**

### 5.4 Recommended unified motion language

| Token | Value | Use |
|-------|-------|-----|
| `--motion-fast` | 140ms | Icon toggles, opacity |
| `--motion-base` | 220ms | Buttons, links |
| `--motion-emphasis` | 320ms | Cards, dropdowns |
| `--motion-reveal` | 560ms | Section scroll reveals |
| `--motion-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | All |
| `--motion-lift` | 2px | Subtle card/button lift |
| `--motion-scale` | 1.008 | Maximum scale (restraint) |

**Avoid** scale > 1.02 on luxury surfaces; **avoid** bounce/elastic easing.

---

## 6. Navbar Audit

### 6.1 Desktop (post RC9.4.1)

**Contents:** Logo · Furniture · Products · Projects · Manufacturing · Consultant · Company ▼ · Journal · Search · Request Quote · Avatar

**Strengths:**
- Consolidation removed overcrowding ✓
- Single-row enforced at ≥1200px (`flex-wrap: nowrap`)
- Company mega: 3-column grid, right-aligned, no clipping
- Avatar badge for notifications only

**Remaining issues:**
- **11 primary links + mega + utils** still dense at 1200–1280px — nav font drops to 0.8125rem at mid-desktop
- **Logo + wordmark** consumes horizontal space; wordmark hidden <1200px only on mobile drawer breakpoint
- **Search** icon-only — good; **Request Quote** CTA competes with Journal for space
- **No social proof / trust strip** in nav (acceptable for minimalism)

### 6.2 Mobile / tablet

- Drawer at ≤1199px — premium slide panel ✓
- Account menu inline in drawer ✓
- Touch targets 2.75rem on drawer links ✓
- **Floating collision:** WhatsApp + Furniture consultant + cookie banner + top button — mitigated at ≤720px (chat lifted) but still crowded

### 6.3 Verdict

Navigation is **balanced after RC9.4.1** on desktop 1440px+. At 1280px it is **acceptable but tight**. Mobile is functional; floating widgets reduce premium feel.

---

## 7. Footer Audit

### 7.1 Structure

4-column grid: Brand + newsletter | Company | Capabilities | Explore  
Legal row: © year, Privacy, Terms, Cookies, Sitemap

### 7.2 Assessment

| Aspect | Status |
|--------|--------|
| Layout | 4-col → 1-col at ≤1199px ✓ |
| Spacing | premium-ui tokenized padding ✓ |
| Typography | Display brand 750; soft ink tags ✓ |
| Newsletter | 2-col grid input + button — **no validation styling beyond HTML5** |
| Social icons | **Missing** — WhatsApp/Chat are floating, not in footer |
| Premium identity | Adequate but **generic** vs RH/B&B (no imagery, certifications strip, or showroom CTA) |

### 7.3 Recommendations

- Add restrained social / showroom links row
- Newsletter success state is text-only — could match toast pattern
- Consider footer forest band mirroring CTA band for bookends

---

## 8. Hero Section Review

### 8.1 Hero tiers

| Tier | Class | Pages | Height |
|------|-------|-------|--------|
| Cinematic | `.site-hero` | Home only | `min(92vh, 920px)` |
| Page | `.site-page-hero` | Products, Projects, Consultant, Planner, Company, etc. | Content-driven |
| Editorial | `.afh-blog-hero` | Journal index | 2-col + featured card |
| App header | `.page-header` | Dashboard, Portal, Admin | Compact border-bottom |

### 8.2 Per-surface notes

| Page | Hero quality | Issues |
|------|-------------|--------|
| **Home** | ★★★★★ | Strong; zoom disabled = good restraint |
| **Furniture/Products** | ★★★☆☆ | Text-only hero; filters instead of CTAs |
| **Projects** | ★★★☆☆ | Uniform; detail page CTAs at bottom |
| **Journal** | ★★★★☆ | Best editorial treatment after Home |
| **Consultant** | ★★★☆☆ | Long lead, no hero CTA — tool follows immediately |
| **Planner** | ★★★☆☆ | Same; `site-hero__actions` misused mid-page |
| **My Projects** | ★★★★☆ | CTAs in hero — good |
| **Company** | ★★☆☆☆ | Template-like; prose image below fold |
| **Dashboard/Portal** | ★★☆☆☆ | Functional header only |

### 8.3 Cross-cutting hero issues

1. `site-hero__actions` used outside heroes (PDP, planner, blog) — naming debt
2. `cx-category-hero` class in TSX with **zero CSS**
3. Skeleton hero 62vh vs live 92vh — loading mismatch
4. CTA band reuses Unsplash URL hardcoded in CSS

### 8.4 Hero typography effects — recommendations

| Effect | Recommend? | Where |
|--------|------------|-------|
| **Staggered entrance** (existing `site-reveal`) | ✓ Keep | Home sections, catalogue grids — already subtle |
| **Elegant text reveal** (fade-up) | ✓ Keep | Hero content on Home — `cx-hero-in` |
| **Rotating headlines** | △ Optional | Home only — 2–3 value props, 5s interval, no flash |
| **Fading keyword transitions** | △ Optional | Home hero subhead — e.g. “Office · Hospitality · Residential” |
| **Animated typing cursor** | ✗ Avoid | Reads as SaaS/chatbot, not furniture |
| **Cursor blink** | ✗ Avoid | Gaming/terminal aesthetic |
| **Parallax text** | ✗ Avoid | Dated; conflicts with accessibility |
| **Ken Burns hero zoom** | ✗ Stay disabled | Already disabled in premium-ui — correct |

**Static typography preferred:** Company pages, Consultant, Planner, Portal, Admin — trust and clarity over motion.

---

## 9. Component Consistency Report

| Surface | Token set | Buttons | Heroes | Cards | Density | Premium score |
|---------|-----------|---------|--------|-------|---------|---------------|
| Marketing frontend | `--site-*` | `.site-btn` | 3 tiers | Lift + shadow | Low | **8/10** |
| Blog / Journal | `--site-*` + blog.css | `.site-btn` | Editorial | Hover lift | Medium | **8/10** |
| Planner | `--site-*` | mixed | Page hero | Template cards | Medium | **7/10** |
| AI Consultant | `--site-*` | `.site-btn` + custom chat | Page hero | Chat bubbles | Medium | **7/10** |
| Wishlist / Compare | `--site-*` | `.site-btn` | Page hero | Product cards | Low | **7.5/10** |
| My Projects | `--site-*` | `.site-btn` | Page hero + CTAs | List cards | Medium | **7.5/10** |
| Customer Portal | `--afh-*` | `.btn` | PageHeader | SectionCard | High | **5/10** |
| Admin / Platform | `--afh-*` | `.btn` | PageHeader | KPI tiles | High | **5/10** |
| Workspace `/app` | `--afh-*` | `.btn` | Widget grid | `.ws-card` | High | **6/10** |
| CRM / ERP modules | `--afh-*` | `.btn` + module CSS | Module header | Tables | Very high | **5.5/10** |
| Search (marketing) | `--site-*` | overlay panel | — | Result rows | Medium | **7/10** |
| Search (app) | `--afh-*` | `.btn` | — | List | High | **5.5/10** |

**Critical gap:** Authenticated user journey `/login` → `/my-projects` (marketing) → `/portal` (enterprise) → `/app/crm` (enterprise) crosses **two visual languages**.

---

## 10. Responsive Audit

### 10.1 Breakpoints defined in CSS

| px | Primary behavior |
|----|------------------|
| 320–414 | Mobile base; floating widgets shrink at 640px |
| 375–414 | Drawer 92vw; single-column grids |
| 768 | Not explicit — between 720 and 960 rules |
| 820 | Covered by ≤960 app shell collapse |
| 1024 | Marketing layout adjustments |
| 1199 / 1200 | **Major nav breakpoint** — drawer vs desktop |
| 1280 | Catalogue grids |
| 1366 | Covered by 1200+ desktop nav |
| 1440 | Container 1400px; header 4.5rem |
| 1536 | No explicit rule |
| 1920 | Container capped at 1400px — **large screens have margins** |

### 10.2 Known risk areas (CSS-informed; runtime verify recommended)

| Issue | Breakpoint | Source |
|-------|------------|--------|
| Nav density | 1200–1280px | Small nav font, nowrap |
| Footer 4-col → 1-col | ≤1199px | marketing.css |
| Compare table horizontal scroll | all | production-quality wrap ✓ |
| Planner room tabs wrap | ≤1200px | marketing.css |
| PDP 2-col → 1-col | ≤1199px | marketing.css |
| Blog hero 2-col → 1-col | ≤980px | blog.css |
| App sidebar hidden | ≤960px | global.css |
| Floating widget stack | ≤720px | production-quality |
| Enterprise table → card | ≤900px | enterprise.css |
| Newsletter 2-col may squeeze | ≤640px | no explicit stack rule |

### 10.3 Tables / cards / drawers

- Tables: horizontal scroll wrappers present ✓
- Cards: `minmax(220px, 1fr)` auto-fit — good
- Drawers: focus trap implemented ✓
- Dropdowns: max-height 70vh with scroll ✓

---

## 11. Accessibility Audit

### 11.1 Contrast (estimated WCAG)

| Pair | Ratio (est.) | WCAG AA |
|------|--------------|---------|
| `#14201a` on `#f7f8f7` | ~12.5:1 | ✓ AAA body |
| `#3a4a42` on `#f7f8f7` | ~7.5:1 | ✓ AA body |
| `#9a7b4f` on `#f7f8f7` | ~3.8:1 | ✗ AA normal text; ✓ large text |
| `#2f4f3f` on `#f4f7f5` (CTA) | ~7:1 | ✓ |
| `#e8eee9` on `#0d1310` | ~13:1 | ✓ AAA |
| `#b7c2bb` on `#0d1310` | ~8:1 | ✓ AA |
| `#c5ced8` on `#12171f` (app dark soft) | ~9:1 | ✓ |

**Brass eyebrow on light** may fail for small uppercase text — use deep brass `#7a5f3a` for 12px overlines.

### 11.2 Keyboard & focus

| Area | Status |
|------|--------|
| Skip links | `.site-skip`, `.plt-skip` ✓ |
| Global `:focus-visible` | `outline: none` + `--afh-focus` box-shadow on enterprise |
| Marketing focus | 2px brass outline on nav/buttons ✓ |
| **Conflict** | production-quality uses `--site-accent` `#8b6914`; premium-ui uses `--site-brass` |
| Focus trap | Drawers, account menu, modals ✓ |
| Escape closes | Search, chat, nav, account ✓ |
| Table row focus | `outline: none` on `.ws-table tbody tr:focus-within` — **verify cell focus visible** |

### 11.3 Touch targets

| Context | Min size |
|---------|----------|
| Enterprise token | 44px (`--afh-touch-min`) |
| Marketing drawer links | 2.75rem (44px) ✓ |
| Marketing desktop icon buttons | 2.4rem (38.4px) — **below 44px** |
| Platform mobile | 44px ✓ |

### 11.4 Screen reader

- Marketing nav `aria-label` regions ✓
- Account menu `role="menu"` ✓
- Notification badge on avatar with aria-label ✓
- `.site-sr` / `.sr-only` patterns exist ✓
- Live regions on newsletter subscribe ✓

### 11.5 Color dependence

- Alerts use icon + color ✓
- Unread notifications use weight + badge, not color alone ✓
- Form errors: color + text ✓

---

## 12. Design Token Report

### 12.1 Centralized today

| Category | Enterprise | Marketing | Unified? |
|----------|------------|-----------|----------|
| Colors | `--afh-*` in tokens.css | `--site-*` in marketing.css | **No** |
| Spacing | `--afh-space-1..10` | `--site-space-1..8` | **No** (5/6 differ) |
| Radius | `--afh-radius` 14px, input 12px | implicit pills 999px, cards ~0 | **No** |
| Shadow | `--afh-elev-*` | `--cx-shadow*` | **No** |
| Z-index | ad-hoc literals | ad-hoc literals | **No** |
| Typography | font families only | font families only | Partial |
| Motion | `--afh-motion-*` | `--cx-*` | Partial (ease match) |
| Breakpoints | ad-hoc media queries | ad-hoc | **No** |

### 12.2 Duplicate values to consolidate

- Ink: `#141a22` vs `#14201a`
- Border alpha: same pattern, different RGB bases
- Easing: duplicated name
- Button hover: 160ms vs 280ms
- Header height: 4.5rem vs 4.25rem vs 4rem
- Container: 1200px vs 1400px at 1440px

### 12.3 Recommended token architecture (RC10)

```
styles/tokens/
  brand.css      — shared forest/brass/semantic
  theme-light.css
  theme-dark.css
  spacing.css
  typography.css
  motion.css
  elevation.css
  z-index.css
  breakpoints.css
```

Single `data-theme` on `html`; marketing `.site` inherits via `:where(.site)` scope OR flattens to one tree.

---

## 13. Competitive Comparison

| Criterion | Herman Miller | RH / B&B Italia | IKEA | Apple | **AFH today** |
|-----------|---------------|-----------------|------|-------|---------------|
| Minimalism | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★★ | ★★★★☆ marketing / ★★★☆☆ app |
| Luxury feel | ★★★★★ | ★★★★★ | ★★☆☆☆ | ★★★★★ | ★★★★☆ dark marketing |
| Trust | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★☆☆ (portal breaks trust) |
| Photography | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★★☆ (Home, Journal) |
| Typography | ★★★★★ | ★★★★★ | ★★★☆☆ | ★★★★★ | ★★★★☆ (Syne helps) |
| Enterprise UX | ★★★☆☆ | ★★★☆☆ | ★★★★☆ | ★★★★★ | ★★★★☆ (app is strong functionally) |
| Motion restraint | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★★ | ★★★★☆ (disabled hero zoom = good) |

**AFH strengths:** Marketing home and journal; forest/brass palette; scroll reveal restraint; RC9.4.1 nav consolidation; dark mode intent.

**AFH gaps vs premium peers:** Portal/app visual disconnect; company page template heroes; footer lacks luxury details; dual button systems; no unified photography art direction token; floating widgets (WhatsApp, chat) feel mid-market.

---

## 14. Final Premium UI Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| Light theme (marketing) | 8.0 | Warm, readable, hierarchical |
| Dark theme (marketing) | 8.5 | Luxury green-black; best AFH mode |
| Dark theme (enterprise) | 6.0 | Standard SaaS dark |
| Color system | 6.0 | Dual palettes + undefined tokens |
| Typography | 7.0 | Good fonts; no scale |
| Buttons | 6.0 | Two systems |
| Motion / hover | 7.5 | Shared ease; stale duplicates |
| Navbar | 8.0 | Post RC9.4.1 strong |
| Footer | 6.5 | Functional, not distinctive |
| Heroes | 7.5 | Home excellent; company weak |
| Cross-surface consistency | 5.5 | Marketing ≠ app |
| Responsive | 7.5 | Good breakpoints; 1280px tight |
| Accessibility | 7.0 | Solid base; touch/focus gaps |
| Design tokens | 5.0 | Partial, duplicated |
| Competitive positioning | 6.5 | Marketing near RH tier; app not |

### **Overall Premium UI Score: 6.8 / 10**

---

## Priority Recommendations (for post-audit RCs — not implemented here)

### P0 — Before RC10
1. Unify color tokens — single brand palette with app semantic aliases
2. Bridge portal/app shell to marketing brand (forest/brass or shared header)
3. Remove stale RC8.1 `--cx-*` block from marketing.css
4. Define missing tokens: `--site-surface`, `--site-accent`, `--afh-elevated`

### P1 — Premium lift
5. Single button primitive with variants
6. Typography scale tokens
7. Hero component abstraction (3 tiers)
8. Footer premium pass (imagery, certifications, social)

### P2 — Polish
9. Z-index scale
10. Breakpoint tokens
11. Desktop icon button touch target bump to 44px
12. Company page hero imagery uplift

---

## Files Inspected

- `packages/web/src/styles/*.css` (19 files)
- `packages/web/src/main.tsx` (import order)
- `packages/web/src/marketing/MarketingShell.tsx`
- `packages/web/src/marketing/pages/*.tsx` (heroes)
- `packages/web/src/dashboard/DashboardPage.tsx`
- `packages/web/src/platform/PortalRoutes.tsx`, `AdminRoutes.tsx`
- `packages/web/src/components/ui.tsx`
- `packages/web/src/state/session.tsx` (theme persistence)

---

## Constraints honored

- Audit only — **no code modified**
- No commits
- No RC9.5 work
- No business logic, routing, auth, AI, planner, persistence, or API changes

---

*End of RC9.4.2 Premium Design System Audit*
