# RC1 — API Integration Verification Report

## Frontend → existing APIs

| Client method | Endpoint | Validation |
|---------------|----------|------------|
| `signIn` | `POST /api/v1/auth/sign-in` | Error + MFA handling |
| `register` | `POST /api/v1/auth/register` | **Added** — wraps Identity.register |
| `signOut` | `POST /api/v1/auth/sign-out` | Used by security center |
| `getSession` | `GET /api/v1/auth/session` | Security center probe |
| Password reset / email verify / MFA | Existing auth paths | Unchanged |
| `dispatchCommand` / `dispatchQuery` | `/api/v1/commands` `/api/v1/queries` | Module/CQRS transport unchanged |
| `upload` | `/api/v1/uploads` | Unchanged |
| `healthReady` / live / startup / version | `/health/*` | Deployment center |

## UX around API

- Unauthorized → session clear / login redirect (existing client hook)
- Loading / empty / error / retry states present on module + platform health surfaces
- No new ERP business APIs introduced
- Developer-mode API warnings remain gated (no production console spam)

## Explicit non-goals (RC2)

Live approval decision commands, live security audit store queries, live billing provider charges.
