# @afh/projects-application

Enterprise **Project & Resource Application Services** (Phase 6E).

Fifth executable business module on the Phase 5B application runtime. Orchestrates `@afh/projects` repositories through the shared pipeline — without HTTP or SQL.

Scheduling optimization, resource allocation strategy, utilization, workload balancing, and project costing remain in the **Rules Engine** — handlers only request evaluation.

## Composition

```ts
const projects = createProjectApplication({
  projects, tasks, milestones, resources, teams, schedules, workItems,
  outbox: infrastructure.persistence.outboxStore,
  audit,
  handlers, // optional shared registry
});

const app = createApplicationRuntime({ ..., handlers: projects.handlers });
```

## Commands

Create/Update/Archive Project · Create/Update/Assign/Complete Task · Create/Update Milestone · Assign/Release Resource · Update Schedule

## Queries

Project, Task, Milestone, Resource, Team, Schedule, Work Item, Project Summary

## Ownership

| Concern | Owner |
|---------|-------|
| Authorization | Policy only |
| Lifecycle | Workflow |
| Scheduling / allocation / costing | Rules Engine |
| Event publish | Outbox only |

## Out of scope

HTTP, SQL/ORM, UI, scheduling engines, resource optimizers, Event Bus changes.
