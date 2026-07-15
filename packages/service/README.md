# @afh/service

Enterprise **Service Management Domain Foundation** (Phase 4D).

Canonical models for service requests, work orders, appointments, and technician references. No scheduling, dispatch, billing, or inventory operations.

Depends on: `@afh/shared-kernel`

## Ownership boundaries

| Concern | Owner |
|---------|--------|
| Request / work order / appointment lifecycle | Workflow (status is metadata only) |
| Employees / technicians | Identity |
| Scheduling | Projects |
| Stock | Inventory (item refs only) |
| Billing | Finance (invoice/payment refs only) |
| Assets | DAM |
| Customers | CRM / Commerce (ids only) |

## Usage

```ts
import { createServiceFoundation } from "@afh/service";

const service = createServiceFoundation();
```

## Out of scope

Scheduling/dispatch/assignment engines, workflow/approval/rules, inventory reservation/consumption, billing, Event Bus, HTTP/UI, SQL/ORM.
