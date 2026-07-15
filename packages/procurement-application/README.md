# @afh/procurement-application

Enterprise **Procurement Application Services** (Phase 6B).

Second executable business module on the Phase 5B application runtime, following the Phase 6A Sales pattern. Orchestrates `@afh/procurement` repositories, Workflow, Rules, Approval, Policy, Outbox, and Security Audit — without HTTP or SQL.

## Composition

```ts
import { createInfrastructureRuntime } from "@afh/infrastructure";
import { createApplicationRuntime } from "@afh/application";
import { createProcurementApplication } from "@afh/procurement-application";

const infrastructure = createInfrastructureRuntime();
const procurement = createProcurementApplication({
  suppliers,
  requisitions,
  purchaseOrders,
  outbox: infrastructure.persistence.outboxStore,
  audit,
});

const app = createApplicationRuntime({
  infrastructure,
  policyEngine,
  workflow,
  approval,
  rules,
  handlers: procurement.handlers,
});
```

## Commands

| Command | Orchestrates |
|---------|--------------|
| `procurement.CreateSupplier` | Rules (eligibility) + persist + audit |
| `procurement.UpdateSupplier` | Persist; optional Workflow transition |
| `procurement.CreatePurchaseRequisition` | Rules + Workflow start + outbox |
| `procurement.SubmitPurchaseRequisition` | Optional Approval, or Workflow submit |
| `procurement.CreatePurchaseOrder` | Rules + Workflow + outbox |
| `procurement.IssuePurchaseOrder` | Optional Approval, or Workflow issue + outbox |
| `procurement.CancelPurchaseOrder` | Optional Approval, or Workflow cancel |

## Queries

`GetSupplier`, `GetPurchaseRequisition`, `GetPurchaseOrder`, `GetProcurementSummary`

## Ownership rules

| Concern | Owner |
|---------|-------|
| Authorization | Policy Engine only |
| Lifecycle | Workflow Engine |
| Eligibility / limits / thresholds | Rules Engine |
| Human gates | Approval Engine |
| Stock | Inventory (refs only) |
| Money documents | Finance (refs only) |
| Event publish | Outbox only |

## Out of scope

REST/HTTP/GraphQL, controllers, UI, SQL/ORM, GRN posting, inventory reservation, financial posting, Event Bus consumers, notifications, search, reporting, AI.
