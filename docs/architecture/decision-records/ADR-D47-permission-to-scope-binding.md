# ADR D47 — Permission-to-scope binding in the Policy Engine (RC5.8)

- **Status:** Accepted
- **Date:** 2026-07-18
- **Phase:** RC5.8 — Permission-to-scope binding
- **Depends on:** D02, D43, D45, D46

## Context

Before RC5.8, `RbacPolicyEngine.buildPrincipal` unioned the permission codes of
all active role assignments into one flat set, and the scope stage of
`evaluate` (`#scopeAllows`) inspected the principal's role entries without
regard to which assignment contributed the evaluated permission. Consequence:
a company- or global-scoped assignment satisfied the scope gate for *every*
permission the principal held, including permissions granted only by an
own/organization/branch-scoped assignment. Example: `sales_manager@own` +
`warehouse_manager@company` could update *any* opportunity in the company,
because the company-scoped warehouse assignment widened the sales permission's
scope.

The governance specification recorded this as a known least-privilege risk and
defined the target rule: "a permission authorizes a resource only when an
applicable assignment that contributed that permission also satisfies the
resource scope" (`docs/rc5/13-Authorization-Governance-Specification.md`
§2.2 rules 4–5). ADR D45 explicitly deferred it because RC5.5 froze the Policy
Engine algorithm; RC5.8 is the approved engine change.

## Decision

1. **Per-entry permission binding data.** `PolicyPrincipal.roles` entries gain
   an optional `permissionCodes` field (`PolicyPrincipalRole`). `buildPrincipal`
   populates it for every entry with the direct permissions of that chain role
   under its assignment's scope. Because each role in an inherited chain
   becomes its own entry carrying the assignment's scope (existing behavior),
   the union of a chain's entries equals the assignment's full grant set, and
   binding per entry equals binding per assignment.
2. **Scope stage binds to granting entries.** `evaluate`'s scope stage
   (`#scopeAllows`) now filters the principal's role entries to those whose
   `permissionCodes` include the evaluated action, and applies the existing
   scope rules (super_admin bypass, company/global pass, own/org/branch
   matching) to that subset only. The permission stage (flat-set membership),
   company isolation, and all reason codes (`permission_missing`,
   `company_isolation`, `scope_mismatch`) are unchanged. A scope denial caused
   by binding surfaces as the existing `scope_mismatch`.
3. **Super Admin binding.** The super_admin scope bypass applies only through
   entries that granted the evaluated action. Since the seeded `super_admin`
   role directly holds every catalog permission, catalog behavior is
   unchanged; an unrelated `super_admin` entry can no longer widen an action
   it did not grant.
4. **Backward compatibility (legacy principals).** When *no* role entry
   carries per-entry permission data (principals built before RC5.8 or
   constructed manually), the scope stage considers all entries — exactly the
   pre-RC5.8 behavior. When *any* entry carries data, entries without data
   grant nothing (fail-closed for partially populated principals; a permissive
   per-entry fallback would let a hand-built company entry widen scope).
5. **Presentation union preserved.** The flat `PolicyPrincipal.permissionCodes`
   remains, and the `/api/v1/auth/session` permission projection is unchanged:
   it is a presentation set for UI gating and never expresses scope. No
   authentication, session, RBAC catalog, or route protection changes.
6. **Action-aware list gate hints (RC5.7 interplay).** `principalListScope`
   accepts the gate action and derives collection scope hints only from role
   entries that grant it. Without this, a non-granting assignment's `scopeId`
   could shadow the granting assignment's (first-match hint selection) and
   falsely deny the collection gate under binding. The five summary handlers
   pass their gate action. Row filtering (D46) needs no change: each row is
   evaluated with the row's own action, so binding applies per row
   automatically.

## Consequences

- Cross-role scope widening is closed for all engine-built principals: mixed
  assignments now confine each permission to the scopes of the assignments
  that granted it. This is the intended behavioral change of RC5.8 and can
  reduce access for principals that relied on the documented union risk.
- Same-permission multi-assignment behavior is a union of the granting
  assignments' scopes: `role@own` + `role2@company` where both grant the
  permission still yields company-wide access for it.
- RC5.7 list results for mixed-assignment principals now reflect the granting
  assignment's scope per row action (e.g. own-scoped sales rows alongside
  company-wide inventory rows).
- `buildPrincipal` performs no additional queries; it reuses the per-role
  permission loads it already made and attaches them per entry.
- Tests: engine-level binding, hierarchy, super_admin, legacy/partial
  fallback, and unchanged-stage coverage in
  `packages/identity/src/policy/policy-engine.test.ts`; pipeline and
  list-interplay coverage in
  `packages/api/src/authorization/scope-binding.test.ts`.

## Rejected alternatives

- **Binding at the permission stage** (deny `permission_missing` when no
  scope-satisfying assignment granted the action): conflates "you do not hold
  the permission" with "not on this resource", changing documented reason-code
  semantics and audit meaning.
- **Per-entry permissive fallback** (an entry without per-entry data grants
  everything): lets partially populated principals silently widen scope;
  rejected as fail-open.
- **A separate assignments array on the principal:** duplicates the existing
  per-assignment role entries; larger surface change for the same semantics.
- **Removing the flat permission union:** breaks the session projection and
  every existing consumer for no security gain — the union is never used for
  scope decisions after this change.
