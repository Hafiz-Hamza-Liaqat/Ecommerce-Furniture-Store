# @afh/sales

Enterprise **Sales Domain Foundation** (Phase 4A).

Canonical sales models and contracts for opportunities, quotes, and orders. No pricing engines, inventory reservation, payment processing, or workflows.

Depends on: `@afh/shared-kernel`, `@afh/commerce` (price / discount / tax references)

## Ownership boundaries

| Concern | Owner |
|---------|--------|
| Quote / order lifecycle | Workflow (status here is metadata only) |
| Pricing / tax / discount math | Rules Engine (opaque refs only) |
| Invoices / payments | Finance (`SalesInvoiceReference` / `SalesPaymentReference`) |
| Stock | Inventory |
| Projects | `@afh/projects` (project id only) |
| Documents | DAM (asset id only) |

## Usage

```ts
import { createSalesFoundation } from "@afh/sales";

const sales = createSalesFoundation();
```

## Out of scope

Pricing/tax/discount engines, inventory reservation, payment gateways, invoice posting, workflow/approval definitions, Event Bus, HTTP/UI, SQL/ORM.
