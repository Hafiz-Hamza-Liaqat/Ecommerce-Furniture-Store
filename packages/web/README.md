# @afh/web

Enterprise **Web & Admin Frontend** (Phase 8A).

Presentation-only SPA that consumes the Phase 7A API transport. No business rules, Policy, Workflow, Approval, Rules, or calculations run in the browser.

## Run

```bash
# API (separate host process)
# Frontend
npm run dev -w @afh/web
```

Vite proxies `/api` and `/health` to `http://127.0.0.1:8080`.

## Features

- Application shell, navigation, theme, responsive layout
- Authentication UI (sign-in, logout, password reset, email verification, MFA)
- Dashboard framework (widgets, charts placeholders, activity)
- Reusable API client (commands, queries, auth, uploads, correlation)
- Presentation modules for Sales…Reporting / DAM / Notifications
- Accessibility: skip link, focus styles, ARIA on nav/alerts/spinners

## Architecture

| Concern | Owner |
|---------|-------|
| Authorization | Backend Policy |
| Lifecycle | Backend Workflow |
| Calculations | Backend Rules |
| Approvals | Backend Approval |
| Assets | Backend DAM |
| Reporting | Backend Reporting |
| Publish path | Backend Outbox |

## Out of scope

Domain engines, SQL, Event Bus, search indexing, notification delivery.
