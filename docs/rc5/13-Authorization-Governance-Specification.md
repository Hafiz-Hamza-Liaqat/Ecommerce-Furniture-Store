# RC5 — Authorization Governance Specification

**Status:** Frozen implementation baseline  
**Scope:** Documentation only; uses the existing Identity, RBAC, Policy Engine, Runtime, CQRS, Workflow, and Clean Architecture  
**Authority:** This document resolves naming, evaluation, seed, privilege, audit, and performance ambiguity across RC5.

---

## 1. Canonical permission naming

Every permission code has exactly three dot-separated segments:

```text
<module>.<resource>.<action>
```

Examples:

- `sales.orders.read`
- `sales.orders.create`
- `sales.orders.update`
- `sales.orders.delete`
- `sales.orders.export`
- `sales.orders.approve`

### 1.1 Segment rules

| Segment | Rule |
|---|---|
| `module` | Stable bounded-context or platform namespace; lowercase ASCII `snake_case`; singular where it names a bounded context (`sales`, `finance`, `identity`) |
| `resource` | Stable business or UI resource; lowercase ASCII `snake_case`; plural for collections (`orders`, `purchase_orders`, `audit_logs`) and singular for a true singleton or uncountable/concept resource (`dashboard`, `settings`, `health`, `history`) |
| `action` | One approved lowercase verb from section 1.2 |

Additional rules:

1. Codes are case-sensitive and immutable identifiers, not display text.
2. Each segment starts with a letter and contains only `a-z`, `0-9`, and `_`.
3. Empty segments, leading/trailing dots, consecutive dots, spaces, hyphens, slashes, and a fourth segment are forbidden.
4. A permission describes one capability. Scope, ownership, tenant, branch, workflow state, amount, and field sensitivity remain Policy inputs; they are not encoded into the code.
5. CRUD uses `read`, never `view` or `get`. UI “open/view” behavior maps to `read`.
6. Module-wide operations still name a resource, for example `sales.records.export`, not `sales.export`.
7. Constants, seeds, role mappings, route metadata, tests, and documentation must use the same canonical code.

### 1.2 Allowed actions

The frozen RC5 verb vocabulary is:

| Class | Allowed actions |
|---|---|
| CRUD | `read`, `create`, `update`, `delete` |
| Data movement | `import`, `export`, `upload`, `download` |
| Lifecycle | `submit`, `approve`, `reject`, `cancel`, `archive`, `restore`, `publish`, `unpublish`, `issue`, `close`, `complete`, `qualify`, `convert`, `revise` |
| Assignment | `assign`, `reassign`, `release`, `claim`, `delegate`, `escalate` |
| Operations | `execute`, `run`, `schedule`, `reschedule`, `transition`, `configure`, `manage`, `use` |
| Domain operations retained for compatibility | `receive`, `adjust`, `reserve`, `record`, `append`, `log`, `transfer` |

Adding a verb requires a documentation change, security review, catalog version increment, and compatibility assessment. Synonyms are not added merely for stylistic preference.

### 1.3 Reserved module prefixes

The following prefixes are reserved for their owning bounded contexts:

`executive`, `sales`, `procurement`, `inventory`, `finance`, `crm`, `projects`, `service`, `hr`, `manufacturing`, `cms`, `dam`, `notifications`, `reporting`, `search`, `analytics`, `ai`, `platform`, `identity`, `portal`, `integrations`, `calendar`.

`system`, `internal`, `root`, `super_admin`, `tenant`, and `company` are reserved and must not be introduced as permission module prefixes in RC5. Tenant/company constraints are Policy dimensions, not permission namespaces.

### 1.4 Wildcards

Wildcard permission records and grants are **not supported** in RC5.

- `sales.*.*`, `sales.orders.*`, and `*.orders.read` are invalid stored permissions.
- A role receives explicit permission records.
- Asterisks may appear only in explanatory documentation patterns, never in seed data, constants, assignments, tokens, or Policy inputs.
- “All permissions” for a system role means an explicit versioned mapping, not a runtime wildcard.

### 1.5 Valid and invalid examples

| Valid | Invalid | Reason |
|---|---|---|
| `sales.orders.read` | `sales.order.view` | resource must be plural; `view` is not canonical |
| `procurement.purchase_orders.issue` | `po.issue` | missing module and canonical resource |
| `finance.credit_accounts.adjust` | `finance.credit.edit` | noncanonical resource and verb |
| `platform.approvals.claim` | `approval.claim` | only two segments |
| `identity.roles.assign` | `role.grant_admin` | only two segments; role name must not be embedded in action |
| `dam.kyc_assets.read` | `kyc.view` | only two segments; `view` is not canonical |
| `analytics.dashboards.configure` | `analytics.configure` | missing resource |
| `ai.assistant.use` | `ai.settings.manage.extra` | four segments |

### 1.6 Backward compatibility

The 105 unique strings currently emitted by 107 CQRS handlers are **legacy executable action keys**, not canonical permission names. RC5.1 must not rename handlers or change Policy behavior.

RC5.1 creates:

1. one canonical permission record for each current executable capability;
2. an explicit, versioned legacy-action-key → canonical-permission mapping;
3. constants for canonical codes and mapping keys;
4. tests proving all 107 handlers resolve and all 105 legacy keys map exactly once.

Because current Policy evaluates `principal.permissionCodes.includes(action)` with exact fail-closed string matching and has **no alias layer**, RC5.1 mapping must keep handlers working without renaming them. The frozen compatibility method is:

1. Seed canonical `PermissionRecord.code` values.
2. For every legacy executable key, also seed a compatibility permission record whose `code` equals that legacy key, or otherwise ensure the principal's effective permission-code set contains the legacy key whenever the mapped canonical permission is granted.
3. Keep the versioned mapping as the authoritative old→new relationship for tests, migration, and later RC5.4 handler normalization.
4. Do not invent a second authorizer, wildcard matcher, or string rewriter outside that mapping.

No implicit prefixing, wildcard matching, fallback guessing, or undocumented rewriting is allowed. A missing or ambiguous mapping fails closed. Handler action-string normalization is RC5.4 and must use an overlap window in which old and canonical identifiers resolve to the same capability. Legacy keys are removed only after telemetry shows no use and rollback no longer depends on them.

The two reused summary keys (`order.read`, `po.read`) remain one permission each in RC5.1. Splitting them into dedicated summary permissions is a later catalog release and would raise the unique count from 105 toward 107.

The authoritative legacy inventory remains `audit/06-CQRS-Audit.md`; legacy strings in audit documents are evidence, not permission examples.

---

## 2. Authorization resolution rules

The Policy Engine remains the sole runtime authorizer. Middleware, route metadata, navigation, field presentation, workflow, and feature flags provide inputs or defense in depth; none may independently grant access.

### 2.1 Evaluation order

Logical authorization layers for RC5:

```text
Authentication
    ↓
Tenant
    ↓
Company
    ↓
Organization
    ↓
Branch
    ↓
Role Assignment
    ↓
Permission
    ↓
Policy
    ↓
Resource
    ↓
Record
    ↓
Field
    ↓
Decision
```

Current Policy Engine decision order inside the authorization step (must be preserved unless an ADR changes it):

```text
EnhancedPolicyEngine (when enrichers/predicates are wired)
  → approval_pending deny
  → attribute_mismatch deny
RbacPolicyEngine
  → permission_missing deny
  → company_isolation deny
  → scope_mismatch deny
  → allow
```

| Step | Required result |
|---|---|
| Authentication | A valid, active principal exists (`status === "active"`). Public endpoints terminate before authorization. Soft-delete fields are not currently enforced. |
| Tenant | Resolve the tenant boundary. In the current model, `companyId` is the tenant boundary; no separate tenant entity is introduced. |
| Company | Transport binds session/header company. Policy company isolation denies only when both principal and resource company ids are non-null and differ. Null-on-either-side is a documented gap to close in later milestones, not a grant. |
| Organization | If the operation is organization-scoped, active membership must match the resource organization. Currently effective only when resource/assignment fields are populated. |
| Branch | If branch-scoped, an active assignment must cover the resource branch. Transport may carry branch context, but Policy currently uses resource/assignment branch fields only. |
| Role Assignment | Load all active, non-expired assignments (`validFrom`/`validTo`). Multiple assignments contribute a union of permission codes. |
| Permission | Exact permission-code membership is required. Legacy keys resolve only through the RC5.1 mapping/compatibility seed. Missing permission denies before scope bypasses are considered. |
| Policy | The Policy Engine is the sole allow/deny decision maker. Enhanced Policy runs only the enrichers/predicates that are actually wired. |
| Resource | Validate resource type, id, company, organization, branch, owner, and required attributes supplied to Policy. |
| Record | Validate own/assigned/project/team and persisted-record constraints where the milestone supports them. Today, most handlers supply company-only resources. |
| Field | Apply sensitive read/edit rules where RC5.6 supports them. |
| Decision | Emit one final allow or deny with reason and audit metadata. |

### 2.2 Precedence and conflict rules

1. **Default deny:** absence of a proven allow is deny. There is no stored negative-permission/deny ACE today; “deny” means a failed prerequisite or isolation/Policy reason.
2. **Explicit deny wins:** any applicable isolation, Policy, resource, record, field, inactive-user, expiry, feature, or approval-pending deny overrides every role-derived allow.
3. **Allow is conjunctive:** allow requires every applicable boundary and control in the evaluation order to pass. Possessing a permission alone is insufficient.
4. **Multiple-assignment behavior — [RC5.8 delivered — ADR D47]:** the flat permission union remains for presentation (session projection), but the scope gate is now bound per assignment: `buildPrincipal` attaches each role entry's contributed permission codes, and `evaluate` considers only entries that granted the action. A company/global-scoped role no longer satisfies the scope gate for a permission that only a different (own/org/branch) assignment supplied. Legacy principals without per-entry data keep the pre-RC5.8 union behavior; partially populated principals fail closed (entries without data grant nothing). Evidence: `docs/release/RC5.8-scope-binding.md`.
5. **Target assignment rule — [RC5.8 delivered — ADR D47]:** a permission authorizes a resource only when an applicable assignment that contributed that permission also satisfies the resource scope. Seeds must not rely on accidental cross-role scope widening (now impossible for engine-built principals). Implemented in `RbacPolicyEngine` per ADR D47; tests in `packages/identity/src/policy/policy-engine.test.ts` and `packages/api/src/authorization/scope-binding.test.ts`.
6. **Inherited roles:** permissions are inherited through single-parent `parentRoleId`; cycles are invalid seed data. Inherited roles currently carry the assignment’s scope. Child roles may add permissions but cannot negate mandatory isolation.
7. **Missing permission:** deny with `permission_missing`; never infer from role display name, UI visibility, Super Admin label, or a similar code.
8. **Missing resource:** deny when a nonpublic operation cannot supply the resource fields required for its declared scope. Do not downgrade to company-wide access. **RC5.5 (ADR D45):** record-targeting update/lifecycle/get-by-id handlers load the persisted record before authorization and populate scope fields from that record; repository load failure fails closed. Create-style commands still authorize from the handler-supplied payload resource.
9. **Unknown mapping/code / principal-resolution failure:** deny and log a catalog/configuration or authentication failure; do not fail open.
10. **UI result:** hidden or disabled UI never converts a backend deny to allow, and visible UI never guarantees backend allow.

Current implementation caveat: company isolation and permission membership are wired; organization/branch/own and Enhanced Policy attributes are only effective when populated; feature-flag gating and soft-delete checks are not currently enforced. RC5 milestones must not claim those controls before their acceptance evidence exists.

---

## 3. Role and permission seed strategy

### 3.1 Role classes

| Class | Mutability | Rules |
|---|---|---|
| System roles | Immutable identity (`code`, system ownership); mappings evolve only through catalog releases | Tenants may assign but cannot rename, delete, or change reserved semantics |
| Tenant-defined custom roles | Tenant-owned and company-scoped | May combine only catalog permissions available to that tenant; cannot inherit from or grant global/platform roles unless explicitly allowed |
| Public state | Not a role assignment | `guest` is unauthenticated state and is never seeded as a `UserRoleRecord` |

System role immutability does not mean permission mappings never change. It means changes are versioned, reviewable, idempotent, and cannot silently alter the role’s security purpose.

### 3.2 Versioned, migration-safe seeds

1. Store a monotonic catalog version such as `rc5.permissions.v1`.
2. Seed by stable code using idempotent upsert semantics; never depend on generated IDs.
3. Apply permission definitions before role definitions, role hierarchy before role-permission links, and assignments last.
4. Record seed version, checksum, execution time, actor/build, inserted/updated/deprecated counts, and failures.
5. Validate uniqueness, allowed grammar, approved verbs, parent acyclicity, scope compatibility, and complete legacy mappings before mutation.
6. Snapshot role mappings and user assignments before each catalog update.
7. Never delete tenant custom roles or assignments as a side effect of a system catalog seed.
8. A failed seed leaves the previous version authoritative and must be safely rerunnable.

### 3.3 Permission lifecycle

| Change | Required treatment |
|---|---|
| Add | Add canonical record, constants, role mappings, tests, release notes; default unassigned unless explicitly approved |
| Deprecate | Mark deprecated with replacement and sunset version; keep resolvable during compatibility window |
| Rename | Create new canonical code; map old key/code to new code; dual-resolve; migrate role links; verify telemetry; then deprecate old |
| Remove | Prove no handler, role, custom role, or assignment uses it; publish impact; remove links first; retain tombstone/audit metadata |
| Split | Add new permissions default-denied; do not grant them automatically unless the old permission’s semantics and security review justify it |
| Merge | Map old codes to the least-privilege replacement; do not broaden grants silently |

Catalog updates are forward-only. Rollback restores the prior catalog snapshot and mappings; it does not reuse deleted identifiers for different meaning.

---

## 4. Super Admin semantics

`super_admin` is a global break-glass system role, not an “ignore all controls” switch.

| Control | May bypass? | Frozen rule |
|---|---|---|
| Tenant isolation | Only for explicit platform control-plane resources | No implicit access to tenant business records |
| Company isolation | **No** for ordinary company resources | Current Policy runs company isolation before scope; Super Admin does not skip company mismatch |
| Permission membership | **No** | Current Policy checks the exact permission before scope; Super Admin must hold the canonical permission or mapped legacy capability |
| Policy evaluation | **No** | Every request still enters the Policy Engine; Policy decides whether the documented bypass applies |
| Workflow approval | **No** | Cannot self-approve or skip maker-checker/workflow gates; caller-supplied approval flags are not a Super Admin privilege |
| Audit logging | **No** | Allows, denies, role changes, impersonation attempts, and break-glass use are always logged |
| Soft deletes | **No** | May invoke an authorized restore/delete capability; cannot make soft-deleted records disappear from audit/history |
| Record ownership / org / branch scope | **Yes, after permission and company checks pass** | This is the only current `super_admin` shortcut (`#scopeAllows`); it is not a universal break-glass |
| Feature flags | **No** | Feature-flag gating is not currently enforced; when wired, a disabled feature remains disabled |
| Field restrictions | Only when an explicit sensitive-field permission is covered by the Policy decision | No unconditional secret/KYC/credential disclosure |

Super Admin assignment requires MFA, time-bounded break-glass procedure where operationally possible, independent review, and an immutable audit event. Company Admin and Company Owner cannot grant it. Seed/system role protection must prevent arbitrary company-defined roles from reusing the reserved `super_admin` code to obtain the scope shortcut.

---

## 5. Authorization audit logging

### 5.1 Minimum decision record

Every recorded decision contains:

- user/principal id;
- tenant id when a future explicit tenant exists; until then, the company id used as tenant boundary;
- company id;
- organization and branch ids when applicable;
- resource type and resource id when available;
- canonical action and canonical permission code;
- legacy executable action key when mapping was used;
- Policy/engine name and policy/rule version;
- decision (`allow` or `deny`);
- stable reason code plus safe diagnostic detail;
- role assignment ids/scopes that contributed, without sensitive payloads;
- UTC timestamp;
- correlation/trace id;
- request/command/query type and channel;
- catalog version.

Logs must not contain access tokens, refresh tokens, passwords, secrets, full KYC documents, or unrestricted request bodies.

### 5.2 Events that are always logged

Always log:

1. every authorization allow and deny;
2. every Super Admin/break-glass evaluation;
3. role/permission definition, mapping, assignment, revocation, expiry, and seed changes;
4. sensitive field reads/exports and restricted field update attempts;
5. cross-tenant/company/org/branch/owner access attempts;
6. approval, delegation, escalation, and privileged lifecycle decisions;
7. unknown permission codes, unknown legacy mappings, malformed/missing required resources, and Policy evaluation failures.

Decision records are not sampled away. Metrics and traces may be sampled independently but do not replace the audit record. **RC5.9 (ADR D48):** both allows (`policy.allow`) and denies (`policy.deny`) are recorded through the existing `SecurityAuditService` with engine name/version, catalog version, scope-binding mode, contributing role scopes, and correlation id. Audit write failure propagates (fail closed for the evaluate path). Operational counters (`authz.policy.*`) are additive signals only.

### 5.3 Stable reason codes — [RC5.9 delivered — ADR D48]

Frozen catalog artifact: `packages/identity/src/policy/reason-codes.ts`.

| Source | Codes |
|---|---|
| `RbacPolicyEngine` | `permission_missing`, `company_isolation`, `scope_mismatch` |
| `EnhancedPolicyEngine` | `approval_pending`, `attribute_mismatch` |
| Application helpers | `unauthenticated`, `principal_missing`, `policy_evaluation_failed`, `field_read_denied`, `field_update_denied` |

Changing a listed code is a breaking observability change and requires an ADR. Troubleshoot denials with the request `correlationId` plus `details.reasonCode` on the matching `policy.deny` / `field.*` audit record.

---

## 6. Performance expectations

These are engineering goals, not permission shortcuts:

| Concern | Goal |
|---|---|
| Policy overhead | p95 ≤ 10 ms and p99 ≤ 25 ms per in-process evaluation, excluding authentication, aggregate/database load, network, and audit sink latency |
| Request impact | Authorization should remain below 10% of end-to-end latency for ordinary CQRS requests under representative load |
| Frequency | Exactly once before each protected command/query handler, plus post-load re-evaluation only where persisted resource data is required |
| Batching | List/summary/export operations authorize the operation once and enforce tenant/scope in the authoritative query; never perform unbounded per-row remote authorization. **RC5.7 (ADR D46):** scope is enforced over the bounded, company-scoped repository page via in-process Policy Engine row evaluation (`filterAuthorizedRecords`); this is not remote per-row authorization and SQL scope predicates were rejected as a second authorization authority |
| Role resolution | Resolve active assignments and inherited permissions deterministically; avoid repeated lookups within one request |
| Caching | No new caching framework. Existing request-local memoization may reuse immutable principal/catalog data only within the request |
| Cross-request cache | Optional only through already-approved infrastructure; keys must include principal, company/scope, catalog version, and assignment version; revocation/expiry must not be bypassed |
| Scale | Evaluation cost should grow with applicable role depth and permission count, not total tenants or total records |

Never cache final resource/record decisions across unrelated resources. A cache miss, stale version, invalidation uncertainty, or unavailable dependency fails closed. Performance tests report latency percentiles, evaluation count, role depth, permission count, and deny/allow mix without introducing a new cache service.

---

## 7. Catalog statistics and freeze

| Metric | Frozen baseline |
|---|---:|
| Registered CQRS contracts | 107 |
| Unique current legacy executable action keys | 105 |
| Canonical backend permission mappings required in RC5.1 | 105 |
| Unmapped legacy action keys allowed at RC5.1 exit | 0 |
| Seeded permission records before RC5.1 | 0 |
| Named role/state rows in `03-Role-Catalog.md` | 37 |
| Initial immutable system role records | 33 |
| Public state excluded from role seeds | 1 (`guest`) |
| Alias excluded from role seeds | 1 (`vendor` → `supplier`) |
| Deferred RC8 role decisions excluded from RC5.1 seed | 2 (`manufacturer_partner`, `consultant`) |

The 33-role initial seed comprises 9 governance roles, 10 executive/management roles, 8 professional/partner roles, and 6 operational roles. Tenant custom roles are unbounded and are not part of the system-role count.

The 105 canonical backend permissions are the RC5.1 minimum executable catalog. Canonical route/dashboard/field permissions documented for later milestones may be defined as inactive catalog entries in RC5.1, but they must not be consumed or presented as enforced before their owning milestone.

This document and `01`–`12` form the frozen RC5 implementation baseline. Any semantic change requires documentation review, catalog versioning, security approval, and updated tests.
