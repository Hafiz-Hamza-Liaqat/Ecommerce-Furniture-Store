# Phase 3F — Search, Reporting & Notification Foundation

**Status:** Implemented  
**Packages:** `@afh/search`, `@afh/reporting`, `@afh/notifications`  
**Depends on:** Phase 1A Shared Kernel  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable platform foundations for Search, Reporting, and Notifications: domain models, repository interfaces, structural validators, event contracts, and composition roots only.

No search engines, report generation, notification providers, Event Bus, persistence, transport, or business modules.

## Packages

| Package | Composition root | Role |
|---------|------------------|------|
| `packages/search` | `createSearchFoundation()` | Infrastructure-neutral search contracts |
| `packages/reporting` | `createReportingFoundation()` | Presentation-owner reporting contracts |
| `packages/notifications` | `createNotificationFoundation()` | Transport-independent notification contracts |

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Reporting = presentation owner | Report/dashboard/export contracts live in `@afh/reporting` |
| Notifications via Event Bus + Settings templates | Models reference `settingsTemplateRef`; no channel senders |
| Search infrastructure-neutral | No ES/OpenSearch/SQL engine |
| Workflow / Policy / Rules / Approval | Untouched |
| No Event Bus in foundation | Event type contracts only |

## Explicit non-goals

Search engines, ranking, query parsers, charts, PDF/Excel generation, BI tools, SQL, email/SMS/push providers, workers, caching, HTTP/UI, workflow/approval/policy/rules implementations.

## Related architecture

- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md) — Reporting & Notifications sections
- [Phase 0C](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
- [Phase 0D](../architecture/02-integration/phase-0d-event-bus-integration-saga.md)
- [Phase 0F](../architecture/04-observability/phase-0f-observability-operations.md)
