# @afh/inventory

Enterprise **Inventory Foundation** (Phase 3B).

Reusable inventory building blocks for Sales, Procurement, Manufacturing, Warehouse Operations, Projects, and Services — without implementing those modules or operational warehouse behavior.

Depends on: `@afh/shared-kernel`

## What this package provides

| Area | Contents |
|------|----------|
| Inventory Item | Item, SKU/variant refs, status, classification, type |
| Warehouse | Warehouse, type, status, reference |
| Storage Location | Zone / aisle / rack / shelf / bin hierarchy |
| Stock | On-hand, reserved, available, damaged, returned, in-transit **models** |
| Movement | Receipt, issue, transfer, adjustment, reservation, release **contracts** |
| Ledger | Append-only ledger entry **contracts** (no posting) |
| Batch / Lot | Tracking models (no FEFO/FIFO) |
| Serial | Registration / assignment status models |
| Events | Event **contracts** only |
| Repositories | **Interfaces only** |
| Validation | Structural validators only |
| Composition | `createInventoryFoundation()` |

## Usage

```ts
import { createInventoryFoundation } from "@afh/inventory";

const inventory = createInventoryFoundation();
```

## Architecture note

Stock mutations in later phases must append via the inventory ledger (Architecture Law: stock only through StockLedger). This package defines the contracts only.

## Out of scope

Reservation/allocation engines, picking/packing/shipping, procurement, sales orders, manufacturing, workflows, approvals, rules content, Event Bus, search, HTTP/UI, SQL/ORM/migrations.
