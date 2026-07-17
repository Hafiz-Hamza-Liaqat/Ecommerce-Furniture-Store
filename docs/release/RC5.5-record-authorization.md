# RC5.5 — Record-Level Authorization

**Date:** 2026-07-17  
**Milestone:** RC5.5 — Record-level authorization (load-before-authorize)  
**Frozen sources:** `docs/rc5/06-Record-Level-Security.md`, `docs/rc5/09-Implementation-Plan.md`, `docs/rc5/13-Authorization-Governance-Specification.md`  
**ADR:** `docs/architecture/decision-records/ADR-D45-record-authorization-load-before-authorize.md`

---

## 1. What RC5.5 delivers

RC5.4 populated `PolicyResource` owner/org/branch/attributes from command/query
payloads when those fields were present. That left record-targeting updates,
lifecycle commands, and get-by-id queries spoofable for own/organization/branch
scopes. RC5.5 closes that gap without changing the Policy Engine:

1. **Load-before-authorize (ADR D45).** Record-targeting handlers load the
   persisted aggregate through the same company-scoped `findById({ companyId, id })`
   used by `handle()`, then populate `PolicyResource` from **persisted** data.
2. **Fail-closed helper.** Each of the seven `*-application` packages exports
   `loadRecordForAuthorization`. Repository failures throw the `PlatformError`;
   `ExceptionMappingBehavior` maps it to a failed result. Authorization never
   proceeds on a permissive default.
3. **Own / organization / branch enforcement.** Scoped principals are evaluated
   by the existing `RbacPolicyEngine` against persisted `ownerUserId`,
   `organizationId`, and `branchId`. Payload-claimed ownership is ignored.
4. **Cross-company / missing-resource semantics.** Foreign `companyId` →
   `company_isolation`. Company-keyed loads never return foreign rows. Missing
   records deny scoped principals (`scope_mismatch`); company-scoped principals
   reach the handler's existing not-found path (no existence leak).
5. **Attribute glossary.** Documented below (§7). Attributes remain contextual
   metadata; the current engine does not branch on them.
6. **Targeted tests.** `packages/api/src/authorization/record-authorization.test.ts`
   covers owner allow/deny, organization isolation, branch isolation, cross-company
   denial, missing resource handling, and fail-closed behavior.

## 2. What did not change

- Policy Engine algorithm (`RbacPolicyEngine.evaluate`, `#scopeAllows`).
- Permission catalog, role catalog, or catalog version.
- Authentication / session handling / JWT format.
- Frontend routing, menus, dashboards, navigation.
- Field-level authorization (RC5.6).
- Permission-to-scope binding (deferred; requires engine algorithm change — see
  ADR D45 and residual notes below).
- New HTTP endpoints or CQRS command/query types.

## 3. Files changed (summary)

| Area | Files |
|---|---|
| ADR | `docs/architecture/decision-records/ADR-D45-…`, `ADR-INDEX.md` |
| Fail-closed helper | `packages/*-application/src/support/support.ts` (7) |
| Load-before-authorize handlers | Update / lifecycle / get-by-id handlers across sales, procurement, inventory, finance, projects, service, crm (~93 `loadRecordForAuthorization` call sites) |
| Tests | `packages/api/src/authorization/record-authorization.test.ts`; `packages/api/package.json` test script |
| Docs | this report, audit, `06`, `09`, `13` |

## 4. Tests added

`packages/api/src/authorization/record-authorization.test.ts` (11 cases):

| Suite | Coverage |
|---|---|
| Owner allow/deny | Own-scoped `sales_manager` allowed on persisted owner; denied when payload spoofs ownership |
| Organization isolation | Same-org allow; cross-org `scope_mismatch` |
| Branch isolation | Same-branch warehouse allow; cross-branch deny |
| Cross-company (IDOR) | Foreign `companyId` → `company_isolation`; company-keyed load never sees foreign rows |
| Missing resource | Scoped principal → `scope_mismatch`; company-scoped reaches handler not-found |
| Fail-closed | Repository infrastructure failure aborts; handler never reached |

## 5. Verification results (2026-07-17)

| Check | Result |
|---|---|
| Full workspace build | PASS |
| Full workspace typecheck | PASS |
| Full workspace lint (`--max-warnings 0`) | PASS |
| Identity tests | PASS (56) |
| API tests | PASS (41; includes 11 new RC5.5 cases) |
| Web tests | PASS (43) |
| Runtime verify | PASS |
| Runtime harden | PASS |
| Runtime accept | PASS |

## 6. Residual notes (not blockers; not RC5.5)

1. **Permission-to-scope binding** (`13` §Default-deny rules 4–5) remains deferred.
   Changing it would alter the Policy Engine algorithm, which is out of scope.
2. **List queries** still cannot enforce row-level filters until RC7 List*.
3. **Dual-branch stock transfers** expose destination as `attributes.toBranchId`
   only; the engine evaluates a single `branchId` (source warehouse).
4. **Create commands** continue to use payload-derived scope (record does not
   exist yet) — unchanged RC5.4 behavior.

## 7. PolicyResource attribute glossary

Keys placed on `PolicyResource.attributes` by RC5.4/RC5.5 handlers. They are
audit/context metadata only; `RbacPolicyEngine` does not evaluate them today.
Do not invent parallel authorization logic that reads these keys.

| Attribute key | Typical resource | Meaning |
|---|---|---|
| `accountId` | CRM activity | Related CRM account |
| `addressId` | Warehouse / inventory item | Linked address |
| `appointmentId` | Service appointment | Appointment identity context |
| `assigneeTeamId` | Project work item | Assigned team |
| `audienceId` | CRM campaign | Campaign audience |
| `billToAddressId` | Invoice | Billing address |
| `calendarId` | Project schedule | Resource calendar |
| `categoryId` | Supplier | Supplier category |
| `contactId` | CRM activity | Related contact |
| `crmAccountId` | Service request | CRM account linkage |
| `crmContactId` | Service request | CRM contact linkage |
| `customerId` | Opportunity / project | Customer reference |
| `employeeId` | Service technician | Technician employee |
| `fromBranchId` / `toBranchId` | Stock transfer | Source / destination branch |
| `fromLocationId` / `toLocationId` | Stock transfer | Source / destination location |
| `fromWarehouseId` / `toWarehouseId` | Stock transfer | Source / destination warehouse |
| `inventoryItemId` | Stock / ledger | Inventory item |
| `invoiceId` | Payment | Related invoice |
| `leadId` | CRM activity | Related lead |
| `locationId` | Stock | Bin / location |
| `methodId` | Payment | Payment method |
| `opportunityId` | Order / quote | Source opportunity |
| `ownerId` / `ownerType` | Ledger entry | Polymorphic owner |
| `parentId` | Inventory item | Parent item |
| `parentTaskId` | Project task | Parent task |
| `payerCustomerId` | Payment | Paying customer |
| `primaryContactId` | CRM party / account | Primary contact |
| `projectId` | Opportunity / task / schedule | Project membership context |
| `quoteId` | Order | Source quote |
| `requisitionId` | Purchase order | Source requisition |
| `resourceKind` | Project resource | Resource classification |
| `salesCustomerId` | CRM lead | Converted / related sales customer |
| `salesOrderId` | Service request | Related sales order |
| `serviceRequestId` | Work order / appointment | Parent request |
| `siteAddressId` | Project | Project site |
| `sourceId` | CRM lead | Lead source |
| `subjectId` | Stock movement | Movement subject |
| `supplierId` | Purchase order | Supplier |
| `taskId` | Project schedule | Related task |
| `teamId` | Project | Team membership |
| `territoryId` | Opportunity | Sales territory |
| `warehouseId` | Stock / PO | Warehouse |
| `workItemId` | Project schedule | Work item |
| `workOrderId` | Appointment / query | Work order |
| `workTypeId` | Work order | Service work type |

## 8. Suggested commit message

```text
feat(rc5.5): enforce record-level authorization via load-before-authorize
```

## 9. Stop condition

RC5.5 is complete. Do **not** start RC5.6. Do **not** commit until review
approval.
