# RC5.8 Independent Audit — Permission-to-Scope Binding

- **Date:** 2026-07-18
- **Subject:** RC5.8 as delivered in `docs/release/RC5.8-scope-binding.md`
  (ADR D47), audited before commit against the approved scope.
- **Method:** independent read-only review of the uncommitted diff, the full
  Policy Engine source, the RC5.7 filtering module, all five handler call
  sites, both new test suites, all documentation claims, and re-execution of
  the Identity and API test suites. Adversarial bypass search across role
  hierarchy, super_admin, expired assignments, the `EnhancedPolicyEngine`
  decorator, and hand-built principals.

## Approved scope

- Permission-to-scope binding in the Policy Engine (the "target assignment
  rule": a permission authorizes a resource only when an assignment that
  contributed it also satisfies the resource scope — governance spec §2.2
  rules 4–5, deferred by ADR D45).
- Bind canonical permissions to owner/org/branch/company scope rules.
- Preserve backward compatibility where required.
- Out of scope: authentication/session changes, RBAC catalog redesign,
  route protection changes, frontend redesign.

## Findings

| # | Severity | Area | Finding |
|---|---|---|---|
| 1 | INFO (pass) | Algorithm | Binding is correct; no bypass found. The scope stage filters role entries to those whose per-entry `permissionCodes` include the action, then applies the pre-existing rules (super_admin → company/global → own/org/branch) to that subset only. Evaluation order and reason codes unchanged. Hierarchy cannot widen across assignments (chain entries carry the assignment's scope and only that role's direct grants); expired assignments contribute nothing; empty per-entry arrays correctly trigger bound mode and grant nothing; `EnhancedPolicyEngine` is a pure deny-adding decorator that delegates untouched; no other production consumer of `principal.roles` exists. |
| 2 | LOW | Algorithm | The legacy fallback (no entry carries per-entry data ⇒ pre-RC5.8 union semantics) is a deliberate, documented compatibility hatch. Currently safe: every production principal comes from `buildPrincipal`, which always populates per-entry data, and principals are built fresh per request. Latent surface only — future hand-built principals would silently opt out of binding. Suggested follow-up (not blocking): make per-entry data mandatory or log when the legacy path fires. |
| 3 | INFO (pass) | Compatibility | `PolicyEngine.evaluate` / `buildPrincipal` signatures unchanged; flat permission union preserved; session projection untouched; the single manually-built test principal behaves identically via legacy fallback; upload authorization now correctly requires the granting assignment's scope, with RC5.4 upload tests green. |
| 4 | INFO (pass) | RC5.7 interplay | Action-aware `principalListScope` is correct at all five (and only) production call sites; the shadowing false-deny is fixed and tested; `filterAuthorizedRecords` correctly needed no change (each row already evaluates with the row's own action). |
| 5 | INFO (pass) | Scope discipline | The diff touches exactly the claimed files. Nothing under `packages/identity/src/rbac/**`, `packages/web/src/**`, auth/session files, or route-permission catalogs. |
| 6 | LOW | Documentation | Identity test count misstated as 13; the suite contains 14 tests (verified by direct run: 14/14 pass). **Resolved:** counts corrected to 14 (and the pre-existing breakdown to 56) in both release reports. |
| 7 | INFO (pass) | Test adequacy | The key tests genuinely discriminate: the own/org/branch widening denials, the super_admin non-grant denial, and the pipeline cross-role test would all have failed on the pre-RC5.8 engine; the branch-shadow test additionally discriminates against a binding implementation without action-aware gate hints. Preservation and fail-closed directions are covered. |
| 8 | INFO | Test adequacy | Non-blocking gaps: no `global`-scope binding case, no expired-assignment engine test, no evaluation through `EnhancedPolicyEngine` (delegation trivially safe by inspection), and legacy-principal `principalListScope` fallback only implicitly covered. |
| 9 | INFO (pass) | Documentation | ADR D47, ADR-INDEX row, D45/D46 delivery notes, governance spec §2.2 rules 4–5, `06-Record-Level-Security`, `03-Role-Catalog` rule 4, `10-Test-Plan` decoupling row, and the `09-Implementation-Plan` evidence note all exist and match the code. |
| 10 | LOW | Documentation | `docs/rc5/09-Implementation-Plan.md` referenced `docs/release/RC5.8-scope-binding-audit.md` before it existed. **Resolved:** this document is that report. |
| 11 | LOW | Documentation | The "13 tests" figure was repeated across both release reports. **Resolved together with finding 6.** |

## Verified evidence

- `npm test -w @afh/identity`: 70 pass / 0 fail (56 pre-existing + 14 new).
- `npm test -w @afh/api`: 66 pass / 0 fail (61 pre-existing + 5 new).
- Pre-RC5.8 discrimination confirmed by reading the old `#scopeAllows`
  semantics against each key assertion.

## Verdict

**RC5.8 meets its approved scope.** The target assignment rule is genuinely
implemented: the scope stage is bound to granting assignments, no fail-open
path or widening vector was found, backward compatibility is preserved
exactly as claimed, the RC5.7 gate interplay is handled correctly, and no
out-of-scope files were touched. The key tests would have failed on the
pre-RC5.8 engine, so the coverage is real. The only defects were
documentation-level (test-count off-by-one, phantom audit-report reference)
and both are resolved. No code change is required before acceptance.
