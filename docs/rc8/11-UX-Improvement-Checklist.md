# 11 — UX Improvement Checklist

- **Audit ID:** RC8.0-CX-11
- **Use:** Phase A backlog grooming (documentation only)

## Critical

- [ ] Author furniture taxonomy (L1/L2) matching mega-menu vision
- [ ] Rebuild mega menu (desktop + mobile drawer) from taxonomy
- [ ] Dedicated routes for category/subcategory landing pages
- [ ] Replace fixture catalogue with published commerce read model
- [ ] Faceted filters + sort + empty states + URL state
- [ ] Amazon-style ProductGallery (zoom, fullscreen, thumbs, touch, keyboard)
- [ ] Fix unknown product id → real 404 (CX-D1)
- [ ] Wire inquiry/quote/demo/newsletter to CRM/Sales with consent
- [ ] Product + BreadcrumbList JSON-LD; breadcrumbs UI
- [ ] Mobile shop IA and non-colliding floating actions

## High

- [ ] Variant/finish selectors on PDP tied to SKU matrix
- [ ] Availability + lead time from inventory/rules (honest)
- [ ] Downloads center (PDF, CAD, care) via DAM
- [ ] 360° spin viewer for hero SKUs (relabel booklet until ready)
- [ ] Wishlist + compare
- [ ] Recently viewed + merchandised related/cross-sell
- [ ] Customer search typeahead over live index
- [ ] Budget / room / end-use planner (Rules-backed)
- [ ] Public AI consultant shell + sales escalation (after catalogue grounding)
- [ ] Single motion system tokens; reduce booklet noise
- [ ] Alt text from DAM; gallery a11y
- [ ] Sitemap includes products + category URLs

## Medium

- [ ] Services / Support / Downloads public pages
- [ ] Journal article routes (CMS-driven)
- [ ] News detail pages
- [ ] Sticky compact header with persistent Quote CTA
- [ ] Mega hover-intent delay + keyboard disclosure pattern
- [ ] Cookie accept/reject categories
- [ ] Ultra-wide PDP layout polish
- [ ] Image CDN / AVIF-WebP / srcset pipeline
- [ ] Remove or hide Console from primary public nav for anonymous users
- [ ] Dealer / showroom locator (if commercial model requires)

## Low

- [ ] Count-up stats (optional)
- [ ] Testimonial carousel polish
- [ ] Multi-language
- [ ] Room preview / AR (future)
- [ ] Saved searches
- [ ] Advanced synonyms / search personalization

## Performance (track into Phase C)

- [ ] LCP: optimized hero; preload only LCP asset
- [ ] CLS: image dimensions / aspect boxes
- [ ] INP: debounce filters; defer 360/3D
- [ ] Bundle: code-split gallery/viewer/planner
- [ ] Caching / compression at edge

## SEO (track into Phase A/C)

- [ ] Canonical correctness per SKU/category
- [ ] OpenGraph/Twitter already partial — extend for products
- [ ] Robots/sitemap completeness
- [ ] No soft-404 product URLs

## Architecture checklist (never violate)

- [ ] No new authz engine — Policy only
- [ ] No Workflow/Approval ownership changes
- [ ] No RC7.1 paging fork
- [ ] Costing in Rules; files in DAM; search/reporting read-only
- [ ] Marketing fixtures never claimed as production truth
