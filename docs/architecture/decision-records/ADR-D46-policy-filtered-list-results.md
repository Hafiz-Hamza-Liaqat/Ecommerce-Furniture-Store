# ADR D46 — Policy-filtered query/list results (RC5.7)

- **Status:** Accepted
- **Date:** 2026-07-18
- **Phase:** RC5.7 — Query/list record filtering
- **Depends on:** D02, D35, D43, D45

## Context

RC5.5 (ADR D45) enforces owner/organization/branch scopes on record-targeting
operations by loading the persisted record before authorization. List-shaped
queries remained unfiltered: the collection-bearing query handlers
(`Get*Summary`, `GetServiceHistory`) listed company-wide rows and projected
counts and record ids without consulting the principal's scopes. Two problems
followed:

1. **Row leakage.** A company-scoped repository page contains rows outside an
   own/organization/branch principal's scope; counts and id arrays leaked the
   existence of those records.
2. **Gate paradox.** The collection resource has no single persisted
   owner/org/branch, so its `PolicyResource` scope fields were all null and
   the existing Policy Engine denied scoped principals the entire operation
   (`scope_mismatch`) — all-or-nothing rather than "your slice of the data".

The frozen governance specification requires: "List/summary/export operations
authorize the operation once and enforce tenant/scope in the authoritative
query; never perform unbounded per-row remote authorization"
(`docs/rc5/13-Authorization-Governance-Specification.md` §6). The record
security specification forbids inventing "a separate RLS database engine"
(`docs/rc5/06-Record-Level-Security.md` §1). The Policy Engine algorithm is
frozen and must remain the sole authorization authority.

## Decision

1. **Collection gate scope hints.** A list-returning handler's `authorize()`
   builds the collection `PolicyResource` with scope fields derived from the
   principal's own active assignments (`principalListScope`): `ownerUserId` =
   the principal when an own-scoped assignment exists, `organizationId` /
   `branchId` = the first matching scoped assignment's `scopeId`. The gate
   then means "records within the caller's scopes". Permission and company
   isolation checks are unchanged; a principal with no active assignments
   keeps all-null fields and remains denied. The Policy Engine algorithm is
   untouched.
2. **Row filtering through the Policy Engine.** After the repository returns
   its company-scoped page, the handler passes every row through
   `filterAuthorizedRecords` (`@afh/application`), which delegates each row
   decision to `PolicyEngine.evaluate` with the row's own read action
   (e.g. `sales.opportunities.read`) and a resource populated from persisted
   row data — including the row's persisted `companyId`, so company isolation
   also stops any adapter that leaked a foreign row. Only allowed rows feed
   counts, id projections, and derived lookups (e.g. inventory movement
   sampling iterates visible items only).
3. **In-process, bounded evaluation.** The Policy Engine is an in-process
   component and every filtered list is bounded by the repository page size
   (currently ≤ 500 rows). This satisfies the governance rule: the operation
   is authorized once at the gate, and scope is enforced over the
   authoritative company-scoped query result without unbounded *remote*
   per-row authorization. Pushing scope predicates into SQL was rejected
   because it would duplicate `#scopeAllows` in the persistence layer and
   create a second authorization authority.
4. **Missing data denies.** Aggregates that persist no owner/organization/
   branch fields (suppliers, purchase orders, inventory items, financial
   accounts, CRM contacts) produce all-null row resources, so scoped
   principals see zero of them — fail-closed, consistent with D45's missing
   resource rule. Company/global principals are unaffected.
5. **Child collections inherit the parent.** Lines, ledger entries,
   adjustments, memberships, locations, and per-parent lists
   (`listLines`, `listEntries`, `listByProject`, `listByServiceRequest`, …)
   are reached only through an already-authorized parent record (D45
   load-before-authorize) and are not re-filtered per row.
6. **Fail-closed.** A missing principal or a thrown Policy evaluation error
   fails the whole query (`principal_missing` / `policy_evaluation_failed`);
   partial results are never returned.

## Consequences

- Scoped principals can now run summary/list queries and receive only their
  slice; previously they received a blanket 403. This is the intended
  behavioral change of RC5.7.
- Counts, id arrays, and pagination-derived metadata reflect only authorized
  rows; out-of-scope record existence is no longer leaked.
- Per-row engine denials write `policy.deny` security audit records; on large
  pages this increases audit volume for scoped principals. Accepted: it is
  the existing engine's documented deny path and provides evidence.
- Post-repository filtering can shorten a page relative to the raw
  repository count. Current consumers (summaries) do not expose pagination
  metadata; when true `List*` endpoints ship (RC7), totals must be computed
  after filtering — noted as an obligation, not delivered here.
- Permission-to-scope binding remains deferred exactly as recorded in D45.

## Rejected alternatives

- **SQL scope predicates in repositories:** duplicates Policy scope rules in
  a second layer; forbidden by the sole-authorizer rule.
- **Keeping the blanket deny for scoped principals:** fails the RC5.7
  requirement; row filtering would be dead code because only company-scoped
  principals could ever reach a list.
- **A new bulk-evaluate Policy API:** changes the frozen Policy Engine
  surface; unnecessary while pages are bounded.
