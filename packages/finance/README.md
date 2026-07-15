# @afh/finance

Enterprise **Financial Foundation** (Phase 3C).

Reusable financial building blocks for Sales, Procurement, Payments, Accounting, Projects, Manufacturing, and Services — without implementing accounting processes or payment execution.

Depends on: `@afh/shared-kernel`, `@afh/commerce` (Money / Currency / TaxCategory reuse)

## What this package provides

| Area | Contents |
|------|----------|
| Money | Reuses Commerce Money/Currency; adds Precision & RoundingModeReference |
| Account | Financial account, type, status, reference |
| Ledger | Ledger, entry, posting/balance references (**contracts only**) |
| Invoice | Invoice, line, status, reference (**no lifecycle**) |
| Payment | Payment, method/status/reference (**no gateway**) |
| Credit | Credit account, limit, adjustment |
| Tax | TaxProfile / TaxRegistration + re-exported Commerce tax contracts |
| Events | Event **contracts** only |
| Repositories | **Interfaces only** (ledger append-only) |
| Validation | Structural validators only |
| Composition | `createFinancialFoundation()` |

## Usage

```ts
import { createFinancialFoundation, money } from "@afh/finance";

const finance = createFinancialFoundation();
const amount = money("USD", 5000n);
```

## Out of scope

Accounting/double-entry engines, payment gateways, refunds, AR/AP processes, invoice workflows, Event Bus, HTTP/UI, SQL/ORM/migrations.
