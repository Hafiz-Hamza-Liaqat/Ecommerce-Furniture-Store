# @afh/sales-application

Enterprise **Sales Application Services** (Phase 6A).

First executable business module on the Phase 5B application runtime. Orchestrates `@afh/sales` repositories, Workflow, Rules, Approval, Policy, Outbox, and Security Audit — without HTTP or SQL.

## Composition

```ts
import { createInfrastructureRuntime } from "@afh/infrastructure";
import { createApplicationRuntime } from "@afh/application";
import { createSalesApplication } from "@afh/sales-application";

const infrastructure = createInfrastructureRuntime();
const sales = createSalesApplication({
  opportunities,
  quotes,
  orders,
  outbox: infrastructure.persistence.outboxStore,
  audit,
});

const app = createApplicationRuntime({
  infrastructure,
  policyEngine,
  workflow,
  approval,
  rules,
  handlers: sales.handlers,
});

await app.commands.dispatch(command, { correlationId, principal, companyId });
```

## Commands

| Command | Orchestrates |
|---------|--------------|
| `sales.CreateOpportunity` | Workflow start + persist + outbox |
| `sales.UpdateOpportunity` | Persist; optional Workflow transition |
| `sales.CreateQuote` | Rules (price/discount/tax/credit) + Workflow + outbox |
| `sales.ReviseQuote` | Rules + new revision + outbox |
| `sales.CreateSalesOrder` | Rules + Workflow + outbox |
| `sales.CancelSalesOrder` | Optional Approval submit, or Workflow cancel + outbox |

## Queries

`GetOpportunity`, `GetQuote`, `GetSalesOrder`, `GetCustomerSalesSummary`

## Ownership rules

| Concern | Owner |
|---------|-------|
| Authorization | Policy Engine only |
| Lifecycle | Workflow Engine |
| Pricing / tax / credit | Rules Engine (opaque refs) |
| Human gates | Approval Engine |
| Event publish | Outbox only |

## Out of scope

REST/HTTP/GraphQL, controllers, UI, SQL/ORM, Event Bus consumers, notifications, search, reporting, AI.
