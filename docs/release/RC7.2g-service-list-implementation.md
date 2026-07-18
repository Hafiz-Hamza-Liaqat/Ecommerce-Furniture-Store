# RC7.2g — Service List Implementation Report

- **Date:** 2026-07-18
- **Slice:** Service List* (`ListServiceRequest`, `ListWorkOrder`, `ListAppointment`, `ListTechnicianAssignment`)
- **Depends on:** RC7.2d (`6e8f48b`), RC7.1 (`1fb1a26`), ADR D56
- **Status:** Implementation complete — **awaiting review; not committed**

## Delivered

- Four List* handlers via unmodified `buildAuthorizedListPage` + `principalListScope`
- CQRS name `ListTechnicianAssignment` (freeze “ListTechnician as modeled”)
- `WorkOrderRepository.listByCompany` + `TechnicianAssignmentRepository.listByCompany` — RC7.1 contract completions only
- 62 tests (15×4 + Get/lifecycle regression)

## Suggested commit message (do not commit until approved)

```
feat(rc7.2g): add Service List* queries using shared authorized list foundation
```
