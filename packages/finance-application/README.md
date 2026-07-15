# @afh/finance-application

Enterprise **Finance Application Services** (Phase 6D).

Fourth executable business module on the Phase 5B application runtime. Orchestrates `@afh/finance` repositories through the shared pipeline — without HTTP or SQL.

**Financial Ledger remains append-only SSoT.** Handlers never mutate balances; balances are projections only (`balanceRef` opaque).

## Composition

```ts
const finance = createFinanceApplication({
  accounts, invoices, payments, ledgers, credits,
  outbox: infrastructure.persistence.outboxStore,
  audit,
  handlers, // optional shared registry
});

const app = createApplicationRuntime({ ..., handlers: finance.handlers });
```

## Commands

| Command | Notes |
|---------|--------|
| Create/Update Financial Account | Workflow lifecycle |
| Create/Update Invoice | Rules for tax/pricing refs; Approval optional |
| Record Payment | Rules + Workflow; never mutates balances |
| Record Credit Adjustment | Credit policy via Rules |
| Create Ledger / Append Ledger Entry | Append-only ledger SSoT |

## Queries

Financial Account, Invoice, Payment, Ledger, Credit Account, Financial Summary

## Ownership

| Concern | Owner |
|---------|-------|
| Authorization | Policy only |
| Lifecycle | Workflow |
| Tax/pricing/FX/credit policy | Rules Engine |
| Money movements | Append-only Financial Ledger |
| Event publish | Outbox only |

## Out of scope

HTTP, SQL/ORM, UI, payment gateways, banking integrations, Event Bus changes, reporting/search/notifications.
