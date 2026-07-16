# RC5.1 Implementation Readiness

## 1. Can RC5.1 begin immediately?

**Recommendation: GO, with conditions.**

RC5.1 is defined as seeding permissions/roles using existing Identity RBAC stores. The engine, stores, models, Policy evaluation, and 107 AuthorizationSpec hooks already exist. No new authorization architecture is required to begin that seed work.

RC5.1 must not begin with action-string renormalization, frontend route gating, field security, or new Policy engines. Those belong later and would create false denials or architecture drift.

## 2. Overall readiness percentage for RC5.1

| Dimension | Weight | Score | Weighted |
|---|---:|---:|---:|
| Architecture reuse readiness (Policy/RBAC already sole path) | 25 | 95 | 23.75 |
| Exact current action catalog known | 20 | 90 | 18.00 |
| Seed/bootstrap tooling readiness | 15 | 40 | 6.00 |
| Role catalog decision completeness | 15 | 55 | 8.25 |
| Documentation accuracy after audit | 10 | 80 | 8.00 |
| Test fixture / activation prerequisites | 10 | 55 | 5.50 |
| Migration/rollback clarity | 5 | 70 | 3.50 |
| **Overall RC5.1 readiness** | **100** | | **73%** |

Readiness for later milestones is lower and must not be conflated with RC5.1:

| Later milestone | Estimated readiness |
|---|---:|
| RC5.2 UI route/nav gates | 35% |
| RC5.3 dashboard gates | 30% |
| RC5.4 API taxonomy/upload Policy | 45% |
| RC5.5 record-scope hardening | 25% |
| RC5.6 field security | 10% |
| RC5.7 full authorization test gate | 40% |

## 3. Blocking issues

| ID | Severity | Blocker | Required before/during RC5.1 |
|---|---|---|---|
| B1 | Critical | 105 legacy executable keys have no canonical mapping | Seed 105 canonical backend permissions and map every current key exactly once |
| B2 | Critical | Zero roles/assignments exist | RC5.1 defines/seeds the locked 33-role catalog; user assignment is a separately approved pre-enforcement operation |
| B3 | High | Upload route has no Policy action | Strictly out of RC5.1; canonical `dam.assets.upload` enforcement belongs to RC5.4 |
| B4 | High | Session DTO lacks roles/permissions | Blocks RC5.2, not RC5.1 backend seeding |
| B5 | Medium | No registered workflow/rules/approval definitions | Command smoke may fail after Policy allow; separate fixtures/tests for seed verification |
| B6 | Medium | Unresolved catalog decisions (`vendor`/`guest`/`agent`) | Resolve before full catalog seed |

No blocker requires a new authorization framework.

## 4. Documentation issues

- Target permissions were written as if they were current.
- Upload Policy requirement is inaccurate today.
- Feature flags named in migration/plan do not exist yet.
- Re-login is not required for backend role resolution.
- `ai.assistant.use` is not already gated.
- Field omission is not implemented.
- Own/branch/org resource population is not implemented.

These are corrected by this audit package and the RC5 blueprint correction notes.

## 5. Architecture risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Multiple role assignments widen access | Company/global assignment short-circuits narrower scopes | Seed carefully; test unions; avoid claiming automatic narrowing |
| Mapping/normalization of action strings | Immediate deny of all handlers | Explicit RC5.1 mapping; dual-code period for RC5.4 normalization |
| Frontend local/fixture data | Appears authorized while bypassing Policy | Keep presentation modules ungated for “security evidence” claims |
| EnhancedPolicyEngine empty enrichers | ABAC not active by mere wiring | Populate attributes/enrichers only when needed; no second engine |
| Super-admin code shortcut | Break-glass behavior without seeded role still exists as code path | Seed and tightly control assignment; audit |

## 6. Migration risks

| Risk | Impact |
|---|---|
| Enabling catalog without user mapping | Total CQRS deny for business users |
| Normalizing actions before dual mapping | Total CQRS deny |
| Treating UI hide as security | False confidence |
| Smoke-testing mutating commands without workflow definitions | False seed failure |
| Rolling back seed without Identity DB backup | Orphaned or incomplete assignments |
| Enabling UI gates before session DTO hand-off | Incomplete or insecure front-end authorization |

## 7. Testing prerequisites

Before calling RC5.1 complete:

1. Identity DB backup for the target environment.
2. Deterministic seed of 105 canonical backend permissions, 33 system roles, and approved role-permission links.
3. Exact one-to-one mapping for all 105 legacy keys used by all 107 handlers.
4. Grammar, approved-verb, wildcard, uniqueness, hierarchy, mapping-completeness, and idempotency tests.
5. Proof that RC5.1 did not assign users, protect routes, modify navigation/UI, change handler enforcement, or implement record/field security.

## 8. GO / NO-GO decision

| Decision | Result |
|---|---|
| Begin RC5.1 seed work after explicit approval | **GO** |
| Begin RC5.2/UI gates now | **NO-GO** |
| Begin RC5.4 action-renormalization first | **NO-GO** |
| Begin RC5.5/RC5.6 scope/field claims now | **NO-GO** |
| Begin any source-code implementation in this audit turn | **NO-GO** — wait for explicit approval |

## 9. Recommended first implementation slice (after approval)

1. Define and seed 105 canonical backend permissions.
2. Seed the locked 33-role catalog and role-permission mappings.
3. Add explicit mappings for all 105 current executable action keys.
4. Prove catalog grammar, hierarchy, completeness, and idempotency only.
5. Defer user assignment and all enforcement/UI/record/field work to their approved later checkpoints.
