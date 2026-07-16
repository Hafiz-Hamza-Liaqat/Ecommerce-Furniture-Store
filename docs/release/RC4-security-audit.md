# RC4 — Security Audit

**Release:** Artisan Furnish Hub — Release Candidate 4  
**Scope:** Validation + hardening only (no architecture / feature expansion)

## Executive summary

Policy-only authorization, parameterized SQL, session refresh rotation, and production scrypt password hashing are **architectural strengths**. RC4 closed transport-layer gaps and documented remaining browser-token risks.

## Validation matrix

| Control | Status | Evidence |
|---------|--------|----------|
| Authentication (opaque session Bearer) | ✅ Pass | `packages/api/src/auth/authentication.ts` |
| Authorization (Policy-only RBAC) | ✅ Pass | `packages/application/src/pipeline/behaviors.ts` |
| Session expiration (idle + absolute) | ✅ Pass | `packages/identity/src/session/session-service.ts` |
| Refresh token rotation + reuse detection | ✅ Pass | Session service |
| JWT signing (production) | ✅ Pass | `packages/identity-providers/src/jwt/` |
| Password policy (min 12, complexity) | ✅ Pass | `packages/identity/src/configuration/security-config.ts` |
| Account lockout | ✅ Pass | 5 failures / 15 min |
| MFA sign-in verification | ✅ **Fixed RC4** | Challenge token consumed via `#consumeChallenge` |
| Rate limiting | ✅ **Fixed RC4** | `createInMemoryRateLimitHook` on auth + dispatch |
| Security headers (API) | ✅ **Fixed RC4** | `node-http.ts`: nosniff, DENY frame, referrer, permissions |
| CORS | ✅ **Fixed RC4** | Wildcard disables credentials; production requires explicit origin |
| CSP (SPA) | ✅ **Fixed RC4** | Baseline meta in `packages/web/index.html` |
| HSTS | ⚠️ Template | `deploy/nginx.conf` — terminate TLS at proxy |
| CSRF | ✅ N/A (Bearer) | Document if cookie sessions adopted in future |
| XSS (storage) | ⚠️ Known | Session in `localStorage` — XSS risk; document for RC5 |
| SQL injection | ✅ Pass | Parameterized queries throughout `persistence-sql` |
| Upload validation | ✅ **Fixed RC4** | MIME allowlist + companyId match |
| Body size limit | ✅ **Fixed RC4** | 1 MB max in `node-http.ts` |
| Audit logging | ✅ Pass | `SecurityAuditService` + SQL store |
| Secret handling | ✅ Pass | `AFH_SECRET_*` env refs; `docs/operations/env.example` |
| Production CORS wildcard | ✅ **Fixed RC4** | `assertProductionRuntimeConfig` rejects `*` |

## RC4 fixes applied

1. **Transport security headers** on all API responses
2. **CORS credentials** disabled when origin is `*`
3. **Production CORS** must be explicit (fail-fast)
4. **In-memory rate limiting** — auth 30/min, dispatch 180/min
5. **MFA fail-closed** — challenge token verification required
6. **Company header binding** — `x-company-id` must match session
7. **Upload hardening** — MIME allowlist + session company match
8. **413 payload limit** + correlation ID on transport 500/413
9. **HTTP timeouts** — request 120s, headers 65s
10. **CSP baseline** on SPA

## Residual risks (documented — not RC4 scope)

| Risk | Severity | Recommended action |
|------|----------|-------------------|
| Tokens in `localStorage` | Critical | RC5: httpOnly cookie refresh + short-lived access |
| `enableMfaHook` sets flag before provider enrollment | Medium | RC5: separate enroll/confirm MFA flow |
| No WAF / edge rate limit | Medium | Deploy nginx/Cloudflare in RC5 |
| OpenAPI public | Low | Restrict via reverse proxy if needed |
| `AFH_SECRET_API_SECRET` unused | Low | Wire to internal admin probe or remove from required |

## Verdict

**Conditional pass** — production-ready at API/runtime layer with documented browser-token limitation for RC5.
