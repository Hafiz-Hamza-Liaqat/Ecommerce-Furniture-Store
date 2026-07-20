# RC9 — Premium Experience Track

- **Created:** 2026-07-19
- **Last Updated:** 2026-07-20
- **Status:** RC9.1–RC9.4.3 committed · **RC9.5 implemented — review**

## Relationship to RC8

RC8 is **COMPLETE AND FROZEN**. RC9 is customer UI/content polish and customer-facing AI only (RC9.5 is engineering hardening).

## Roadmap

| Release | Focus | Status |
|---|---|---|
| **RC9.1** | Premium UI Polish (+ catalog/blog CX) | **Committed** |
| **RC9.2** | Intelligent Furniture Consultant (Grounded AI) | **Committed** |
| **RC9.3** | Intelligent Budget Planner & Space Planning | **Committed** |
| **RC9.4** | Persistence & Collaboration | **Committed** (`rc9.4.3`) |
| **RC9.4.1** | Nav, dashboards, notifications | **Committed** |
| **RC9.4.2** | Design token consolidation | **Committed** |
| **RC9.4.3** | Brand identity & responsive polish | **Committed** |
| **RC9.5** | Security hardening & production readiness | **Implemented — review** |
| RC9.6+ | — | **Do not start** |

## Document map (RC9.5)

| Doc | Path |
|---|---|
| Security Hardening | `docs/release/RC9.5-Security-Hardening-Report.md` |
| Authentication Audit | `docs/release/RC9.5-Authentication-Audit.md` |
| Authorization Audit | `docs/release/RC9.5-Authorization-Audit.md` |
| Persistence Verification | `docs/release/RC9.5-Persistence-Verification.md` |
| API Resilience | `docs/release/RC9.5-API-Resilience-Report.md` |
| Performance | `docs/release/RC9.5-Performance-Report.md` |
| Monitoring | `docs/release/RC9.5-Monitoring-Report.md` |
| SEO Audit | `docs/release/RC9.5-SEO-Audit.md` |
| Accessibility | `docs/release/RC9.5-Accessibility-Report.md` |
| Cross-Browser | `docs/release/RC9.5-Cross-Browser-Report.md` |
| Production Readiness (+ Risk Register) | `docs/release/RC9.5-Production-Readiness-Checklist.md` |
| Test Summary | `docs/release/RC9.5-Test-Summary.md` |

## Constraints (RC9.5)

- Engineering quality only — security, resilience, persistence integrity, monitoring, docs
- **No** UI redesign / branding / nav structure changes (except security messaging / a11y)
- **No** new server CX sync APIs
- **No** automatic commit, push, tag, or deploy — await manual approval
- **Do not** begin RC9.6 until RC9.5 is approved
