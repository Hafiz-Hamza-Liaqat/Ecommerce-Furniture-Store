# @afh/commerce

Enterprise **Commerce Foundation** (Phase 3A).

Reusable commercial building blocks for Sales, Procurement, CRM, Projects, Manufacturing, Services, Marketplace, and B2B — without implementing those modules.

Depends on: `@afh/shared-kernel`

## What this package provides

| Area | Contents |
|------|----------|
| Customer | Customer, profile, status, type, classification |
| Organization | Commerce org, business account, relationships (identity org by reference) |
| Address / Contact | Canonical address & contact models |
| Product / Catalog | Product, variant, category/brand refs, catalog grouping |
| Units | Measurement primitives (dimensions, weight, area, volume) |
| Currency | Currency, Money, exchange-rate references |
| Pricing / Tax | **Contracts only** — no calculations |
| Events | Event **contracts** only (`CustomerCreated`, `ProductCreated`, …) |
| Repositories | **Interfaces only** |
| Validation | Structural validators only |
| Composition | `createCommerceFoundation()` |

## Usage

```ts
import { createCommerceFoundation, money } from "@afh/commerce";

const commerce = createCommerceFoundation();
const amount = money("USD", 1999n);
```

## Out of scope

Sales, quotations, orders, cart, checkout, inventory, warehouses, procurement, manufacturing, CRM, projects, services, payments, workflows, approvals, rules content, Event Bus, search, HTTP/UI, SQL/ORM/migrations, pricing/tax engines.
