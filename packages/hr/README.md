# @afh/hr

Enterprise **Human Resources & Workforce Foundation** (Phase 4G).

Reusable HR models for employment profiles, org structure, workforce groups, attendance/leave contracts, skills, and payroll references. No payroll engines, scheduling, or approval execution.

Depends on: `@afh/shared-kernel`

## Ownership boundaries

| Concern | Owner |
|---------|--------|
| Authentication / principals | Identity |
| Leave lifecycle | Workflow (status is metadata only) |
| Authorization | Policy |
| Cost centers / payroll money | Finance |
| Documents | DAM |
| Trades (Carpenter/Painter/Polisher) | Employee + Team (not RBAC roles) |

## Usage

```ts
import { createHumanResourcesFoundation } from "@afh/hr";

const hr = createHumanResourcesFoundation();
```

## Out of scope

Payroll/attendance/leave engines, recruitment, performance reviews, scheduling, shift allocation, Event Bus, HTTP/UI, SQL/ORM, authentication/authorization.
