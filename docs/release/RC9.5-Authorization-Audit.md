# RC9.5 — Authorization Audit

**Status:** Verified — awaiting review  
**Date:** 2026-07-20

## Source of truth

Application pipeline `AuthorizationBehavior` → Identity **Policy Engine** (permission → company isolation → scope binding). Web `RequirePermission` is presentation-only and fail-closed on load error.

## Verified

- Company header mismatch rejected on authenticated requests
- Route permission catalog remains UI gate; can be disabled for presentation but API Policy still enforces
- Workspace `role-home` routing is presentation only
- Portal soft-land without hard 403 for missing portal permission (UX); API still Policy-gated
- Upload routes require `dam.assets.upload` (existing RC5.4 tests)

## Role matrix (expected)

| Surface | Guest | Authenticated buyer | Staff roles | Admin |
|---------|-------|---------------------|-------------|-------|
| Marketing | Public | Public | Public | Public |
| Workspace / ERP | Redirect login | Policy-gated | Policy-gated | Policy-gated |
| Admin routes | Deny | Deny unless permission | Role permissions | Broad grants |

## Residual

UI route guards optional via flag — Accepted (API remains authoritative).
