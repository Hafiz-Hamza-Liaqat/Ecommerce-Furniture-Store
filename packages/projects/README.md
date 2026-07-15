# @afh/projects

Enterprise **Project & Resource Foundation** (Phase 3D).

Reusable project building blocks for Interior Design, Architecture, Civil, Contracting, Manufacturing, Services, CRM, and Scheduling — without implementing project management workflows or execution engines.

Depends on: `@afh/shared-kernel`

## What this package provides

| Area | Contents |
|------|----------|
| Project | Project, type, status, classification, reference |
| Resource | Human / equipment / vehicle / material references |
| Team | Team, membership, role/assignment references (identity by opaque id) |
| Task | Task, status, priority, parent/child |
| Milestone | Milestone, status, due date reference |
| Schedule | Schedule, calendar, time window, dependency refs |
| Work Item | Work item, assignment, progress/completion refs |
| Events | Event **contracts** only |
| Repositories | **Interfaces only** |
| Validation | Structural validators only |
| Composition | `createProjectFoundation()` |

## Architecture notes

- Project/task **status** fields are data only; Workflow remains lifecycle SSoT.
- Trades (Carpenter / Painter / Polisher) remain **Employee + Team** in Identity — not RBAC roles. This package references them by opaque ids.

## Usage

```ts
import { createProjectFoundation } from "@afh/projects";

const projects = createProjectFoundation();
```

## Out of scope

PM workflows, scheduling/allocation engines, manufacturing jobs, service tickets, CRM activities, Event Bus, HTTP/UI, SQL/ORM/migrations.
