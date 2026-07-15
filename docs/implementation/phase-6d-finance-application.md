# Phase 6D — Finance Application Services

**Status:** Implemented  
**Package:** `@afh/finance-application`  
**Depends on:** Phase 3C Finance, Phase 5B Application Runtime, Phase 6A–6C pattern  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Fourth executable business application module. Finance command and query handlers register into the Phase 5B `HandlerRegistry` and orchestrate:

- Finance repository interfaces (`@afh/finance`)
- Policy authorization (sole path via pipeline)
- Workflow lifecycle for accounts, invoices, and payments
- Rules evaluation for tax, pricing, credit, payment, and posting policies (no inline tax/pricing/FX/credit calculation)
- Approval submission for configured invoice/payment/credit gates
- **Append-only Financial Ledger** as money-movement SSoT; balances as projections only
- Outbox persistence of domain events where contracts exist
- Security audit on every mutation

No HTTP, SQL, UI, payment gateways, banking integrations, or Event Bus changes.

## Package path

`packages/finance-application`

## Composition

```ts
const finance = createFinanceApplication({
  accounts, invoices, payments, ledgers, credits, outbox, audit, handlers,
});
```

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Policy = sole authorization | Every handler provides `authorize()` |
| Workflow = lifecycle SSoT | Account/invoice/payment create start workflow |
| Financial Ledger = append-only SSoT | `LedgerRepository.appendEntry` only; no balance mutation |
| Rules = evaluation engine | Tax/pricing/credit/payment/posting via RulesEngine |
| Approval = human decisions | Optional gates; no decide logic |
| Outbox = sole publish path | Events enqueued to OutboxStore |
| Pattern parity with 6A–6C | Same composition and pipeline |

## Events used (existing foundation contracts)

| Command | Event |
|---------|-------|
| CreateInvoice | `finance.invoice.created` |
| RecordPayment | `finance.payment.recorded` |
| RecordCreditAdjustment | `finance.credit.adjusted` |
| AppendLedgerEntry | `finance.ledger.entry_created` |
| Create/Update Account, Create Ledger, Update Invoice | Audit only (no foundation event yet) |

## Explicit non-goals

SQL/ORM, HTTP/REST/GraphQL, controllers, UI, payment gateways, banking integrations, Event Bus/Workflow/Rules/Policy/Approval engine changes, reporting, search, notifications.

## Related

- [Phase 3C Finance](./phase-3c-finance.md)
- [Phase 6C Inventory Application](./phase-6c-inventory-application.md)
- [Phase 5B Application Runtime](./phase-5b-application-runtime.md)
