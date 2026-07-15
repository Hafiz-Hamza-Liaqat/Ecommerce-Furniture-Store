# Phase 6E — Project & Resource Application Services

**Status:** Implemented  
**Package:** `@afh/projects-application`  
**Depends on:** Phase 3D Projects, Phase 5B Application Runtime, Phase 6A–6D pattern  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Fifth executable business application module. Project command and query handlers register into the Phase 5B `HandlerRegistry` and orchestrate:

- Projects repository interfaces (`@afh/projects`)
- Policy authorization (sole path via pipeline)
- Workflow lifecycle for projects, tasks, and milestones
- Rules evaluation for scheduling, resource allocation, utilization, workload balancing, and costing (no inline optimization)
- Approval submission for configured archive/assign gates
- Outbox persistence of domain events where contracts exist
- Security audit on every mutation

No HTTP, SQL, UI, scheduling engines, or Event Bus changes.

## Package path

`packages/projects-application`

## Composition

```ts
const projectsApp = createProjectApplication({
  projects, tasks, milestones, resources, teams, schedules, workItems,
  outbox, audit, handlers,
});
```

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Policy = sole authorization | Every handler provides `authorize()` |
| Workflow = lifecycle SSoT | Project/task/milestone create start workflow; transitions for lifecycle |
| Rules = evaluation engine | Scheduling/allocation/utilization/costing via RulesEngine |
| Approval = human decisions | Optional archive/assign gates; no decide logic |
| Outbox = sole publish path | Events enqueued to OutboxStore |
| Pattern parity with 6A–6D | Same composition and pipeline |

## Events used (existing foundation contracts)

| Command | Event |
|---------|-------|
| CreateProject | `projects.project.created` |
| CreateTask | `projects.task.created` |
| AssignTask | `projects.task.assigned` |
| UpdateMilestone (→ completed) | `projects.milestone.completed` |
| AssignResource | `projects.resource.assigned` |
| Update/Archive Project, Update/Complete Task, Create Milestone, Release Resource, Update Schedule | Audit only (no foundation event yet) |

## Explicit non-goals

SQL/ORM, HTTP/REST/GraphQL, controllers, UI, scheduling/resource optimization engines, Event Bus/Workflow/Rules/Policy/Approval engine changes, reporting, search, notifications.

## Related

- [Phase 3D Projects](./phase-3d-projects.md)
- [Phase 6D Finance Application](./phase-6d-finance-application.md)
- [Phase 5B Application Runtime](./phase-5b-application-runtime.md)
