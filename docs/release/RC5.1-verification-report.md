# RC5.1 — Post-Implementation Verification Report

**Date:** 2026-07-17
**Type:** Independent verification audit (documentation and audit only; no code changes)
**Subject commit:** `ed38bde167515450111d809d8a526940d003f89f`
**Baseline:** Frozen RC5 documentation `docs/rc5/01`–`13`
**Method:** Fresh re-run of typecheck/build/lint/tests, independent extraction of handler action keys from compiled application packages, and git-diff scope review of the subject commit.

---

## 1. Verdict

**PASS — no drift detected.** The RC5.1 implementation matches the frozen
specification exactly on every audited dimension. No route protection, menu
authorization, dashboard authorization, record-level security, field-level
security, or runtime enforcement was introduced. The catalog is definition
data plus an idempotent seed function; it is not wired into any runtime or
bootstrap path.

One intentional, spec-permitted design choice is noted in §8 (Observations):
optional inactive route/dashboard/field permission entries were **not** seeded
(governance spec §7 uses "may", not "must"). This is compliant and is flagged
only for RC5.2 awareness.

---

## 2. Scope-of-change verification (git)

`git show --stat HEAD` on the subject commit touches only:

- `docs/rc5/**` (frozen baseline brought under version control) — 27 files
- `docs/release/RC5.1-authorization-foundation.md` (implementation report)
- `packages/identity/src/rbac/catalog/**` (9 new files)
- `packages/identity/src/rbac/index.ts` (+1 line: re-export)
- `packages/identity/package.json` (+ `test` script)

`git diff HEAD~1 HEAD` restricted to `packages/identity/src/policy`,
`packages/identity/src/rbac/rbac-service.ts`,
`packages/identity/src/composition`, `packages/web`, `packages/api`, and
`packages/runtime-host` returns **empty**.

| Prohibited surface | Changed? | Evidence |
|---|---|---|
| Policy Engine (`policy/`) | No | Empty diff |
| RbacService | No | Empty diff |
| Identity composition/bootstrap | No | Empty diff |
| Web routes / navigation / UI (`packages/web`) | No | Not in commit; empty diff |
| API transport (`packages/api`) | No | Not in commit; empty diff |
| Runtime host | No | Not in commit; empty diff |
| CQRS handlers / action keys | No | Not in commit |
| Database schema / migrations | No | Not in commit |

**Conclusion:** The Policy Engine remains the sole runtime authorizer and its
behavior is byte-for-byte unchanged.

## 3. No-premature-wiring verification

Workspace grep for `seedRbacCatalog`, `rbac/catalog`, `PERMISSION_CATALOG`,
`LEGACY_ACTION_MAP`, and `RBAC_CATALOG_VERSION` across `packages/**/*.ts`
returns matches **only inside** `packages/identity/src/rbac/catalog/` itself
(plus the `rbac/index.ts` re-export, which invokes nothing).

- `seedRbacCatalog` is **not** called from any composition root, bootstrap,
  host, or handler. Seeding a live environment remains the separately
  approved operational step per `docs/rc5/11-Migration-Plan.md`.
- No enforcement path consumes the catalog. Definitions are inert.

## 4. Permission catalog verification

| Spec requirement (doc) | Required | Actual | Result |
|---|---|---|---|
| Canonical backend permissions (`13` §7) | 105 | 105 | PASS |
| Unique canonical codes | 105 | 105 | PASS |
| Grammar `<module>.<resource>.<action>` (`13` §1) | all | all pass `validatePermissionCode` | PASS |
| Approved verbs only (`13` §1.2) | required | enforced + tested | PASS |
| No wildcards (`13` §1.4) | required | none in codes or keys | PASS |
| Reserved module prefixes (`13` §1.3) | required | all 7 modules reserved | PASS |
| Catalog version | `rc5.rbac-catalog.v1` | `rc5.rbac-catalog.v1` | PASS |
| Deterministic checksum | stable | `b127b5ce…76a67fc` (SHA-256) | PASS |

## 5. Legacy action key mapping verification (independent)

A Node script imported the compiled `*PolicyActions` constants from all seven
application packages (`{sales,procurement,inventory,finance,crm,projects,
service}-application/dist/constants.js`) and compared them to
`LEGACY_ACTION_MAP`:

```
sales        refs=10  unique=9
procurement  refs=11  unique=10
inventory    refs=17  unique=17
finance      refs=14  unique=14
crm          refs=19  unique=19
projects     refs=20  unique=20
service      refs=16  unique=16
---
total action references : 107
unique legacy keys       : 105
catalog legacy map size  : 105
handler keys not in catalog : []   (0 unmapped)
catalog keys not used by handlers : []   (0 orphan)
```

| Spec requirement (`13` §1.6, §7) | Required | Actual | Result |
|---|---|---|---|
| Registered CQRS action references | 107 | 107 | PASS |
| Unique legacy executable keys | 105 | 105 | PASS |
| Legacy keys mapped | 105 | 105 | PASS |
| Unmapped keys at exit | 0 | 0 | PASS |
| Orphan mappings (unused keys) | 0 | 0 | PASS |
| Reused summary keys stay single (`order.read`, `po.read`) | 1 each | 1 each | PASS |
| Unknown key resolution | fail closed | returns `null` | PASS |

This is an independent source-of-truth check: it reads the actual application
constants, not the test fixture, and confirms the catalog neither misses nor
invents a key.

## 6. Role catalog verification

Seeded role codes were cross-checked against the documented tables in
`03-Role-Catalog.md`:

| Group | Documented rows | Seeded | Exclusions applied | Result |
|---|---|---|---|---|
| Governance | 10 | 9 | `guest` (public state) | PASS |
| Executive/management | 10 | 10 | — | PASS |
| Professional/partner | 11 | 8 | `manufacturer_partner`, `consultant` (RC8), `vendor` (alias of `supplier`) | PASS |
| Operational | 6 | 6 | — | PASS |
| **Total** | **37** | **33** | 4 excluded | PASS |

- Hierarchy edges match the doc: `company_owner` → `admin`,
  `moderator` → `editor`; all other roots. Hierarchy is acyclic (validated
  and tested).
- Every seeded role code matches a documented code verbatim; no invented or
  renamed roles.
- All role grants reference only canonical catalog codes (tested); no
  wildcard grants.

Grant policy is deterministic and least-privilege-aligned:
`super_admin`/`admin` = all 105; read-style roles (`executive`, `auditor`,
`read_only`) = the 41 `.read` permissions; module managers = their module
pack(s); partner/operational roles = no backend grants in RC5.1 (deferred to
record scoping RC5.5 / portals RC8, consistent with `13` §2.2 least-privilege
guidance).

## 7. Seed, validation, and test verification

| Item | Result |
|---|---|
| Validate-before-mutate, fail closed (`13` §3.2.5) | PASS — `validateRbacCatalog` runs first; rejection returns `ValidationError` and audits `rbac.catalog_seeded` failure |
| Upsert by stable code, no generated-id dependency (`13` §3.2.2) | PASS |
| Ordering: permissions → roles (parents first) → links (`13` §3.2.3) | PASS |
| Legacy compatibility records seeded (`13` §1.6) | PASS — 93 compat records (12 legacy keys already equal their canonical code) |
| Roles keep Policy exact-match working for legacy keys | PASS — role links include canonical + differing legacy code |
| Never mutates users / assignments / tenant custom roles (`13` §3.2.7) | PASS — tested (`userRoles.size === 0`) |
| Seed audit event with version, checksum, counts (`13` §3.2.4) | PASS |
| Idempotent rerun creates 0 records (`13` §3.2.8) | PASS — tested |
| Definition validation coverage (`13` §1) | PASS — grammar/verb/prefix/wildcard/uniqueness/acyclicity/grant integrity |

**Test re-run (fresh):** `npm run test -w @afh/identity` → **44 tests, 44 pass,
0 fail, 6 suites.** Covers permission catalog, role catalog, legacy mapping
coverage, seed idempotency, permission naming validation, and catalog
completeness — matching the RC5.1 test scope in `09-Implementation-Plan.md`
and `10-Test-Plan.md`.

**Gate re-run (previous turn, same tree):** typecheck PASS, build PASS, lint
PASS (all 34 workspaces, `--max-warnings 0`); runtime-host
verify/harden/accept PASS.

## 8. Observations (compliant; for RC5.2 awareness)

1. **Route/dashboard/field permissions not seeded.** Governance spec §7 states
   these "**may** be defined as inactive catalog entries in RC5.1." The
   implementation chose the minimal path (105 backend permissions only). This
   is compliant. RC5.2 will therefore introduce route/dashboard permission
   codes fresh; because `03-Role-Catalog.md` §3.6 anticipates `*.dashboard.read`
   for presentation-module UI gating, RC5.2 should add those as new catalog
   entries under a version increment rather than assuming they already exist.
2. **Presentation-module manager roles carry no grants yet.** `hr_manager`,
   `manufacturing_manager`, `editor`, `moderator`, `approver`, and
   `platform_admin` have empty backend grants because their CQRS/approval
   surfaces do not exist (RC6/RC7+). This is correct for RC5.1 and expected to
   remain empty until those milestones.
3. **Test runner is Node built-in over compiled output.** Tests execute from
   `dist/` and require a prior build. This is consistent with the repo (no test
   framework dependency added) and keeps RC5.1 free of new dependencies.

## 9. Drift summary

| Dimension | Drift |
|---|---|
| Permission count / grammar | None |
| Legacy mapping completeness | None (0 unmapped, 0 orphan) |
| Role catalog codes / count / hierarchy | None |
| Seed idempotency / versioning / audit | None |
| Validation rules vs `13` §1 | None |
| Premature enforcement (route/menu/dashboard/record/field/runtime) | None |
| Policy Engine behavior | Unchanged |

**RC5.2 entry recommendation:** clear to proceed. Begin RC5.2 from catalog
version `rc5.rbac-catalog.v1`; introduce route/navigation permission codes as
new versioned catalog entries and keep all allow/deny decisions in the Policy
Engine.
