# Phase 6C — Inventory Application Services

**Status:** Implemented  
**Package:** `@afh/inventory-application`  
**Depends on:** Phase 3B Inventory, Phase 5B Application Runtime, Phase 6A/6B pattern  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Third executable business application module. Inventory command and query handlers register into the Phase 5B `HandlerRegistry` and orchestrate:

- Inventory repository interfaces (`@afh/inventory`)
- Policy authorization (sole path via pipeline)
- Workflow lifecycle for items/warehouses (and optional transfer transitions)
- Rules evaluation for reservation, allocation, adjustment, transfer policies (no inline computation of reservation/allocation/costing/reorder/valuation)
- Approval submission for configured stock adjustments and transfers
- **Ledger append as stock SSoT**; StockPosition updated as projection only
- Outbox persistence of domain events where contracts exist
- Security audit on every mutation

No HTTP, SQL, UI, infrastructure redesign, or Event Bus changes.

## Package path

`packages/inventory-application`

## Composition

```ts
const inventory = createInventoryApplication({
  items, warehouses, locations, stock, movements, ledger, batches, serials,
  outbox, audit, handlers,
});
```

Handlers may share one `HandlerRegistry` with Sales and Procurement.

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Policy = sole authorization | Every handler provides `authorize()` |
| Workflow = lifecycle SSoT | Item/warehouse create start workflow; status via projection |
| Stock via StockLedger | All qty mutations append `InventoryLedgerEntry` |
| Rules = evaluation engine | Reservation/allocation/adjustment/transfer via RulesEngine |
| Approval = human decisions | Optional for adjust/transfer; no decide logic |
| Outbox = sole publish path | Events enqueued to OutboxStore |
| Pattern parity with 6A/6B | Same composition and pipeline integration |

## Events used (existing foundation contracts)

| Command | Event |
|---------|-------|
| CreateInventoryItem | `inventory.item.created` |
| CreateWarehouse | `inventory.warehouse.created` |
| AdjustStock | `inventory.stock.adjusted` |
| ReserveStock | `inventory.stock.reserved` |
| ReleaseReservation | `inventory.stock.released` |
| ReceiveStock / TransferStock / CreateStorageLocation | Ledger + audit (no foundation event type yet) |

## Explicit non-goals

HTTP/REST/GraphQL, controllers, UI, SQL/ORM, Event Bus changes, Workflow/Rules/Policy/Approval engine changes, search, reporting, notifications, background workers, costing engines.

## Related

- [Phase 3B Inventory](./phase-3b-inventory.md)
- [Phase 6A Sales Application](./phase-6a-sales-application.md)
- [Phase 6B Procurement Application](./phase-6b-procurement-application.md)
- [Phase 5B Application Runtime](./phase-5b-application-runtime.md)
