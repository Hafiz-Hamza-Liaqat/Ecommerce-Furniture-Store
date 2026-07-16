# RC1 — Release Readiness Checklist

- [x] Public website routes reachable; sitemap/robots present
- [x] Auth: login, register, password reset, email verification, MFA, logout path, security devices
- [x] Route protection for `/app`, `/admin/platform`, `/portal`
- [x] Workspace shell: nav, breadcrumbs, palette, notifications, theme
- [x] Executive dashboard widgets/KPIs reachable
- [x] ERP modules mounted (Sales → Reporting)
- [x] Workflow & Approvals no longer empty stubs
- [x] BI / AI / Integrations / SaaS ops / Portal reachable
- [x] PWA manifest + service worker present
- [x] Broken analytics deep-links fixed
- [x] Typecheck pass
- [x] Lint pass
- [x] Build pass
- [x] Architecture packs untouched
- [x] Validation reports published under `docs/release/`
- [ ] RC2 — Real backend integration & production data validation (**await explicit approval**)

**RC1 status: COMPLETE — stop. Do not start RC2 without approval.**
