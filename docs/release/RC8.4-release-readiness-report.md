# RC8.4 — Release Readiness Report

- **Date:** 2026-07-19
- **Depends on:** RC8.1 (committed), RC8.2 (committed), RC8.3 (implemented — review)
- **Commit:** none (blocked pending review)

## Readiness summary

Artisan Furnish Hub is positioned as a **release candidate** for production quality gates under the frozen architecture pack:

- Customer experience (RC8.1) complete
- Enterprise workspace live CQRS bindings (RC8.2) complete
- Production UI quality (RC8.3) complete pending commit
- Runtime verify / harden / accept green

## Go / No-Go checklist

| Item | Status |
|---|---|
| Build / typecheck / lint | GO |
| Web regression tests | GO (76/76) |
| Runtime verify / harden / accept | GO |
| Architecture freeze intact | GO |
| Accessibility production polish | GO (notes in a11y report) |
| SEO customer surfaces | GO (placeholder domain) |
| Error / offline handling | GO |
| Dark mode / responsive | GO WITH NOTES |
| Security review (Policy sole authz) | GO — see RC8.4-security-review |
| Browser E2E / axe CI | GO WITH NOTES — Playwright suite added (`npm run test:e2e -w @afh/web`); CI wiring optional |
| Admin HR/Jobs permissions | GO — host startup seeds RBAC catalog |
| Lighthouse (prod build) | GO — see `docs/release/lighthouse/SUMMARY.md` |
| Device QA (physical) | PENDING — checklist in `device-qa-checklist.md` |
| Edge deployment validation | PENDING — checklist in `production-deployment-validation.md` |

## Recommendation

**PROCEED TO RELEASE CANDIDATE** after RC8.3/RC8.4 commit approval. Complete physical device QA and edge deployment checklist before public launch. See [production-readiness-followup.md](./production-readiness-followup.md).
