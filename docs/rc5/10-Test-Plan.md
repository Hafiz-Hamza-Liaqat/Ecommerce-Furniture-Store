# RC5 — Test Plan

**Goal:** Prove Policy-only authorization, RBAC catalog correctness, scope isolation, and UI non-authority.  
**Reuse:** runtime-host harden/accept patterns; Identity/Policy unit tests; API integration style from RC2/RC4.

---

## 1. Unit tests

| Area | Cases |
|---|---|
| Permission definitions | Canonical three-segment grammar; approved verb; reserved prefix; no wildcard; uniqueness; all 105 legacy keys map exactly once; all 107 handlers resolve |
| RbacService | define permission/role; grant; assign with scopes; hierarchy inheritance via `parentRoleId`; multiple assignment union within scope; expiry `validTo`; cycle rejection |
| PolicyEngine | allow with permission; deny missing; deny company mismatch; own scope allow/deny; org/branch scope; explicit deny precedence; missing resource deny; feature flag deny when wired; inactive user |
| EnhancedPolicyEngine | attribute conditions if used |
| AuthorizationSpec builders | resource fields populated for sample commands per module |
| Field DTO redaction | omit cost/KYC when denied |

---

## 2. Integration tests

| Area | Cases |
|---|---|
| Dispatch pipeline | unauthenticated → 401; authenticated without perm → 403; with perm → 200/domain result |
| Company header | mismatch → reject |
| Upload | wrong company → reject; MIME deny; `dam.assets.upload` deny/allow after RC5.4 |
| Session | refresh rotation; revoke |
| Rate limit | auth burst → 429 (single process) |

---

## 3. Authorization / permission matrix tests

| Test | Method |
|---|---|
| Role × module dashboard open | For each role seed, assert allow/deny on representative query/command |
| CRUD matrix sample | Per module: create/get/update/lifecycle happy + deny |
| Export permission | View-only role cannot export (when export exists; else UI flag) |
| Approver vs viewer | claim/decide denied for viewer (when Approval API exists; until RC6 test engine submit path) |

Use **seeded fixtures** of roles from `03-Role-Catalog.md` — not ad-hoc strings.

---

## 4. Role switching

| Case | Expected |
|---|---|
| Same user sequential role assignments | Effective permissions change after re-build principal |
| Temporary role expiry | Auto-deny after `validTo` |
| Admin cannot grant Super Admin | Deny `identity.roles.assign` when target role is `super_admin` |
| Impersonation | Forbidden by default (0E) |

---

## 5. Tenant / company isolation

| Attack | Expected |
|---|---|
| Cross-company GetOpportunity | 403/404 |
| Cross-company UpdateInvoice | 403/404 |
| Cross-company upload | 403 |
| List pollution | **RC5.7:** summary/list rows are Policy-filtered per row (ADR D46); covered by `packages/api/src/authorization/list-filtering.test.ts`. Residual UI fixture risk remains documented until RC7 `List*` endpoints. |
| Platform admin without company role accessing ERP command | Deny |

---

## 6. Cross-company / IDOR

| Attack | Expected |
|---|---|
| Guess UUID of other company aggregate | Deny |
| Portal user accesses other customer order id | Deny |
| Partner accesses other project | Deny |
| Branch manager accesses other branch stock adjust | Deny |

---

## 7. Record ownership

| Case | Expected |
|---|---|
| Sales rep updates own opportunity | Allow |
| Sales rep updates peer opportunity | Deny |
| Technician closes unassigned WO | Deny |
| Project partner views assigned project | Allow |

---

## 8. Field visibility

| Case | Expected |
|---|---|
| Rep Get with cost fields | Cost absent/redacted |
| Finance Get | Cost present |
| Non-KYC user | Restricted DAM/KYC metadata denied |
| Forbidden patch of salary/credit | Rejected |

---

## 9. UI / route tests (when Playwright available)

| Case | Expected |
|---|---|
| Nav hidden for denied module | Not in sidebar |
| Deep link to denied module | Forbidden empty state; no data |
| Export button | Hidden/disabled without export perm |
| Configure widgets | Admin/executive only |

Until E2E exists, manual checklist acceptable for RC5.9 with recorded evidence.

---

## 10. Required adversarial and precedence coverage

| Required area | Minimum case | Expected result |
|---|---|---|
| Unauthorized requests | No credential; invalid/revoked credential; active user without permission | 401 for authentication failure; otherwise fail-closed deny |
| Direct URL access | Enter a denied `/app`, `/portal`, or `/admin` deep link | Forbidden/redirect state and no protected data request succeeds |
| Menu visibility | Role lacks canonical route permission | Menu item absent/disabled as specified; direct URL and API remain independently denied |
| API-only access | Call command/query/upload without using UI | Policy produces the same deny; UI state is irrelevant |
| IDOR | Guess another user/org/project/company record id | Deny or non-enumerating not-found response |
| Cross-company access | Mismatched company header, payload, or persisted record | Deny regardless of permission or role |
| Cross-tenant access | When tenant is represented by company today, use a different company; repeat for any future explicit tenant id | Deny before company/resource authorization can allow |
| Privilege escalation | Admin grants Super Admin/global scope; custom role adds unavailable permission; expired assignment reused | Deny and always audit |
| Hidden field access | Request sensitive fields directly or use an alternate endpoint/export | Field absent/redacted or request denied; UI hiding alone is not accepted |
| Read-only enforcement | Read-only/auditor calls create/update/delete/lifecycle or submits forbidden fields | Deny without partial mutation |
| Permission inheritance | Parent permission inherited once; deep hierarchy deterministic; cycle rejected | Correct effective set with no scope widening |
| Multiple assignments | Narrow role + broad role; active + expired role; allow + explicit Policy deny | Only applicable active scopes contribute; explicit deny wins |
| Deny precedence | Permission allow combined with company/feature/approval/resource/record/field deny | Final decision is deny with stable reason |
| Missing data | Unknown permission, unmapped legacy key, missing required resource/scope attribute | Deny and emit configuration/security audit |
| Super Admin | Company ERP without company assignment; missing permission; cross-company resource; approval bypass attempt; platform scope-only case | Missing permission and cross-company deny; scope shortcut alone never grants permission; all audited |
| Empty catalog / zero roles | Active user with no role/permission seed | Every protected command/query denies `permission_missing` |
| Permission/scope decoupling | Permission from own-scoped role plus unrelated company-scoped role | **RC5.8 delivered (ADR D47):** the unrelated company-scoped role no longer widens the own-granted permission's scope; proven by `packages/identity/src/policy/policy-engine.test.ts` and `packages/api/src/authorization/scope-binding.test.ts` |
| Seed evolution | Idempotent rerun; hierarchy cycle; unmapped legacy key; rollback snapshot restore | Fail closed / restore previous catalog version |

These cases are milestone-aware: RC5.1 executes catalog/mapping/seed tests only. Route/menu tests begin in RC5.2, API tests in RC5.4, record/IDOR tests in RC5.5, and field tests in RC5.6. A later milestone may not weaken an earlier green case.

---

## 11. Performance tests

| Case | Evidence |
|---|---|
| Representative allow/deny mix | p50/p95/p99 Policy evaluation overhead and end-to-end contribution |
| Role depth and permission growth | Evaluation cost across shallow/deep inheritance and realistic permission counts |
| Evaluation frequency | One pre-handler evaluation per protected dispatch; documented post-load evaluation only where required |
| Request-local reuse | No repeated principal/catalog lookup in one request; no cross-resource final-decision reuse |
| Batch/list behavior | Operation authorization plus authoritative scoped query; no unbounded remote per-row authorization |

Goals and caching constraints are defined in `13-Authorization-Governance-Specification.md`. Tests must not introduce a new caching framework.

---

## 12. Regression

| Suite | Guard |
|---|---|
| Auth register/sign-in/refresh/MFA | Still pass |
| RC4 security headers/CORS | Still pass |
| Sample live ERP create/get per 7 modules | Still pass |
| Health probes | Still pass |
| Typecheck/lint/build | Still pass |
| Harden/accept | Still pass |

---

## 13. Non-tests (explicit)

- Workflow definition registration (RC6)  
- List API correctness (RC7)  
- Real AI provider calls (RC9)  
- Workflow/Approval durability or definition correctness (RC6)

---

## 14. Entrance / exit

| Gate | Criteria |
|---|---|
| Enter RC5.7 | RC5.1–5.6 code complete behind flags |
| Exit RC5.7 | All applicable required categories above green; Critical/High authorization defects zero; Medium documented with owner |
| Exit RC5.9 | Signoff checklist + residual risk register updated |
