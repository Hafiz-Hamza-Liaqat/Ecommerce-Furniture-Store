# RC4 — Release Certification

**Release:** Artisan Furnish Hub — Release Candidate 4  
**Focus:** Enterprise Production Security, Resilience & Operational Readiness  
**Date:** 2026-07-16

---

## Executive summary

RC4 validated security, resilience, configuration, deployment artifacts, data integrity, observability, API surface, PWA, and cross-browser compatibility **without expanding product scope**. Critical defects were fixed: **consumer/outbox background workers**, **rate limiting**, **MFA challenge verification**, **transport security headers**, **production CORS enforcement**, and **upload validation**.

The platform is **certified for RC5 Production Deployment & Go-Live Execution** with one documented residual risk: **session tokens in browser localStorage** (mitigate via CSP + RC5 cookie migration).

---

## Quality gates

| Gate | Result |
|------|--------|
| No new features / modules / APIs | ✅ |
| Architecture unchanged | ✅ |
| CQRS / SQL / Workflow / Policy unchanged | ✅ |
| Typecheck (api, identity, runtime-host, web) | ✅ |
| Lint (api, identity, runtime-host, web) | ✅ |
| Web production build | ✅ |
| `npm run harden -w @afh/runtime-host` | ✅ |

---

## Risk register

| ID | Risk | Severity | Status | Action |
|----|------|----------|--------|--------|
| R1 | Session tokens in localStorage (XSS) | Critical | Open | RC5: httpOnly cookie refresh |
| R2 | Single-process in-memory rate limit | Medium | Mitigated | Edge rate limit in RC5 deploy |
| R3 | SQLite file DB (not HA cluster) | Medium | Accepted | Backup script + runbook |
| R4 | Metrics/traces in-memory only | Low | Accepted | Prometheus adapter in RC5 |
| R5 | ERP list grids presentation-only | Low | Accepted | RC2 inventory — no List* APIs |
| R6 | enableMfaHook sets flag before TOTP enroll | Medium | Partial | Sign-in requires valid challenge token |

---

## Known limitations

1. No cloud deployment performed (RC4 charter)
2. No automated cross-browser E2E suite
3. DAM binary storage not wired (metadata-only uploads)
4. SaaS billing/portal aggregates remain fixture-backed
5. Network broker reconnect N/A (embedded SQLite broker)

---

## Production readiness checklist

- [x] Security audit complete
- [x] Resilience scenarios pass harden gate
- [x] Production config template (`docs/operations/env.example`)
- [x] Docker + nginx templates
- [x] Backup script
- [x] Health probes validated
- [x] MFA fail-closed on sign-in
- [x] Rate limiting on auth + dispatch
- [x] Consumer + outbox workers running
- [x] No secrets committed
- [x] All RC4 reports generated

---

## Deliverables

1. [RC4-security-audit.md](./RC4-security-audit.md)
2. [RC4-resilience-report.md](./RC4-resilience-report.md)
3. [RC4-production-config.md](./RC4-production-config.md)
4. [RC4-deployment-readiness.md](./RC4-deployment-readiness.md)
5. [RC4-data-integrity.md](./RC4-data-integrity.md)
6. [RC4-observability.md](./RC4-observability.md)
7. [RC4-api-validation.md](./RC4-api-validation.md)
8. [RC4-pwa-validation.md](./RC4-pwa-validation.md)
9. [RC4-browser-validation.md](./RC4-browser-validation.md)
10. This certification document

---

## Go / No-Go recommendation

### **GO** for RC5 — Production Deployment & Go-Live Execution

**Conditions:**
1. Set explicit `AFH_CORS_ORIGIN` and all `AFH_SECRET_*` in target environment
2. Deploy behind TLS (nginx template) with HSTS
3. Schedule SQLite backups via `scripts/backup-sqlite.sh`
4. Plan RC5 item R1 (httpOnly session cookies) before public internet exposure at scale

---

## RC4 code changes summary

| Area | Files |
|------|-------|
| Transport security | `packages/api/src/transport/node-http.ts` |
| Rate limiting | `packages/api/src/rate-limit/rate-limit.ts`, auth-routes, create-production-host |
| MFA verification | `packages/identity/src/authentication/authentication-service.ts` |
| Company binding | `packages/api/src/auth/authentication.ts`, upload routes |
| Upload MIME | `packages/api/src/dto/validation.ts` |
| Production CORS | `packages/runtime-host/src/config/runtime-config.ts` |
| Consumer/outbox workers | `packages/runtime-host/src/host/create-production-host.ts` |
| CSP | `packages/web/index.html` |
| Deploy templates | `deploy/*`, `scripts/backup-sqlite.sh`, `docs/operations/env.example` |

---

**Stop condition met.** Awaiting explicit approval before RC5 — Production Deployment & Go-Live Execution.
