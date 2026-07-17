# ADR D45 — Record-Level Authorization via Load-Before-Authorize

**Status:** Accepted (2026-07-17)
**Milestone:** RC5.5 — Record-Level Authorization
**Prerequisite mandated by:** `docs/rc5/06-Record-Level-Security.md` §7.2 ("Requires an ADR before treating own-scope as enforceable")

---

## Context

Until RC5.4, handler `authorize()` built the `PolicyResource` exclusively from the
command/query payload. Payload fields are caller-controlled, so `ownerUserId`,
`organizationId`, and `branchId` could be spoofed on record-targeting operations
(update/lifecycle commands and get-by-id queries), which made own/organization/branch
scope enforcement unsound. The frozen RC5 documentation assigns the fix to RC5.5:
"Add post-load re-authorization for updates using persisted company/owner"
(06 §7.2) and "load-before-authorize patterns" (09, RC5.5 scope row).

Constraints in force:

- The Policy Engine (`RbacPolicyEngine`) remains the sole runtime authorization
  authority (Architecture Law, D35, D43). No parallel allow/deny logic may exist.
- The Policy Engine algorithm, the permission catalog, and the role catalog must
  not change in RC5.5.
- Missing resource data must deny — never downgrade to company-wide access
  (`13-Authorization-Governance-Specification.md` §Default-deny rule 8).
- Cross-company probes must not leak record existence (06 §4/§5 — "Deny / not found",
  prefer not-found for cross-company).

## Decision

1. **Load before authorize.** For every record-targeting operation (update and
   lifecycle commands, get-by-id queries) whose persisted aggregate carries
   authorization-relevant fields, the handler's `authorize()` becomes async and
   loads the persisted record through the *same company-scoped repository method*
   that `handle()` uses (`findById({ companyId, id })`). The `PolicyResource`
   is then populated from **persisted** data — `ownerUserId`, `organizationId`,
   `branchId`, and documented `attributes` — never from caller-claimed payload
   fields. The Policy Engine stays the only component that decides.

2. **Fail-closed on unresolved context.** A shared per-package helper
   (`loadRecordForAuthorization`) wraps the repository call. If the repository
   returns a failure, the helper throws the `PlatformError`; the outermost
   `ExceptionMappingBehavior` maps it to a failed result. Authorization therefore
   never proceeds on a permissive default when required context cannot be resolved.

3. **Missing record semantics.** Repositories are keyed by
   `{ companyId, id }` (physical key `type:companyId:id` in SQL), so a foreign
   record can never be loaded under the caller's company. When the load returns
   `null`, scope fields stay `null`:
   - own/organization/branch-scoped principals are denied (`scope_mismatch`) —
     missing data denies;
   - company-scoped principals pass Policy and `handle()` returns its existing
     not-found error — identical to a genuinely nonexistent id, so cross-company
     probes cannot distinguish "exists elsewhere" from "does not exist".
   - a caller that claims a foreign `companyId` outright is still denied earlier
     by the engine's company-isolation check.

4. **Own-scope is enforceable from RC5.5 onward** for the record-targeting
   operations listed in `docs/release/RC5.5-record-authorization.md`, because the
   owner value evaluated is the persisted one. Create-type commands continue to
   use payload-derived values (RC5.4 behavior); the record does not exist yet.

5. **Attribute glossary.** Attribute keys used on `PolicyResource.attributes`
   are documented in `docs/release/RC5.5-record-authorization.md` (per 06 §7.4).
   Attributes are contextual metadata for audit/Enhanced-Policy; the current
   engine does not evaluate them.

## Explicitly deferred (not RC5.5)

- **Permission-to-scope binding** (13 §Default-deny rules 4–5, "RC5.5+"): binding a
  permission to the scope of the assignment that contributed it requires a Policy
  Engine algorithm change, which is out of RC5.5's freeze ("existing Policy Engine
  only"). The union risk remains documented until that engine change is approved.
- **Dual-branch validation on stock transfers** (06 §3): `PolicyResource` carries a
  single `branchId` (populated from the source warehouse); the destination branch is
  exposed as `attributes.toBranchId` only. Enforcing both requires engine capability.
- **List queries** (RC7) and workflow/approval ownership (RC6).

## Consequences

- Record-targeting requests perform one extra repository read during
  authorization (the same read `handle()` performs). Acceptable at current scale;
  revisit with caching or context handoff if profiling ever shows a hotspot.
- `authorize()` implementations now depend on handler repositories; they remain
  data collection only — every decision still flows through `PolicyEngine.evaluate`.
- Tests: cross-company, owner allow/deny, organization/branch isolation, missing
  resource, and fail-closed coverage live in
  `packages/api/src/authorization/record-authorization.test.ts`.
