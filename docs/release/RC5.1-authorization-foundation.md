# RC5.1 — Enterprise Authorization Foundation (Implementation Report)

**Date:** 2026-07-17
**Milestone:** RC5.1 — Authorization foundation (catalog, seeds, mappings, tests only)
**Baseline:** Frozen RC5 documentation `docs/rc5/01`–`13`
**Runtime behavior change:** None. No route, UI, API, handler, Policy Engine, or enforcement change. The Policy Engine remains the sole runtime authorizer.

---

## 1. Summary

RC5.1 implements the authorization foundation defined by
`docs/rc5/13-Authorization-Governance-Specification.md` as pure definition
data plus an idempotent seed mechanism inside the existing `@afh/identity`
package:

1. **Canonical permission catalog** — 105 canonical `<module>.<resource>.<action>`
   backend permissions, one per current executable capability.
2. **Legacy action key mapping** — an explicit, versioned map covering all
   105 unique legacy executable action keys used by the 107 registered CQRS
   handlers (the sales and procurement summary queries reuse `order.read`
   and `po.read`). 0 unmapped keys remain.
3. **Immutable system role catalog** — 33 system roles
   (9 governance, 10 executive/management, 8 professional/partner,
   6 operational) with single-parent hierarchy
   (`company_owner` → `admin`, `moderator` → `editor`). `guest`, `vendor`,
   `viewer`, `manufacturer_partner`, and `consultant` are excluded per the
   frozen decisions.
4. **Idempotent, versioned seed** — validates before mutation (fail closed),
   upserts by stable code, seeds canonical records plus legacy compatibility
   records, links role permissions (canonical + matching legacy key so the
   Policy Engine's exact `permissionCodes.includes(action)` check keeps
   working for current handlers), never touches users/assignments/tenant
   custom roles, and records a `rbac.catalog_seeded` audit event with
   version, checksum, and counts.
5. **Definition validation** — canonical grammar, approved verb vocabulary,
   reserved/forbidden module prefixes, wildcard prohibition, uniqueness,
   mapping completeness, parent acyclicity, and grant integrity.
6. **44 unit tests** covering permission catalog, role catalog, legacy
   mapping coverage, seed idempotency, permission naming validation, and
   catalog completeness.

No user is assigned any role by this milestone. Seeding a live environment
is a separately approved operational step per `docs/rc5/11-Migration-Plan.md`.

## 2. Catalog identity

| Item | Value |
|---|---|
| Catalog version | `rc5.rbac-catalog.v1` |
| Catalog checksum (SHA-256) | `b127b5ce68046b2f793d6a3bd67e81faf9f8e8f4e8b9d6345ecd0befb76a67fc` |
| Canonical backend permissions | 105 |
| Legacy executable action keys mapped | 105 (0 unmapped) |
| Legacy compatibility permission records | 93 (12 legacy keys already equal their canonical code) |
| Total permission records seeded | 198 |
| System roles seeded | 33 |
| User role assignments created | 0 |

## 3. Files changed

New (all in `packages/identity/src/rbac/catalog/`):

| File | Purpose |
|---|---|
| `permission-catalog.ts` | 105 canonical permission definitions, `RBAC_CATALOG_VERSION`, `LEGACY_ACTION_MAP`, `resolveLegacyActionKey` |
| `role-catalog.ts` | 33 immutable system role definitions with hierarchy and deterministic permission packs |
| `validation.ts` | Canonical grammar / verb / prefix / wildcard / integrity validation |
| `seed.ts` | `seedRbacCatalog` (idempotent, versioned, audited), `computeCatalogChecksum` |
| `index.ts` | Catalog module exports |
| `permission-catalog.test.ts` | Catalog completeness + legacy mapping coverage (13 tests) |
| `role-catalog.test.ts` | Role catalog integrity (11 tests) |
| `validation.test.ts` | Permission naming validation (11 tests) |
| `seed.test.ts` | Seed idempotency, compatibility grants, hierarchy, audit (9 tests) |

Modified:

| File | Change |
|---|---|
| `packages/identity/src/rbac/index.ts` | Re-export the catalog module |
| `packages/identity/package.json` | Add `test` script (Node built-in test runner over compiled output) |
| `docs/rc5/09-Implementation-Plan.md` | RC5.1 implementation evidence pointer |

## 4. Role grant policy (deterministic, documented)

| Role(s) | Grants |
|---|---|
| `super_admin`, `admin` (+ `company_owner` via inheritance) | All 105 canonical permissions (+ legacy compatibility) |
| `executive`, `auditor`, `read_only` | All 41 `.read` permissions |
| `finance_manager` | `finance` pack (14) |
| `warehouse_manager` | `inventory` pack (17) |
| `procurement_manager` | `procurement` pack (10) + inventory reads |
| `sales_manager`, `sales_representative` | `sales` (9) + `crm` (19) packs (own-scope binding is RC5.5) |
| `service_manager` | `service` pack (16) |
| `customer_support` | service + crm read packs |
| `platform_admin`, `moderator`, `editor`, `approver`, `hr_manager`, `manufacturing_manager` | No backend grants (their CQRS surfaces do not exist yet — RC6/RC7+) |
| All partner and operational roles | No backend grants in RC5.1 (deferred to record scoping RC5.5 / portals RC8, per least-privilege principle) |

## 5. Verification

| Gate | Result |
|---|---|
| Typecheck (all 34 workspaces) | PASS |
| Build (all 34 workspaces) | PASS |
| Lint (all 34 workspaces, `--max-warnings 0`) | PASS |
| New authorization foundation tests (`npm run test -w @afh/identity`) | PASS — 44/44 |
| Existing runtime-host verify/harden/accept suites (`npm run test -w @afh/runtime-host`) | PASS |
| Seed idempotency | Proven by test: second run creates 0 permissions, 0 roles, 0 links |
| Legacy mapping coverage | Proven by test: 107 handler action references resolve; 105 unique keys map exactly once; 0 unmapped |

Test command: `npm run test -w @afh/identity`
(Node built-in `node:test` runner over `packages/identity/dist/rbac/catalog/*.test.js`.)

## 6. Scope compliance

- No routes protected or changed; no navigation/menu/UI change.
- No dashboard, module, record-level, field-level, workflow, or approval
  authorization implemented.
- No CQRS handler, action key, Policy Engine, runtime, Identity architecture,
  or database schema change. Seeding uses only the existing `IdentityStore`
  port (`savePermission`, `saveRole`, `saveRolePermission`) and
  `SecurityAuditService`.
- No new API, route, framework, or authorization mechanism. The legacy
  mapping is data plus a lookup function; there is no alias matcher or
  second authorizer.
- No user role assignments were created.

## 7. Operational note

`seedRbacCatalog({ store, audit?, actorUserId? })` is exported from
`@afh/identity`. Executing it against a live environment (SQL identity
store) is the separately approved migration step 2 in
`docs/rc5/11-Migration-Plan.md` and requires the RC5.1 checkpoint evidence
(snapshot, approver) from that plan. Rollback: restore the pre-seed
catalog/role-link snapshot; tenant custom roles are never mutated by the seed.

## 8. Stop condition

RC5.1 stops here. RC5.2 (route authorization declarations) is not started.
