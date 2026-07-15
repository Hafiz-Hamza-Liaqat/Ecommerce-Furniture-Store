# @afh/crm

Enterprise **CRM Domain Foundation** (Phase 4C).

Canonical CRM models for leads, contacts, accounts, activities, communications, and campaigns. No automation, campaign execution, or notification delivery.

Depends on: `@afh/shared-kernel`, `@afh/sales` (OpportunityReference — no duplication)

## Ownership boundaries

| Concern | Owner |
|---------|--------|
| Lead lifecycle | Workflow (status is metadata only) |
| Users / organizations | Identity |
| Opportunities | Sales (`OpportunityReference` re-exported) |
| Notification delivery | Notifications (opaque notification ids) |
| Dashboards | Reporting |
| Documents | DAM |

## Usage

```ts
import { createCrmFoundation } from "@afh/crm";

const crm = createCrmFoundation();
```

## Out of scope

Lead scoring/routing, sales automation, campaign execution, email/SMS/push, workflow/approval/rules, Event Bus, HTTP/UI, SQL/ORM.
