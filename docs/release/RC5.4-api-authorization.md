# RC5.4 — API Authorization & Handler Normalization Completion

**Date:** 2026-07-17  
**Milestone:** RC5.4 — API authorization (remaining items after RC5.3 action taxonomy)  
**Frozen sources:** `docs/rc5/05-API-Authorization-Matrix.md`, `docs/rc5/09-Implementation-Plan.md`, `docs/rc5/11-Migration-Plan.md`

---

## 1. What RC5.4 delivers

RC5.3 already normalized all 107 CQRS handler actions to canonical catalog
codes. RC5.4 completes the remaining API authorization items:

1. **`PolicyResource` population from payloads.** The shared
   `companyResource(...)` helpers in all seven `*-application` packages now
   accept optional `ownerUserId`, `organizationId`, `branchId`, and
   `attributes`. Create/update-style handlers that already carry those fields
   on the command/query payload populate them into `AuthorizationSpec.resource`
   before Policy evaluation. This does **not** implement load-before-authorize
   or persisted-record own/assigned enforcement (RC5.5).
2. **Upload Policy enforcement.** `POST /api/v1/uploads` now evaluates
   `dam.assets.upload` through the existing Policy Engine after authentication
   and company match. The resource carries `ownerUserId` (uploader) and
   company, matching the frozen matrix.
3. **`dam.assets.upload` catalog entry (v3).** Catalog version bumped to
   `rc5.rbac-catalog.v3`. The permission lives in `API_PERMISSION_DEFINITIONS`
   (outside the 105 CQRS `PERMISSION_CATALOG` / `LEGACY_ACTION_MAP`) and is
   granted to `super_admin`, `admin`, and `editor`.
4. **OpenAPI production exposure policy.** `exposeOpenApi` is a typed runtime
   config / API host option (`AFH_EXPOSE_OPENAPI`). Development/testing default
   `true`; staging/production default `false`. When false, the OpenAPI route
   is not registered (no new endpoint invented).

## 2. What did not change

- Policy Engine algorithm (`RbacPolicyEngine.evaluate`, `#scopeAllows`).
- Authentication / session format / permission projection contract beyond the
  natural effect of seeding one new canonical code.
- Frontend routing, menus, dashboards, navigation.
- Field-level authorization (RC5.5/RC5.6).
- Record-level enforcement that requires loading persisted ownership
  (explicitly RC5.5).
- New HTTP endpoints.

## 3. Files changed (summary)

| Area | Files |
|---|---|
| Catalog v3 | `packages/identity/src/rbac/catalog/permission-catalog.ts`, `seed.ts`, `role-catalog.ts`, `index.ts`, related tests |
| PolicyResource helpers | `packages/*-application/src/support/support.ts` (7 packages) |
| Handler authorize() | Selected handlers across sales/procurement/inventory/finance/projects/service/crm |
| Upload + OpenAPI | `packages/api/src/routes/routes.ts`, `packages/api/src/host/api-host.ts` |
| Runtime config | `packages/runtime-host/src/config/runtime-config.ts`, `host/create-production-host.ts` |
| Tests | `packages/api/src/authorization/api-authorization.test.ts` (+ identity catalog/seed/validation updates) |
| Docs | this report, audit, `05`, `09` |

## 4. Tests added / extended

`packages/api/src/authorization/api-authorization.test.ts`:

- PolicyResource population (sales opportunity, inventory warehouse, projects,
  CRM lead).
- Upload allow for `admin` / `editor`; deny for `sales_manager`
  (`permission_missing`); company mismatch still fails first.
- OpenAPI route present when `exposeOpenApi: true`, absent when `false`.

Identity catalog/seed tests cover v3, `dam.assets.upload` seeding, and grants.

## 5. Verification results (2026-07-17)

| Check | Result |
|---|---|
| Full workspace build | PASS |
| Full workspace typecheck | PASS |
| Full workspace lint (`--max-warnings 0`) | PASS |
| Identity tests | PASS (56) |
| API tests | PASS (30) |
| Web tests | PASS (43) |
| Runtime verify / harden / accept | PASS |

## 6. Suggested commit message

```text
feat(rc5.4): complete API authorization PolicyResource, upload, and OpenAPI lockdown
```

## 7. Stop condition

RC5.4 is complete. Do **not** start RC5.5. Do **not** commit until review
approval.
