# RC7.0 — Slice Roadmap

- **Version:** 1.0
- **Created:** 2026-07-18
- **Last Updated:** 2026-07-18
- **Freeze:** [`03-V1-Scope-Freeze.md`](./03-V1-Scope-Freeze.md)
- **Rule:** No slice may expand Included scope without amending the freeze.

---

## RC7.0 — V1 Product Freeze & Planning

**Type:** Documentation only  

**Delivers:** `docs/rc7/` pack (README, overview, implementation plan, V1 freeze, acceptance criteria, this roadmap).  

**Does not deliver:** application code, handlers, APIs, migrations, UI, tests, commits authorization for engineering.

**Exit:** Human review approval before RC7.1.

---

## RC7.1 — Shared List Foundation

**Only:**

- Pagination (page/size and/or cursor)
- Sorting
- Filtering
- Search (text query contract)
- Cursor/page request/response contracts
- Policy row filtering integration points (authorization after repository page)
- Total count semantics (**after** Policy row filtering — ADR D46)

**RC7.1 delivers only shared `List*` contracts and infrastructure. It intentionally delivers no module-specific / entity handlers.**

**Not in RC7.1:**

- Any module `List*` handler
- UI de-fixturing
- DAM / import / manufacturing packages

---

## RC7.2a — Sales List implementation

`List*` for freeze-Included Sales entities (Opportunity, Quote, SalesOrder) using RC7.1 contracts + AuthorizationSpec + Policy row filtering.

## RC7.2b — Procurement List implementation

`List*` for Supplier, PurchaseRequisition, PurchaseOrder.

## RC7.2c — Inventory List implementation

`List*` for InventoryItem, Warehouse, Stock (+ ledger/batch/lot/serial only if freeze minimum met).

## RC7.2d — Finance List implementation

`List*` for FinancialAccount, Invoice, Payment (+ Ledger if required).

## RC7.2e — CRM List implementation

`List*` for Lead, Contact/Account, Activity, Campaign (as modeled).

## RC7.2f — Projects List implementation

`List*` for Project, Task, Milestone (+ Resource/Schedule if required).

## RC7.2g — Service List implementation

`List*` for ServiceRequest, WorkOrder, Appointment, Technician (as modeled).

**RC7.2 rule:** No Production profile UI cutover required inside 2a–g (may add adapter hooks); full de-fixturing is RC7.3. Each sub-slice is independently reviewable.

---

## RC7.3 — Production UI de-fixturing

- Wire ModuleApp (and related) lists for Included entities to live `List*`.
- **Production profile:** no fixture list fallback for Included entities.
- **Demo/Test profile:** fixtures allowed behind explicit profile flag.
- Policy 403/empty states surfaced without silent fixture substitution.

---

## RC7.4 — Validation, Concurrency, Audit, Scope completion

- Server validation gaps on V1 write paths
- Optimistic concurrency completeness (`expectedVersion` fail-closed — version conflicts must **never silently overwrite** state)
- Audit completeness on mutating + sensitive query paths
- Company/branch scope field completeness + known residuals (e.g. dual-branch transfer)
- Does **not** invent `List*` (already 7.1–7.2) or DAM binary (7.5)

---

## RC7.5 — DAM foundation

- Production binary/object storage for assets
- Asset Create/Get/List with Policy + company isolation
- MIME/size enforcement
- No module attachment UX required yet (hooks only)

---

## RC7.6 — Attachments, Notes, Comments, Activity

- Server-backed notes/comments/activity for freeze-claimed entities
- Attachments store **DAM asset references** only
- Policy + audit on create/read/delete
- No import/export (RC7.7)

---

## RC7.7 — Import, Export, Bulk Operations

Opt-in entities only (confirm at slice kickoff against freeze).

**Mandatory for every import/export/bulk path:**

1. Policy authorization  
2. Audit  
3. Company isolation  
4. Optimistic concurrency (or equivalent version fail-closed)

Also: bounded payload sizes, validation, partial-failure semantics documented.

---

## RC7.8 and later — Unfinished modules (V1 subsets)

Order may be adjusted at kickoff, but **content** is freeze-bound.

**Each module begins with its own planning review before implementation if the approved V1 freeze changes.**

| Suggested order | Module | V1 content (see freeze) |
|---|---|---|
| RC7.8 | Manufacturing | Minimal production-order app only — **not MES** |
| RC7.9 | HR | Employee (+ optional Department) |
| RC7.10 | CMS | CmsEntry CRUD/List |
| RC7.11 | Notifications | In-app/preferences read model only; never a business owner (delivery workers not default) |
| RC7.12 | Reporting | Bounded V1 report list/run — read model only; never a business owner |
| RC7.13 | Search | Bounded V1 index set — read model only; never a business owner |
| RC7.14 | Seed / migration / reconciliation / DQ + RC7 final packet | Closeout |

Exact numeric labels for RC7.8 and later may be renamed at implementation time. **Manufacturing V1 explicitly excludes BOM, Routing, Capacity Planning, Shop Floor, MRP, Cost Rollup, and Machine Maintenance.**

---

## Architecture ownership (every slice)

- Workflow Engine → lifecycle owner  
- Approval Engine → approval owner  
- Policy Engine → sole authorization authority  
- Reporting & Search → **read models only; never business owners**  
- DAM → files; attachments reference DAM  
- No new authorization framework  
- No engine ownership changes  
- V1 freeze (`03-V1-Scope-Freeze.md`) → single source of truth for Included scope  

---

## Dependency graph (summary)

```text
RC7.0 (docs)
  └─► RC7.1 (List* foundation — no entity handlers)
        └─► RC7.2a…g (module lists)
              └─► RC7.3 (UI de-fixture)
                    └─► RC7.4 (harden writes/scope)
              RC7.5 (DAM) ──► RC7.6 (attachments/notes)
                                └─► RC7.7 (import/export/bulk)
                                      └─► RC7.8 and later (V1 unfinished modules)
                                            └─► RC7 final verification
```
