# RC9.5 — Production Readiness Checklist

**Status:** Implemented — awaiting review  
**Date:** 2026-07-20

## Environment / secrets

| Item | Status |
|------|--------|
| `AFH_PROFILE=production` | Required |
| `AFH_CORS_ORIGIN` non-`*` | Enforced by assert |
| `AFH_SECRET_*` / requireSecrets | Production default true |
| `AFH_TRUST_PROXY` | Optional; default false |
| HSTS | Enabled for production profile via `enableHsts` |
| Challenge tokens | Hidden in production (`revealChallengeTokens=false`) |
| OpenAPI | Off by default staging/production |

## Dependency freshness

- `npm audit --omit=dev` → **0 vulnerabilities** (2026-07-20)
- No feature dependency upgrades in RC9.5
- Security-critical updates: none required

## Gates run

| Gate | Result |
|------|--------|
| `@afh/identity` test | Pass (incl. session RC9.5) |
| `@afh/api` test | Pass (incl. auth hardening) |
| `@afh/web` typecheck | Pass |
| `@afh/web` test | Pass |
| `@afh/web` build | Pass |
| `@afh/runtime-host` verify | Pass |

## Risk Register

| Risk | Severity | Classification | Notes |
|------|----------|----------------|-------|
| JWT not on live auth path | Low | Accepted | Opaque sessions sufficient; JWT dual-stack deferred |
| In-memory rate limit | Medium | Accepted | Single-node; distributed limiter deferred |
| Tokens in localStorage | Medium | Accepted | Cookie/httpOnly migration deferred |
| CX persistence local-only | Medium | Deferred | Server sync → RC10+ |
| Challenge delivery out-of-band | Medium | Deferred | Email/SMS providers; tokens hidden in prod API |
| Safari manual QA pending | Low | Future work | Manual before public launch |
| MFA step-up incomplete | Medium | Deferred | Config flags exist; high-risk step-up later |
| Lead queue no server flush | Low | Deferred | Offline buffer only |

## Release control

- [ ] Manual review complete
- [ ] Explicit commit approval
- [ ] **Do not** push / tag / deploy until approved
- [ ] **Do not** start RC9.6
