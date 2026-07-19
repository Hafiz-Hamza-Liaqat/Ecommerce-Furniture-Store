# RC8.0A — Roadmap Restructure

- **Created:** 2026-07-19
- **Status:** Planning only — **no RC8.1 start**
- **Replaces:** Informal Phase A / B / C labels from RC8.0 CX audit for execution planning
- **Does not:** Expand RC7 V1 freeze Included scope; redesign Policy/Workflow/Approval/RC7.1

## Relationship to productization roadmap

| This execution ID | Productization affinity | Notes |
|---|---|---|
| RC8.1 Customer Experience | RC11 commerce + RC13 CX + RC10 estimators + RC9 consultant (grounded) | Public storefront |
| RC8.2 Enterprise Workspace | Roadmap RC8 portals + remaining enterprise UI over RC7 backends | Ops / professional |
| RC8.3 Production Quality | Cross-cutting quality gates | Applies to 8.1+8.2 surfaces |
| RC8.4 Release Readiness | Toward RC15-style launch gate (subset) | Sign-off only |

---

## RC8.1 — Customer Experience

**Goal:** Complete the public furniture customer journey to premium-competitor parity for discovery, PDP media, consideration, and conversion handoff.

### Includes

| Workstream | Deliverables (checklist) |
|---|---|
| Mega navigation | Furniture taxonomy; L1/L2 mega; mobile drawer; hover intent; keyboard disclosure |
| Category pages | Landings, listings, breadcrumbs, counts, related categories, CMS blocks, SEO/JSON-LD, empty/error |
| Public pages | Support, Services, Downloads hub; fix soft-404 PDP; journal/news detail as capacity allows |
| Amazon-style gallery | Zoom, magnifier, fullscreen, keyboard, swipe/touch, thumbs sync, lazy/preload, placeholders, errors |
| 360° Product Viewer | Image-sequence spin; drag; auto-spin; fullscreen; a11y; loading; relabel false “360” copy |
| Wishlist | Add/remove; persistence; account sync path |
| Compare | 2–4 products; attribute matrix; export/share |
| Advanced filters | Facets + sort + URL state + pagination + product count |
| Budget / Product Finder | PKR budget → packages, remaining %, alternatives, save, PDF, quote/inquiry |
| Search experience | Typeahead over published catalogue; empty states |
| AI Furniture Consultant | Multi-turn showroom flow; package proposals; CRM/quote/WhatsApp/appointment handoff (grounded) |
| Responsive improvements | Mobile shop IA; touch gallery; utility collision fix |
| Premium motion | Single motion language; hover system |
| Customer-facing polish | CTAs, honesty of promises, Console gated for anonymous |

### Explicitly out of RC8.1

- Room spatial planners (Office/Hotel/… AI layouts) — **future**
- Full AR
- Enterprise dashboards / admin (RC8.2)
- Production quality certification (RC8.3)
- Release commit (RC8.4)

### Exit criteria (planning)

- Critical gap IDs in `RC8.0A-priority-matrix.md` closed or waived in writing
- No marketing fixture claimed as production catalogue truth
- Conversion paths write CRM/Sales under Policy (or documented interim)

---

## RC8.2 — Enterprise Workspace

**Goal:** Complete authenticated operational / professional UI over existing RC7 backends without new business engines.

### Includes

| Area | Examples |
|---|---|
| Dashboards | Module + executive surfaces de-fixtured where data exists |
| CRUD screens | Remaining entity UIs bound to CQRS |
| Settings | Org/user preferences beyond marketing theme toggle |
| Reports | Reporting module UI over read models |
| Administration | Platform admin flows |
| DAM UI | Upload/browse/version beyond marketing |
| Collaboration UI | Notes/comments/attachments operator UX |
| Jobs UI | Background job list/status |
| Notification center | In-app + preferences |
| Role / permission management | Identity admin UX (Policy remains engine) |
| User / company / workspace / organization profiles | |
| Remaining enterprise pages | Portal hardening, workflow/approval ops polish |

### Architecture constraints

Policy sole authorizer · Workflow/Approval ownership unchanged · Reporting/Search read-only · DAM owns files.

### Exit criteria (planning)

- No production fixture fallback for claimed enterprise surfaces
- Permission-gated navigation consistent with RC5

---

## RC8.3 — Production Quality

**Goal:** Make RC8.1 + RC8.2 surfaces release-grade in quality attributes.

### Includes

- Accessibility (keyboard, focus, ARIA, contrast, reduced motion, alt text)
- Performance (LCP, CLS, INP, images, bundle)
- SEO (meta, OG/Twitter, JSON-LD, sitemap, robots, canonicals)
- Responsive audit pass (desktop → mobile → ultra-wide)
- Loading / empty / error states completeness
- Confirmation dialogs
- Keyboard shortcuts (documented + tested)
- Dark mode consistency (marketing + app)
- Cross-browser testing
- Regression testing
- End-to-end testing (critical CX + authz paths)

### Exit criteria (planning)

- Documented a11y/perf/SEO budgets met or waived
- E2E suite green on critical journeys

---

## RC8.4 — Release Readiness

**Goal:** Final gate before production release commit.

### Includes

- Final product audit (CX + enterprise)
- Security review
- Performance review
- UX consistency review
- Documentation freeze
- Release reports
- Production sign-off
- **Final production commit** (only when explicitly authorized)

### Exit criteria (planning)

- Written sign-off artifact
- No Critical open defects without owner + waiver

---

## Suggested dependency order

```text
RC7 backend (done)
    → RC8.0 / RC8.0A audits (docs)
        → RC8.1 CX implementation
            → RC8.2 Enterprise UI (can overlap late RC8.1 for non-conflicting teams)
                → RC8.3 Quality (continuous, hard gate before 8.4)
                    → RC8.4 Release readiness
```

## Stop rule

**RC8.1 must not start** until RC8.0A documents are accepted. This file does not authorize implementation.
