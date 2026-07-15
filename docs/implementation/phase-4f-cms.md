# Phase 4F — CMS & Content Management Domain Foundation

**Status:** Implemented  
**Package:** `@afh/cms`  
**Depends on:** Phase 1A Shared Kernel  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable CMS domain foundation: content kinds (page, article, news, FAQ, KB, etc.), navigation, taxonomy, versioning contracts, SEO metadata, localization, cross-domain references, event contracts, repository interfaces, structural validators, and `createCmsFoundation()`.

No publishing/rendering engines, search indexing, notification delivery, workflow execution, Event Bus, persistence implementations, or HTTP.

## Package path

`packages/cms`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Workflow = lifecycle SSoT | Content status is metadata only |
| DAM owns files | Asset id references only |
| Reporting owns presentation | Report definition refs only |
| Search owns indexing | Search index refs only |
| Notifications own delivery | Notification id refs only |
| Policy = sole runtime authz | No permission implementation |
| No Event Bus in foundation | Event type contracts only |

## Explicit non-goals

Workflow/approval execution, publishing engine, search indexing, notification delivery, Event Bus, outbox/inbox, database/SQL/ORM, APIs/HTTP/UI, rendering, AI content generation, version comparison engine, authentication.

## Related architecture

- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 0C CMS](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
- [Phase 0D Integration](../architecture/02-integration/phase-0d-event-bus-integration-saga.md)
