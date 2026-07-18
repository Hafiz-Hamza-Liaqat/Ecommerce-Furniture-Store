# RC7.3 Integration Report

- **Date:** 2026-07-18
- **Slice:** RC7.3 — Production UI de-fixturing (merged ERP ModuleApp List* cutover)
- **Baseline:** RC7.2a–g List* backend complete (`de5acea` and prior)
- **Verdict:** Implementation complete — **awaiting human review (not committed)**
- **Next:** Do **not** start RC7.4 until approved

## What integrated

ModuleApp `EntityListPage` now dispatches live CQRS `List*` queries for every V1 freeze **Included** entity that received RC7.2 List* handlers. No parallel HTTP list APIs; all traffic uses existing `/api/v1/queries` + `dispatchQuery`.

### Plumbing (`packages/web`)

| Artifact | Role |
|---|---|
| `modules/erp/ui-profile.ts` | `VITE_UI_PROFILE` / Vite `PROD` → `production` \| `demo`; Production never fixture-falls-back |
| `modules/erp/list-query.ts` | Default `ListQueryRequest` payload builder + `readListPage` |
| `modules/erp/types.ts` | `ApiBinding.listQueryType` / `buildListPayload` / `mapListEntity` |
| `modules/erp/ModuleApp.tsx` | Live list fetch, loading/empty/error, Production fail-closed |

### Included entity → List* bindings (26)

| Module | Entity keys | List* |
|---|---|---|
| Sales | opportunities, quotations, orders | ListOpportunity, ListQuote, ListSalesOrder |
| Procurement | suppliers, requests, orders | ListSupplier, ListPurchaseRequisition, ListPurchaseOrder |
| Inventory | products, warehouses, stock | ListInventoryItem, ListWarehouse, ListStock |
| Finance | accounts, invoices, payments, ledger | ListFinancialAccount, ListInvoice, ListPayment, ListLedger |
| CRM | leads, contacts, accounts, activities, campaigns | ListLead, ListContact, ListAccount, ListActivity, ListCampaign |
| Projects | projects, tasks, milestones | ListProject, ListTask, ListMilestone |
| Service | tickets, requests, work-orders, appointments, scheduling | ListServiceRequest (×2), ListWorkOrder, ListAppointment, ListTechnicianAssignment |

## Profile behavior

| Profile | Included List* failure / empty |
|---|---|
| **Production** (`VITE_UI_PROFILE=production` or Vite production build) | Surface error / empty; **no** fixture substitution |
| **Demo** (default local / `demo` \| `test` \| `development`) | May show fixtures after error with explicit warning |

## Preserved architecture

- RC7.1 `buildAuthorizedListPage` / ADR D56 — **unchanged**
- Policy sole authorizer; Workflow / Approval ownership — **unchanged**
- Module ownership / no duplicate paging or authz in UI — **unchanged**
- No schema redesign / no migrations / no new architectural layers

## Explicitly deferred (later RC7 slices / freeze)

Per official roadmap §RC7.3, this slice is **Production UI de-fixturing**, not a full productization charter. Deferred with honesty:

| Area | Owner slice / note |
|---|---|
| Search **module** (indexes) | RC7.12 — not built; list `q` remains bounded application search |
| Reporting engine / analytics redesign | RC7.8+ |
| Settings / admin deep completion | Existing pages retained; not redesigned here |
| Non-Included entity lists (shipments, RFQs, etc.) | Remain fixture-backed until freeze expands |
| Create/Get/lifecycle | Already wired where present; not re-architected |

## Stop rule

No commit. No RC7.4+. Waiting for review.
