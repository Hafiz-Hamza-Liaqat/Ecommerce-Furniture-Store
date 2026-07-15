# @afh/procurement

Enterprise **Procurement Domain Foundation** (Phase 4B).

Canonical procurement models for suppliers, purchase requisitions, and purchase orders. No purchasing workflows, approval logic, inventory receipt posting, or payment execution.

Depends on: `@afh/shared-kernel`, `@afh/commerce` (price / discount / tax references)

## Ownership boundaries

| Concern | Owner |
|---------|--------|
| PR / PO lifecycle | Workflow (status here is metadata only) |
| Supplier identity | Identity / Organization (opaque org id) |
| Goods receipt / stock | Inventory |
| Supplier invoices / payments | Finance |
| Warehouses | Inventory |
| Projects | `@afh/projects` |
| Documents | DAM |

## Usage

```ts
import { createProcurementFoundation } from "@afh/procurement";

const procurement = createProcurementFoundation();
```

## Out of scope

Procurement workflows, approvals, GRN posting, payment execution, pricing/tax engines, vendor onboarding, Event Bus, HTTP/UI, SQL/ORM.
