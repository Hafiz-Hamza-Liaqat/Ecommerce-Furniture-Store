# RC5.3 — Module Permissions (Implementation Report)

**Date:** 2026-07-17
**Milestone:** RC5.3 — Module Permissions (user-approved scope: backend module CRUD enforcement)
**Frozen-plan correspondence:** the action-taxonomy normalization portion of `docs/rc5/09-Implementation-Plan.md` **RC5.4 — API authorization** (permitted to overlap after RC5.1). The plan's "RC5.3 — Dashboard authorization" is a different, still-pending slice.

---

## 1. What RC5.3 delivers

Module-level CRUD authorization is now enforced through canonical permission
codes end to end:

1. **Handler action normalization.** All 107 CQRS handler `authorize()` specs
   across the seven module application packages now emit canonical
   `<module>.<resource>.<action>` permission codes from the frozen RC5.1
   catalog instead of legacy executable action keys. The change is confined to
   the seven `*PolicyActions` constant objects; no handler body, spec shape,
   or `PolicyResource` population changed.
2. **CRUD authorization mapping.** Every normalization followed the frozen
   `LEGACY_ACTION_MAP` in
   `packages/identity/src/rbac/catalog/permission-catalog.ts` exactly — one
   canonical code per legacy key, no renames, no new codes.
3. **Overlap window preserved.** The RC5.1 seed continues to grant roles both
   the canonical codes and the legacy compatibility codes
   (`packages/identity/src/rbac/catalog/seed.ts`, unchanged). Rollback to
   legacy handler strings therefore requires no data migration.
4. **Module permission behavior tests.** A new suite proves allow/deny
   behavior through the existing Policy Engine and the existing
   `AuthorizationBehavior` dispatch pipeline.

## 2. Why this is enforcement, not just renaming

The Policy Engine matches permissions with exact fail-closed string equality
(`principal.permissionCodes.includes(action)`,
`packages/identity/src/policy/policy-engine.ts`). Before RC5.3, runtime module
authorization was satisfied only by the seeded *legacy compatibility* records;
the canonical catalog was advisory. After RC5.3, the canonical module CRUD
permissions in the catalog are the codes the runtime actually evaluates, which
is what the governance specification (`docs/rc5/13`, §1.6) defines as the
normalization step, executed through its documented overlap window.

## 3. Files changed

| File | Change |
|---|---|
| `packages/sales-application/src/constants.ts` | `SalesPolicyActions` → 10 canonical codes (9 distinct) |
| `packages/procurement-application/src/constants.ts` | `ProcurementPolicyActions` → 11 canonical codes (10 distinct) |
| `packages/inventory-application/src/constants.ts` | `InventoryPolicyActions` → 17 canonical codes |
| `packages/finance-application/src/constants.ts` | `FinancePolicyActions` → 14 canonical codes |
| `packages/projects-application/src/constants.ts` | `ProjectsPolicyActions` → 20 canonical codes |
| `packages/service-application/src/constants.ts` | `ServicePolicyActions` → 16 canonical codes |
| `packages/crm-application/src/constants.ts` | `CrmPolicyActions` → 19 canonical codes |
| `packages/identity/src/rbac/catalog/permission-catalog.ts` | Doc comments only (legacy keys are now historical); no code/data change |
| `packages/api/src/authorization/module-permissions.test.ts` | **New** RC5.3 test suite (16 tests) |
| `packages/api/package.json` | Test script includes the new suite |

Total: 107 handler action references normalized; 105 distinct canonical codes.

## 4. Tests added (`packages/api/src/authorization/module-permissions.test.ts`)

**Mapping traceability (4 tests)**

- Every module handler action is a canonical catalog code owned by its module.
- No handler action remains a differing legacy executable key.
- The 107 handler action references cover the 105-code catalog exactly.
- Every canonical action is the mapped target of its frozen legacy key.

**Policy Engine behavior (9 tests)** — real seeded catalog, real
`RbacPolicyEngine`:

- `sales_manager` allowed sales + crm actions; denied finance, inventory,
  projects, service, procurement actions with `permission_missing`.
- `finance_manager` holds the finance pack only.
- `warehouse_manager` may adjust stock; `warehouse_staff` (operational,
  grants deferred to RC5.5 scoping) denied.
- `read_only` may read, never mutate.
- `admin` allowed representative CRUD actions across all seven modules.
- Cross-company access denied with `company_isolation`.
- Overlap window: legacy `order.create` still resolves for a granted role.
- User without any role assignment is denied.

**Pipeline dispatch (3 tests)** — real `CreateOpportunity` handler
`authorize()` through the real `AuthorizationBehavior`:

- Permitted principal passes and the pipeline continues.
- Principal without the module permission is blocked with an
  `AuthorizationError` (`permission_missing`) before the handler runs.
- Cross-company command blocked (`company_isolation`) before the handler runs.

## 5. Verification (all green, 2026-07-17)

| Gate | Result |
|---|---|
| `npm run build` (34 packages) | PASS |
| `npm run typecheck` (34 packages) | PASS |
| `npm run lint` (34 packages, max-warnings 0) | PASS |
| `npm test -w @afh/identity` | 54/54 PASS (catalog, mapping, roles, seed, validation unchanged and green) |
| `npm test -w @afh/api` | 20/20 PASS (4 existing session-projection + 16 new RC5.3) |
| `npm test -w @afh/web` | 43/43 PASS (RC5.2 route protection unaffected) |

## 6. Scope compliance

**Reused, unchanged:** Policy Engine (`RbacPolicyEngine`,
`EnhancedPolicyEngine`), `AuthorizationBehavior`, dispatcher, permission
catalog, role catalog, seed, route metadata, session permission projection.

**Explicitly not done (per RC5.3 exclusions):**

- No record-level security, ownership rules, or company/org/branch isolation
  changes (`PolicyResource` owner/org/branch population stays null — deferred
  with record security).
- No field-level security; no workflow authorization.
- No new APIs, routes, endpoints, authorization framework, or Policy Engine
  architecture changes.
- Upload-route Policy enforcement (`dam.assets.upload`) and OpenAPI production
  exposure policy remain in the frozen RC5.4 remainder; they are not module
  CQRS permissions.
- Frontend module entity CRUD route gating (matrix section E patterns) was
  offered and explicitly excluded from this slice by the approver.

## 7. Rollback

Revert the seven `*PolicyActions` constant objects to their legacy keys (or
revert the commit). No data migration is needed in either direction: the seed
grants both code forms and is idempotent.
