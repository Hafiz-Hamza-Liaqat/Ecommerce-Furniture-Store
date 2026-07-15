# @afh/inventory-application

Enterprise **Inventory Application Services** (Phase 6C).

Third executable business module on the Phase 5B application runtime, following the Phase 6A/6B pattern. Orchestrates `@afh/inventory` repositories, Workflow, Rules, Approval, Policy, Outbox, and Security Audit — without HTTP or SQL.

**Stock mutations always append to the Inventory Ledger** (SSoT). `StockPosition` is updated only as a projection.

## Composition

```ts
const inventory = createInventoryApplication({
  items, warehouses, locations, stock, movements, ledger, batches, serials,
  outbox: infrastructure.persistence.outboxStore,
  audit,
  handlers, // optional shared registry with Sales/Procurement
});

const app = createApplicationRuntime({ ..., handlers: inventory.handlers });
```

## Commands

| Command | Notes |
|---------|--------|
| Create/Update Inventory Item | Workflow for lifecycle |
| Create Warehouse / Storage Location | Warehouse via Workflow |
| Receive / Adjust / Reserve / Release / Transfer Stock | Rules + Ledger + Movement; Approval optional for adjust/transfer |

## Queries

Item, Warehouse, Stock positions, Stock Ledger, Batch, Lot, Serial, Inventory Summary

## Ownership

| Concern | Owner |
|---------|-------|
| Authorization | Policy only |
| Lifecycle | Workflow |
| Reservation/allocation/costing/reorder | Rules Engine |
| Stock truth | Ledger (append-only) |
| Event publish | Outbox only |

## Out of scope

HTTP, SQL/ORM, UI, Event Bus changes, notification/search/reporting, background workers.
