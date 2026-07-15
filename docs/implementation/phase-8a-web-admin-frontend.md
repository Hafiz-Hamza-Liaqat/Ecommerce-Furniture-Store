# Phase 8A — Enterprise Web & Admin Frontend Integration

**Status:** Implemented  
**Package:** `@afh/web`  
**Depends on:** Phase 7A API Transport, Phases 0A–7D  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Presentation-only React SPA that integrates the production-ready backend exclusively through the API transport. Thin auth HTTP routes were added to `@afh/api` so the UI can authenticate without embedding Identity services in the browser.

## Package path

`packages/web`

## API additions (thin transport)

| Path | Purpose |
|------|---------|
| `POST /api/v1/auth/sign-in` | Identity `signIn` |
| `POST /api/v1/auth/sign-out` | Identity `signOut` |
| `GET /api/v1/auth/session` | Current session |
| `POST /api/v1/auth/password-reset/*` | Reset request/confirm |
| `POST /api/v1/auth/email-verification/*` | Verify request/confirm |
| `POST /api/v1/auth/mfa/enable` | MFA hook |
| CORS on Node HTTP adapter | SPA local development |

Controllers authenticate / map DTOs only — **Policy remains sole authorization**.

## Deliverables

| Deliverable | Location |
|-------------|----------|
| Enterprise shell | `src/shell` |
| Authentication UI | `src/auth` |
| Dashboard framework | `src/dashboard` |
| API client | `src/api` |
| Forms | `src/forms` |
| Business modules | `src/modules` |
| Workflow / Approval / Search / Reporting / Notifications | `src/pages` |
| DAM upload UI | `src/pages/DamPage.tsx` |
| Theme + responsive + a11y | `src/styles`, skip link, focus rings |

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Frontend consumes APIs only | `ApiClient` → `/api/v1/*` |
| No duplicated business logic | Modules dispatch command/query types only |
| No UI authorization | Session gate only; Policy on server |
| Workflow / Approval / Rules / Reporting / DAM | Display / submit / render / upload only |
| Architecture pack untouched | No edits under `docs/architecture/` |

## Explicit non-goals

Business rules, engines, pricing/tax, inventory allocation, financial posting, Event Bus, SQL, search engine, notification delivery.

## Related

- [Phase 7A API Transport](./phase-7a-api-transport.md)
- [Phase 7D Production Readiness Audit](./phase-7d-production-readiness-audit.md)
