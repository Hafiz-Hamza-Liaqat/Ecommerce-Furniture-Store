# Phase 4G — Human Resources & Workforce Foundation

**Status:** Implemented  
**Package:** `@afh/hr`  
**Depends on:** Phase 1A Shared Kernel  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Reusable HR domain foundation: employment profiles, org structure, workforce groups/membership, attendance and leave contracts, skills/certifications, payroll references, cross-domain references, event contracts, repository interfaces, structural validators, and `createHumanResourcesFoundation()`.

No payroll/attendance/leave engines, recruitment, performance reviews, scheduling, workflow/approval execution, Event Bus, persistence implementations, or HTTP.

## Package path

`packages/hr`

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Identity owns principals | Employee links to `userId`; no auth |
| Workflow = lifecycle SSoT | Leave status is metadata only |
| Policy = sole runtime authz | No authorization logic |
| Trades ≠ RBAC roles | Workforce groups / team membership |
| Finance owns money | Payroll profile / cost center refs only |
| DAM owns files | Document asset refs only |
| No Event Bus in foundation | Event type contracts only |

## Explicit non-goals

Payroll engine, attendance engine, leave engine, recruitment, performance reviews, scheduling, shift allocation, workflow/approval execution, Event Bus, outbox/inbox, database/SQL/ORM, APIs/HTTP/UI, authentication/authorization.

## Milestone note

With Phase 4G complete, major enterprise bounded-context foundations are in place. Subsequent work can move to runtime infrastructure (adapters, Event Bus wiring, APIs, application services, workflows) per the frozen architecture.

## Related architecture

- [Phase 0A Laws](../architecture/00-foundation/phase-0a-enterprise-architecture-laws.md)
- [Phase 0C Identity / Employees](../architecture/01-domain/phase-0c-enterprise-domain-service-architecture.md)
- [Phase 0E Security](../architecture/03-security/phase-0e-enterprise-security-architecture.md)
