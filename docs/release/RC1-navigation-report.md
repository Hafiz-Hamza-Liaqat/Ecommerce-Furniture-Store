# RC1 — Navigation Verification Report

## Public marketing

Verified routes match `App.tsx` + `sitemap.xml`: home, products (+ detail), projects (+ detail), about, story, leadership, manufacturing, factory, technology, sustainability, quality, certifications (awards), careers, partners, distributors, news, blog, events, FAQ, privacy, terms, contact, quote, demo.

Footer / mega-menu links resolve. `#booklet` scrolls to booklet section.

## Auth

| Path | Status |
|------|--------|
| `/login` | Pass |
| `/register` | Pass (added) |
| `/password-reset` | Pass |
| `/app/account/email-verification` | Pass |
| `/app/account/mfa` | Pass |
| `/app/account/security` | Pass (added) |
| Unauthenticated `/app/*` | Redirects to `/login` |
| Unauthenticated `/admin/platform`, `/portal` | Redirects to `/login` |
| `/onboarding` | Public (customer setup) |

## Workspace

NAV_GROUPS and COMMANDS hrefs audited against routes — no orphans after RC1 fixes. Breadcrumbs cover account/security. Favorites, command palette, notifications, theme, company/branch/workspace switches remain as previously implemented in shell.

## Module / platform deep links

- ERP ModuleApp paths (`list` / `new` / `:id` / `edit`) unchanged and reachable.
- Integrations, AI, Analytics, Reports, Platform ops subnavs validated.
- Analytics KPI hrefs corrected (`quotations`, `products`, `deliveries`, `budget`, etc.).
