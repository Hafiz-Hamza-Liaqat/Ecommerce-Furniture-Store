# @afh/api

Enterprise **API & Transport Foundation** (Phase 7A).

Thin transport layer that exposes the Phase 5B Application Runtime and Phase 6A–6G business application modules. Controllers never authorize, calculate, or publish events.

## Composition

```ts
const host = createApiHost({
  repositories: { sales, procurement, inventory, finance, projects, service, crm, damAssets },
  host: "0.0.0.0",
  port: 8080,
});

await host.start();
// graceful shutdown
await host.stop();
```

## Endpoints

| Path | Purpose |
|------|---------|
| `GET /health/live` | Liveness |
| `GET /health/ready` | Readiness (infra probes) |
| `GET /health/startup` | Startup |
| `GET /health/version` | Version |
| `POST /api/v1/commands` | Dispatch command |
| `POST /api/v1/queries` | Dispatch query |
| `POST /api/v1/uploads` | Route upload metadata to DAM |
| `POST /api/v1/auth/*` | Thin Identity session auth (sign-in/out, reset, verify, MFA) |
| `GET /api/v1/openapi.json` | OpenAPI metadata |

## Ownership

| Concern | Owner |
|---------|-------|
| Authentication | Identity sessions (transport) |
| Authorization | Policy Engine (application pipeline only) |
| Lifecycle | Workflow |
| Calculations | Rules |
| Human gates | Approval |
| Event publish | Outbox |
| Digital assets | DAM |

## Out of scope

Business logic, SQL/ORM, UI, Event Bus changes, payment gateways, marketing engines.
