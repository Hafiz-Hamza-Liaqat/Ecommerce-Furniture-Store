# @afh/manufacturing

Enterprise **Manufacturing Domain Foundation** (Phase 4E).

Canonical models for BOM, production orders, routings, operations, work centers, and quality references. No planning, scheduling, material allocation, or costing engines.

Depends on: `@afh/shared-kernel`

## Ownership boundaries

| Concern | Owner |
|---------|--------|
| Production order lifecycle | Workflow (status is metadata only) |
| Stock | Inventory |
| Costing / accounting | Finance (cost sheet refs only) |
| Projects | Projects |
| Documents | DAM |
| Purchasing | Procurement |
| Service linkage | Service (request refs only) |

## Usage

```ts
import { createManufacturingFoundation } from "@afh/manufacturing";

const manufacturing = createManufacturingFoundation();
```

## Out of scope

Production planning, scheduling, capacity planning, material allocation, inventory consumption, cost accounting, quality execution, Event Bus, HTTP/UI, SQL/ORM.
