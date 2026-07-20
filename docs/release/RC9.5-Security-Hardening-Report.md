# RC9.5 — Security Hardening Report

**Status:** Implemented — awaiting review  
**Date:** 2026-07-20  
**Scope:** Close production security gaps on existing Phase 9B / Identity / API foundations. No UI redesign. No new business features.

## Baseline reused

- Opaque session + hashed refresh rotation / family revoke on reuse
- Policy Engine RBAC + company isolation
- In-memory rate limit (production host)
- Security headers: nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP, CORP
- SPA meta CSP in `packages/web/index.html`
- Production CORS rejects `*` (`assertProductionRuntimeConfig`)

## Changes delivered

| Control | Change |
|---------|--------|
| HSTS | `Strict-Transport-Security: max-age=31536000; includeSubDomains` when `enableHsts` (production profile) |
| Challenge tokens | Production responses return `{ sent: true }` only; tokens revealed only when `revealChallengeTokens` (non-production) |
| Register tenant | Client `companyId` ignored; always `null` on unauthenticated register |
| Client IP/UA | Derived from transport (`clientAddress` / `User-Agent`); body IP ignored; `AFH_TRUST_PROXY` optional |
| Uploads | Audited existing DAM upload router: MIME allow-list, size limit (`DEFAULT_MAX_ASSET_BYTES`), required mime when body present. Virus scan hook: **future** |
| Secrets | `AFH_SECRET_*` via runtime-host; `npm audit --omit=dev` → **0 vulnerabilities** |

## File upload validation

| Check | Status |
|-------|--------|
| MIME allow-list | Present (`ALLOWED_ASSET_MIME_TYPES`) |
| Size limits | Present |
| Filename sanitization | Metadata-driven; bytes via ObjectStore |
| Storage path validation | ObjectStore abstraction |
| Virus scan | Deferred (future) |

## Residual / accepted risks

See Production Readiness Checklist Risk Register.

## Stop rule

No push, tag, deploy, or automatic commit until manual approval.
