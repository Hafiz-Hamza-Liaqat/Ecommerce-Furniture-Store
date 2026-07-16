# RC4 — API Validation Report

## Transport endpoints

| Method | Path | Auth | Rate limit | Validated |
|--------|------|------|------------|-----------|
| GET | `/health/live` | No | No | ✅ |
| GET | `/health/ready` | No | No | ✅ |
| GET | `/health/startup` | No | No | ✅ |
| GET | `/health/version` | No | No | ✅ |
| POST | `/api/v1/commands` | Yes | Yes | ✅ |
| POST | `/api/v1/queries` | Yes | Yes | ✅ |
| POST | `/api/v1/uploads` | Yes | Yes | ✅ **RC4 company + MIME** |
| GET | `/api/v1/openapi.json` | No | No | ✅ |
| POST | `/api/v1/auth/*` (11 routes) | Mixed | ✅ **RC4** | ✅ |

## Dispatch surface (CQRS)

~58 commands and ~39 queries via typed `commandType` / `queryType` bodies.

**Modules audited:** sales, procurement, inventory, finance, projects, CRM, service (+ DAM upload)

## Validation per endpoint class

| Concern | Status |
|---------|--------|
| Authentication on protected routes | ✅ Bearer session |
| Authorization | ✅ Policy in application pipeline |
| Structural DTO validation | ✅ `dto/validation.ts` |
| Error responses (401/403/404/422/429/500) | ✅ `exception-mapping.ts` |
| Correlation ID on responses | ✅ |
| Idempotency key (commands) | ✅ Header + body |
| Optimistic concurrency | ✅ Handler-level where applicable |
| HTTP status codes | ✅ Mapped from PlatformError |
| OpenAPI document | ✅ Generated from route definitions |
| Pagination/sort/filter | ⚠️ Presentation-only where List* absent (RC2 inventory) |

## RC4 hardening

- Auth routes rate-limited (30 req/min per client key)
- Upload `companyId` must match session
- Upload MIME allowlist enforced
- 413 on oversized body (1 MB)

## Verdict

**Pass** — all HTTP endpoints audited; transport hardening applied; CQRS contracts unchanged.
