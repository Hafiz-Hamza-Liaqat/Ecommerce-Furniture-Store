# Phase 3D — Enterprise Project & Resource Foundation

**Status:** Implemented  
**Package:** `@afh/projects`  
**Depends on:** Phase 1A Shared Kernel  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable project-domain foundations: project models, resource references, team/membership models, task/milestone/schedule contracts, work items, project event contracts, repository interfaces, structural validation, and `createProjectFoundation()`.

No project management workflows, scheduling/allocation engines, Event Bus, persistence implementations, HTTP, or business processes.

## Package path

`packages/projects`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Workflow = lifecycle SSoT | Status fields are data only; no project workflows |
| Policy = sole runtime authz | No authorization logic |
| Rules = calculation engine | No progress/scheduling calculations |
| Approval = decision engine | No approval definitions |
| Trades ≠ RBAC roles | Team roles are labels; identity employee/user by opaque id |
| No Event Bus in foundation | Event type contracts only |

## Explicit non-goals

Project management workflows, scheduling engine, resource allocation, manufacturing jobs, service tickets, CRM activities, procurement, sales orders, inventory execution, financial posting, workflow/approval definitions, rules content, Event Bus, search, reporting, notifications, AI, HTTP/controllers/UI, SQL/ORM/migrations.

## Related architecture

- [Master Index](../architecture/README.md)
- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 0C Domain/Service](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
- [Phase 0E Security](../architecture/03-security/phase-0e-enterprise-security-architecture.md)
