# Phase 3E — Enterprise Document & Digital Asset Foundation

**Status:** Implemented  
**Package:** `@afh/dam`  
**Depends on:** Phase 1A Shared Kernel  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable DAM-domain foundations: digital assets, immutable versions, folders/collections, metadata, documents, attachments, media derivatives, DAM event contracts, repository interfaces, structural validation, and `createDamFoundation()`.

No storage providers, upload pipelines, media processing, Event Bus, persistence implementations, HTTP, or document workflows.

## Package path

`packages/dam`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| DAM = sole file owner | Canonical asset models live here; other domains reference by id |
| Workflow = lifecycle SSoT | Asset/document status are data only |
| Policy = sole runtime authz | Visibility is metadata; no permission engine |
| Rules / Approval | Not used |
| No Event Bus in foundation | Event type contracts only |

## Explicit non-goals

File upload, storage providers, object storage, CDN, image/video processing, OCR, PDF generation, search indexing, Event Bus, workflow/approval definitions, rules content, reporting, notifications, AI, HTTP/controllers/UI, SQL/ORM/migrations.

## Related architecture

- [Master Index](../architecture/README.md)
- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 0C Domain/Service](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
- [Phase 0D Integration](../architecture/02-integration/phase-0d-event-bus-integration-saga.md)
