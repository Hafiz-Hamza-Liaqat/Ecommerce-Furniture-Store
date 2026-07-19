# RC8.1 — Customer Polish Report

- **Date:** 2026-07-19
- **Scope:** Focused customer-experience polish only (not RC8.2)
- **Commit status:** **NOT approved for commit** — awaiting review
- **Architecture:** No backend / Policy / Workflow / Approval / CQRS / RC7 foundation changes

## Gaps closed

| Area | Before (verification fail) | After |
|---|---|---|
| Mega navigation | L1 truncated via `.slice(0, 6)` — Tables/Chairs hidden | All L1 categories (incl. Tables, Chairs) + all children |
| Category filters | Collection + search only | Price, Material, Brand, Collection, Color, Availability, Rating, Dimensions |
| Filter chrome | Toolbar only | Desktop left sidebar · Mobile slide-over drawer |
| Gallery | Hover scale only | Pinch zoom · dual-pane magnifier · neighbor preload · keyboard polish |
| 360 viewer | Basic scrub | Inertia · Reset · ESC fullscreen · spinner · smoother drag |
| Budget planner | Static lines · `window.print` | Editable qty · remove · live totals · HTML/print PDF export · `/quote?from=planner&lines=` |
| Compare | Plain table | Sticky header · diff highlight · sticky first column |
| Wishlist | Remove / quote only | **Move to Compare** (local persistence retained) |
| Search | Instant list | Loading indicator · mobile drawer treatment · fade transition |
| Motion | Mixed styles | Unified `--cx-*` language (soft fade-up, subtle lift/scale) |
| Skeletons | Generic page block | Category/filters/grid · gallery · planner · compare |

## Key files touched

- `packages/web/src/marketing/MarketingShell.tsx` — mega + search + path skeletons
- `packages/web/src/marketing/pages/CategoryPage.tsx` — production filters + layout
- `packages/web/src/marketing/components/ProductGallery.tsx`
- `packages/web/src/marketing/components/ProductSpinViewer.tsx`
- `packages/web/src/marketing/pages/BudgetPlannerPage.tsx`
- `packages/web/src/marketing/pages/ComparePage.tsx`
- `packages/web/src/marketing/pages/WishlistPage.tsx`
- `packages/web/src/marketing/data/catalogue.ts` — filter facets on SKUs
- `packages/web/src/marketing/cx/stores.ts` — `moveWishlistToCompare`
- `packages/web/src/styles/marketing.css` — motion + chrome
- `packages/web/src/marketing/cx/cx.test.ts`

## Explicit non-goals (honored)

- Enterprise Workspace (RC8.2) not started
- No live Commerce publish / Search CQRS for anonymous catalogue
- Quotation deep integration remains presentation → `/quote` + CRM lead queue (Sales command when authenticated remains existing path)

## Verdict

**Polish pass complete.** Ready for human review before any RC8.1 commit.
