# RC8.1 — Customer Polish Audit Report

- **Date:** 2026-07-19
- **Auditor role:** Implementation audit against verification-gap checklist
- **Commit:** not created

## Audit matrix

| ID | Gap | Severity | Resolution | Evidence |
|---|---|---|---|---|
| G1 | Mega hid Tables/Chairs | High | Removed L1/children slices; all taxonomy L1 shown | `MarketingShell.tsx` mega map |
| G2 | Thin category filters | High | Eight production facets + URL params | `CategoryPage.tsx` |
| G3 | No desktop/mobile filter chrome | Medium | Sidebar + drawer | `cx-filters*` CSS + CategoryPage |
| G4 | Gallery missing pinch / dual-pane | High | Pinch scale + pane background magnifier | `ProductGallery.tsx` |
| G5 | Gallery preload weak | Medium | Preload ±1/±2 + first frames | `ProductGallery.tsx` |
| G6 | 360 missing inertia/reset/ESC/spinner | High | Implemented | `ProductSpinViewer.tsx` |
| G7 | Planner qty/remove missing | High | Editable lines + live `utilization` | `BudgetPlannerPage.tsx` |
| G8 | Planner PDF weak | Medium | Printable HTML export | `downloadPlannerPdf` |
| G9 | Quote not wired | Medium | `/quote?from=planner&lines=` + CRM queue | BudgetPlannerPage |
| G10 | Compare no sticky/diff | Medium | Sticky thead/first col + `.is-diff` | ComparePage + CSS |
| G11 | Wishlist no Move to Compare | Medium | `moveWishlistToCompare` | stores + WishlistPage |
| G12 | Search loading / mobile drawer | Medium | Loading state + drawer class | MarketingShell SiteSearch |
| G13 | Mixed motion | Medium | Unified `--cx-*` + `cx-motion-*` | marketing.css |
| G14 | Generic skeletons | Medium | Path-aware + in-page skeletons | PageSkeleton + CategoryPage |

## Boundary audit

| Rule | Finding |
|---|---|
| Customer-facing only | PASS — changes confined to `packages/web` marketing CX + CSS |
| No backend architecture | PASS |
| No RC8.2 Enterprise Workspace | PASS |
| No Policy/Workflow/Approval/CQRS/repo redesign | PASS |

## Residual risk

| Risk | Level | Notes |
|---|---|---|
| Presentation catalogue vs live Commerce | Known | Documented; not in RC8.1 polish scope |
| Browser PDF vs binary PDF | Low | Acceptable for CX polish |
| Dual-pane magnifier hidden on narrow viewports | Low | Intentional responsive fallback |

## Audit verdict

**PASS** — verification gaps from the prior RC8.1 quality review are closed for this polish pass. Do not treat as commit approval.
