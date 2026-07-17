# RC5.7 — Query/List Record Filtering (Implementation Report)

- **Date:** 2026-07-18
- **Approved scope:** Query/list record filtering; Policy-based result filtering
- **Explicit exclusions honored:** no RBAC catalog redesign, no authentication/session changes, no route protection changes, no frontend redesign
- **Decision record:** `docs/architecture/decision-records/ADR-D46-policy-filtered-list-results.md`

## 1. What was delivered

Before RC5.7, the five company-wide module summary queries (sales,
procurement, inventory, finance, crm) listed company-wide repository pages and
projected record counts and id arrays without consulting the principal's
scopes. An own/organization/branch-scoped principal was either denied the
whole operation (all-null collection resource → `scope_mismatch`) or — where
the gate passed — could learn the existence and ids of records outside their
scope.

RC5.7 delivers Policy-based result filtering per ADR D46:

1. **Shared filtering helper (`@afh/application`).**
   `packages/application/src/security/record-filtering.ts` adds:
   - `filterAuthorizedRecords(ctx, action, resourceType, records, toScope)` —
     passes every candidate row through the existing
     `ctx.policyEngine.evaluate` with a resource built from persisted row data
     (id, the row's own `companyId`, owner/organization/branch fields). Only
     allowed rows are returned. A missing principal fails with
     `principal_missing`; a thrown evaluation error fails the whole query
     with `policy_evaluation_failed`. No partial results are ever returned.
   - `principalListScope(principal)` — derives collection-gate scope hints
     from the principal's own active assignments so the gate resource means
     "records within the caller's scopes". Principals with no active
     assignments keep all-null hints and remain denied by the unchanged
     Policy Engine.

2. **Handler integration (5 files).** Collection-bearing query handlers now
   (a) pass `principalListScope(ctx.principal)` into their collection gate
   resource and (b) filter every listed row before any count/id projection:

   | Handler | Row filters applied (action → persisted scope fields) |
   |---|---|
   | `sales.GetCustomerSalesSummary` | `sales.opportunities.read` / `sales.quotes.read` / `sales.orders.read` → `salesRepUserId` (owner), `organizationId` |
   | `procurement.GetProcurementSummary` | `procurement.suppliers.read` (no scope fields), `procurement.requisitions.read` → `requestedByUserId` (owner), `procurement.purchase_orders.read` (no scope fields) |
   | `inventory.GetInventorySummary` | `inventory.items.read` (no scope fields), `inventory.warehouses.read` → `branchId`; movement sampling iterates visible items only |
   | `finance.GetFinancialSummary` | `finance.accounts.read` (no scope fields), `finance.invoices.read` → `organizationId` |
   | `crm.GetCrmSummary` | `crm.leads.read` / `crm.accounts.read` / `crm.campaigns.read` → `ownerUserId`; `crm.contacts.read` (no scope fields) |

   Aggregates persisting no owner/organization/branch fields produce all-null
   row resources, so scoped principals see zero of them — missing data
   denies, consistent with ADR D45.

3. **Parent-authorized collections are inherited, not re-filtered.** Child
   collections (`listLines`, `listEntries`, `listAdjustments`,
   `listMemberships`, `listByWarehouse`, `listByItem`, `listByProject`,
   `listByServiceRequest`) are reachable only through a parent record that
   RC5.5 already load-before-authorizes; `projects.GetProjectSummary`,
   `service.GetServiceHistory`, and `service.GetServiceSummary` therefore
   keep their existing D45 parent gates unchanged.

4. **Defense in depth for cross-company rows.** The row resource carries the
   row's persisted `companyId`, so even a defective adapter that leaked a
   foreign-company row past the company-keyed repository is stopped by the
   engine's existing company isolation rule.

## 2. What was intentionally not changed

- **Policy Engine** (`RbacPolicyEngine`): algorithm, scope semantics, deny
  reason codes — untouched.
- **RBAC catalog / role seeds:** untouched (`rc5.rbac-catalog.v3`). All row
  actions are existing canonical read permissions.
- **Authentication, sessions, route protection, frontend:** untouched.
- **Repositories / SQL:** untouched. Pushing scope predicates into SQL was
  rejected as a second authorization authority (ADR D46).
- **Dedicated `List*` endpoints:** remain RC7. They must reuse
  `filterAuthorizedRecords` and compute pagination metadata after filtering.
- **Permission-to-scope binding:** remains deferred exactly as recorded in
  ADR D45.

## 3. Behavioral changes

| Scenario | Before RC5.7 | After RC5.7 |
|---|---|---|
| Own/org/branch principal runs a module summary | Denied (`scope_mismatch`) | Allowed; counts/ids include only in-scope rows |
| Company/global principal runs a module summary | Full company rows | Unchanged (full company rows, permission required per row type) |
| Summary rows without persisted scope fields | n/a (blanket deny) | Hidden from scoped principals (missing data denies) |
| Policy evaluation failure during filtering | n/a | Whole query fails (`policy_evaluation_failed`) |
| Leaked foreign-company row (defective adapter) | Would surface | Dropped by company isolation |

## 4. Files changed

| File | Change |
|---|---|
| `packages/application/src/security/record-filtering.ts` | New — shared Policy-driven list filtering + gate scope hints |
| `packages/application/src/security/index.ts` | Export the new module |
| `packages/sales-application/src/handlers/query-handlers.ts` | Gate hints + row filtering in `GetCustomerSalesSummary` |
| `packages/procurement-application/src/handlers/query-handlers.ts` | Gate hints + row filtering in `GetProcurementSummary` |
| `packages/inventory-application/src/handlers/query-handlers.ts` | Gate hints + row filtering in `GetInventorySummary` |
| `packages/finance-application/src/handlers/query-handlers.ts` | Gate hints + row filtering in `GetFinancialSummary` |
| `packages/crm-application/src/handlers/query-handlers.ts` | Gate hints + row filtering in `GetCrmSummary` |
| `packages/api/src/authorization/list-filtering.test.ts` | New — RC5.7 test suite |
| `packages/api/package.json` | Register the new test file |
| `docs/architecture/decision-records/ADR-D46-policy-filtered-list-results.md` | New ADR |
| `docs/architecture/decision-records/ADR-INDEX.md` | D46 entry |
| `docs/rc5/06-Record-Level-Security.md` | List-query gap marked delivered |
| `docs/rc5/09-Implementation-Plan.md` | RC5.7 implementation evidence |
| `docs/rc5/10-Test-Plan.md` | List pollution row updated |
| `docs/rc5/13-Authorization-Governance-Specification.md` | Batching rule RC5.7 note |

## 5. Tests

`packages/api/src/authorization/list-filtering.test.ts` (11 tests) proves,
through the real behavior stack (ExceptionMapping → Authorization → actual
handler) with the seeded RBAC catalog and real `RbacPolicyEngine`:

- **Owner scope:** an own-scoped principal receives only rows they own;
  foreign-owned and unassigned rows are omitted from counts and id arrays;
  the collection gate passes for scoped principals.
- **Organization isolation:** only rows in the principal's organization
  survive; other-org and no-org rows are omitted.
- **Branch isolation:** only warehouses in the principal's branch are
  counted.
- **Company scope:** company-scoped principals still see every company row.
- **Cross-company:** foreign-company rows never surface behind company-keyed
  repositories, and a simulated leaky adapter's foreign row is dropped by
  Policy company isolation.
- **Fail-closed:** a throwing Policy Engine fails the whole query
  (`policy_evaluation_failed`); filtering without a principal fails
  (`principal_missing`).
- **Gate hints:** `principalListScope` derives hints only from scoped
  assignments and returns all-null for a missing principal.

## 6. Known residual risks

- Per-row engine denials append `policy.deny` audit records; large pages
  read by scoped principals increase audit volume (accepted — evidence-rich,
  existing engine path).
- Cross-role scope widening (permission-to-scope binding) remains the known
  deferred risk from ADR D45 and applies to row filtering identically.
- UI fixture grids remain client-side convenience data until RC7 `List*`.

## 7. Suggested commit message

```
feat(rc5.7): policy-filter query/list results per row (ADR D46)
```
