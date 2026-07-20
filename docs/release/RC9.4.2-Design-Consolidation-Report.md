# RC9.4.2 — Premium Design System Consolidation

**Date:** 2026-07-20  
**Status:** Implemented — awaiting review (no commit)

## Objective

Unify marketing and enterprise visual surfaces into one premium furniture platform identity — UI architecture only. No business logic, routing, auth, AI, planner, persistence, or API changes.

---

## 1. Design Consolidation Summary

| Area | Before | After |
|------|--------|-------|
| Color tokens | `--site-*` + `--afh-*` + hardcoded fallbacks | `--brand-*` canonical + aliases |
| Primary action | Copper (app) / Forest (marketing) | Forest/brass everywhere |
| Motion | 160–280ms mixed, duplicate RC8.1 block | 140 / 220 / 320 / 560 / 600ms scale |
| Buttons | `.btn` + `.site-btn` separate rules | `tokens/button-system.css` unified |
| Workspace | Cool gray SaaS gradient | Warm forest/brass mood-board surfaces |
| Portal shell | Teal/copper radial | Brand-aligned via `workspace-theme.css` |
| Footer | 4-column only | Trust strip + social placeholders |
| Hero | Static lead text | Optional fade keyword rotation (Home) |

---

## 2. Token Architecture Report

### Structure

```
packages/web/src/styles/tokens/
  colors.ts          — TS export (forest, brass, semantic)
  typography.ts      — type scale, weights, line heights
  spacing.ts         — 4px-based spacing + layout
  radius.ts          — sm / md / lg / pill
  shadows.ts         — light + dark elevation
  motion.ts          — fast / medium / slow / hero / reveal
  breakpoints.ts     — responsive px map
  zindex.ts          — stacking scale
  index.ts           — barrel export
  index.css          — CSS custom properties (source of truth)
  typography.css     — utility classes + hero keyword
  button-system.css  — unified .btn + .site-btn
  workspace-theme.css — authenticated luxury surfaces
  footer-trust.css   — trust strip + social placeholders
  rc942-tokens.test.ts
```

### Alias bridge

| Legacy | Resolves to |
|--------|-------------|
| `--afh-*` | `--brand-*` |
| `--site-*` | `--brand-*` |
| `--cx-*` | `--brand-motion-*` / shadows |

Import order (`main.tsx`): `tokens/index.css` → typography → button-system → workspace-theme → footer-trust → enterprise-tokens (density only) → existing layers.

### Removed duplicates

- Color defs from `marketing.css` `.site` block
- RC8.1 motion token override block in `marketing.css`
- `.btn` rules from `components.css`
- `.site-btn` base rules from `marketing.css` and `premium-ui.css`
- Spacing/elevation/motion from `enterprise-tokens.css`
- Copper/teal body gradient from `global.css`

---

## 3. Theme Comparison Report

| Surface | Light | Dark |
|---------|-------|------|
| **Marketing** | Warm paper `#f7f8f7`, forest CTAs | Green-black `#0d1310`, brass CTAs |
| **Workspace** | Same brand tokens via aliases | Elevated `#161f1a` cards, brass nav |
| **Portal** | Forest/brass radial (was teal/copper) | Matches marketing dark |
| **Primary button** | Forest deep → forest hover | Brass → brass deep |
| **Focus ring** | Brass outline (unified) | Brass outline (unified) |

Enterprise copper primary **replaced visually** by forest/brass through `--afh-copper` → `--brand-brass` alias and `.btn--primary` using `--brand-primary-deep`.

---

## 4. Component Changes

### Button (`components/ui.tsx`)

Extended primitive supports:

- `variant`: primary | ghost | danger
- `size`: sm | md | lg
- `surface`: app | site (`.btn` vs `.site-btn`)
- `loading`, `disabled`, `icon`, `iconPosition`
- `ButtonLink` for marketing routes

Existing className usage unchanged across codebase.

### Footer (`MarketingShell.tsx`)

Added trust strip with placeholders:

- Certifications
- Partners & awards
- Showrooms
- Download catalogue (live link to `/downloads`)
- Social link placeholders (no fake URLs)

### Hero (`HeroKeywordRotate.tsx`)

Home lead rotates: homes → hotels → workplaces → hospitality lobbies  
Fade transition only; respects `prefers-reduced-motion` and `data-motion="reduce"`.

---

## 5. Responsive Audit Report

| Breakpoint | Fixes applied |
|------------|---------------|
| All touch | Nav icon buttons → `--brand-touch-min` (44px) |
| All touch | Avatar trigger → 44px min |
| ≤1199px | Footer trust grid → 2 columns |
| ≤640px | Footer trust → 1 column; newsletter stacks |
| 1200–1440px | Header height tokens from index.css |
| ≥1440px | Container 1400px |

No layout structure changes. Tables retain horizontal scroll wrappers.

---

## 6. Accessibility Summary

| Check | Status |
|-------|--------|
| Focus rings | Unified `--brand-focus-outline` (brass) |
| Keyboard nav | Unchanged — traps preserved |
| ARIA | Footer trust/social labels; hero keyword `aria-live="polite"` |
| Touch targets | 44px on nav icons + avatar |
| Reduced motion | Hero keywords static; button hover disabled |
| Contrast | Brand tokens unchanged from RC9.4.2 audit (AA+) |

---

## 7. Visual Regression Summary

| Area | Risk | Mitigation |
|------|------|------------|
| App primary buttons | Copper → forest | Intentional brand unification |
| Workspace background | Gray → warm gradient | Luxury studio feel |
| Portal shell | Teal radial removed | Matches marketing |
| Marketing buttons | Unified hover (2px lift) | Subtler than old -3px |
| Home hero lead | Keyword rotation | Optional; reduced-motion safe |
| Footer | New trust strip above grid | Placeholders only |

**No changes:** Logo, homepage structure, AI Consultant UX, Budget Planner UX, routing, auth, APIs.

---

## 8. Validation

| Gate | Result |
|------|--------|
| Lint | PASS |
| Typecheck | PASS |
| Unit tests | **149 passed** (+4 token tests) |
| Production build | PASS |

---

## 9. Files Changed

- `styles/tokens/*` (new)
- `styles/tokens.css`, `enterprise-tokens.css`, `global.css`, `components.css`
- `styles/marketing.css`, `premium-ui.css`, `production-quality.css`, `platform.css`
- `main.tsx`, `components/ui.tsx`
- `marketing/MarketingShell.tsx`, `marketing/HeroKeywordRotate.tsx`, `marketing/pages/HomePage.tsx`

---

## 10. Manual Checklist

- [ ] Home → `/app` dashboard: warm surfaces, forest accents
- [ ] Portal: matches marketing brand (not gray SaaS)
- [ ] Dark mode: brass CTAs, green-black surfaces
- [ ] Buttons: consistent hover/focus app + marketing
- [ ] Footer trust strip visible; catalogue link works
- [ ] Home keyword rotates (disable with reduced motion)
- [ ] Nav touch targets feel comfortable on mobile
- [ ] AI Consultant / Planner / Projects unchanged functionally

---

## Constraints honored

- No commit
- No RC9.5 work
- No business logic, routing, auth, AI, planner, persistence, CRM, or API changes

*Stop after RC9.4.2 — awaiting review.*
