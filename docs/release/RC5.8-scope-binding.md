# RC5.8 — Permission-to-Scope Binding in the Policy Engine

- **Date:** 2026-07-18
- **Approved scope:** bind canonical permissions to owner/org/branch/company
  scope rules in the Policy Engine; preserve backward compatibility where
  required. No authentication/session changes, no RBAC catalog redesign, no
  route protection changes, no frontend redesign.
- **Decision record:** `docs/architecture/decision-records/ADR-D47-permission-to-scope-binding.md`

## What was delivered

RC5.8 implements the "target assignment rule" that ADR D45 explicitly
deferred (`docs/rc5/13-Authorization-Governance-Specification.md` §2.2 rules
4–5): **a permission authorizes a resource only when an applicable assignment
that contributed that permission also satisfies the resource scope.**

1. **Per-entry binding data** (`packages/identity/src/policy/policy-engine.ts`)
   - `PolicyPrincipal.roles` entries (new exported type `PolicyPrincipalRole`)
     gain an optional `permissionCodes` field.
   - `buildPrincipal` populates it for every entry with the direct permissions
     of that chain role under its assignment's scope, reusing the permission
     loads it already performed (no extra queries). The flat
     `PolicyPrincipal.permissionCodes` union is preserved for presentation.
2. **Scope stage bound to granting entries** (same file)
   - `evaluate`'s scope stage now filters role entries to those whose
     per-entry `permissionCodes` include the evaluated action and applies the
     existing scope rules (super_admin bypass, company/global pass,
     own/organization/branch matching) to that subset only.
   - The permission stage, company isolation, evaluation order, decision
     shape, audit calls, and all reason codes are unchanged; binding denials
     surface as the existing `scope_mismatch`.
   - The super_admin bypass applies only through entries that granted the
     action. The seeded `super_admin` role holds every catalog permission
     directly, so catalog behavior is unchanged.
3. **Backward compatibility**
   - Principals whose role entries carry no per-entry permission data
     (built before RC5.8 or constructed manually) keep the exact pre-RC5.8
     behavior: all entries are considered by the scope stage.
   - Partially populated principals fail closed: when any entry carries
     per-entry data, entries without it grant nothing.
   - `PolicyEngine.evaluate` and `buildPrincipal` signatures are unchanged;
     `EnhancedPolicyEngine` delegation is unaffected.
4. **RC5.7 interplay** (`packages/application/src/security/record-filtering.ts`)
   - `principalListScope` accepts an optional gate action and derives
     collection-gate scope hints only from role entries that grant it.
     Without this, a non-granting assignment's `scopeId` could shadow the
     granting assignment's hint and falsely deny the collection gate under
     binding. The five summary handlers (sales, procurement, inventory,
     finance, CRM) pass their gate action.
   - Per-row filtering (`filterAuthorizedRecords`) needed no change: every
     row is evaluated with the row's own action, so binding applies per row
     automatically.

## Behavioral change

For principals with mixed-scope assignments, each permission is now confined
to the scopes of the assignments that granted it:

- `sales_manager@own` + `warehouse_manager@company` could previously update
  **any** opportunity in the company (the company-scoped inventory assignment
  satisfied the scope gate for the sales permission). Now: own opportunities
  only, while warehouse permissions remain company-wide.
- If two assignments grant the **same** permission, its effective scope is
  still the union of those assignments' scopes (e.g. own + company ⇒
  company-wide for that permission).
- Single-assignment principals, company/global-only principals, and
  super_admin are unaffected.

This is an access **reduction** only; no principal gains access.

## What was not changed

- Authentication, sessions, and the `/api/v1/auth/session` permission
  projection (still the flat presentation union).
- RBAC catalog, role seeds, permission codes, and role hierarchy semantics.
- Route protection (frontend and API route permission mappings).
- `PolicyDecision` reason codes and the evaluation order
  (permission → company isolation → scope).
- Frontend code.

## Files changed

| File | Change |
|---|---|
| `packages/identity/src/policy/policy-engine.ts` | `PolicyPrincipalRole` with per-entry `permissionCodes`; `buildPrincipal` populates it; scope stage binds to granting entries with legacy fallback |
| `packages/identity/src/policy/index.ts` | Export `PolicyPrincipalRole` |
| `packages/identity/src/policy/policy-engine.test.ts` | New engine binding test suite (14 tests) |
| `packages/identity/package.json` | Register the new test file |
| `packages/application/src/security/record-filtering.ts` | `principalListScope(principal, action?)` — action-aware gate hints |
| `packages/{sales,procurement,inventory,finance,crm}-application/src/handlers/query-handlers.ts` | Summary handlers pass their gate action to `principalListScope` |
| `packages/api/src/authorization/scope-binding.test.ts` | New pipeline binding test suite (5 tests) |
| `packages/api/package.json` | Register the new test file |

## Tests

- `packages/identity/src/policy/policy-engine.test.ts` (14 tests):
  per-entry data population and hierarchy scope carry-over; cross-role
  widening denied for own/organization/branch grants; company-wide access
  preserved for the granting assignment's own permissions; same-permission
  multi-assignment union; super_admin bypass bound to its grants; legacy
  principal fallback; partial-principal fail-closed; unchanged
  `permission_missing` and `company_isolation` stages.
- `packages/api/src/authorization/scope-binding.test.ts` (5 tests): real
  behavior stack + seeded catalog — cross-role widening denied before the
  handler runs (`scope_mismatch`), owner path preserved, company-scoped
  assignment's own grants stay company-wide, scoped list gate passes via the
  granting assignment with rows filtered to it, and a non-granting
  assignment's branch cannot shadow the granting assignment's branch.
- Full Identity (70) and API (66) suites green; Web suite unaffected.

## Residual risks / notes

1. Manually constructed principals (only occurrence:
   `packages/api/src/authorization/field-authorization.test.ts` test helper)
   use the legacy fallback and therefore do not exercise binding; production
   principals always come from `buildPrincipal` and are always bound.
2. The session projection remains a flat union by design; UI gating cannot
   express "permission X only within scope Y". Route protection is
   presentation-only and backend binding is authoritative (unchanged model).
3. Dedicated `List*` endpoints (RC7) and workflow/approval ownership (RC6)
   remain out of scope, as recorded in ADR D46.
