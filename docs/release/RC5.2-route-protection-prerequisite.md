# RC5.2 — Route Protection Prerequisite Implementation Report

**Date:** 2026-07-17  
**Scope:** Minimum catalog and authenticated-session infrastructure required before RC5.2  
**Status:** Complete; RC5.2 route enforcement has not started

## Summary

This prerequisite resolves the two RC5.2 entry blockers identified by the
post-RC5.1 audit:

1. The RC5.1 executable catalog did not contain the canonical permissions
   referenced by the frozen route matrix.
2. The existing authenticated session response did not expose the user's
   effective RBAC permissions.

The implementation adds inactive, versioned route permission definitions and
declarative route metadata, updates the idempotent RBAC seed and system-role
mappings, and extends the existing `GET /api/v1/auth/session` response with
canonical effective permission codes.

No route, menu, navigation, dashboard, CQRS, Policy Engine, or authorization
decision behavior changed.

## Catalog changes

| Item | Result |
|---|---|
| RBAC catalog version | `rc5.rbac-catalog.v2` |
| Route permission catalog version | `rc5.route-permissions.v1` |
| Existing executable canonical permissions | 105 (unchanged) |
| New inactive route permissions | 30 |
| Total canonical permissions | 135 |
| Legacy executable mappings | 105 (unchanged; 0 unmapped) |
| Route access metadata definitions | 35 |
| Permission-bearing route definitions | 30 |
| Authentication-only route definitions | 5 |
| Seed checksum | `f68d0f21f8c6e5384ae51f80f1038613178ec7911feb24f376a8942ad0fd148a` |

The route catalog covers the currently session-protected surfaces declared in
`packages/web/src/App.tsx`:

- `/app` and all explicit application module mounts;
- analytics builder, AI usage, and platform deployment child requirements;
- `/portal`;
- `/admin/platform`;
- the five documented authentication-only application routes.

Specific child metadata precedes broad prefixes so later RC5.2 matching can
apply the stricter requirements deterministically:

- `/app/analytics/builder` requires analytics read + configure;
- `/app/ai/usage` requires AI use + usage read;
- `/app/platform/deployment` requires platform operations + health read.

## Effective permission projection

The existing `GET /api/v1/auth/session` response now includes:

```json
{
  "permissionCodes": ["canonical.permission.code"]
}
```

The projection:

- reuses `RbacPolicyEngine.buildPrincipal()` for active assignment,
  inheritance, expiry, and permission resolution;
- returns canonical catalog codes only;
- excludes legacy compatibility keys such as `order.read`;
- is sorted for stable transport output;
- returns an empty list for an active user with no assignments;
- performs no Policy evaluation and makes no allow/deny decision.

The existing web API client response type was extended to describe the new
field. Session state, route guards, menus, and navigation do not consume it in
this prerequisite.

## Seed and role mapping

The existing versioned seed now validates and seeds the 30 inactive route
permissions in addition to the unchanged RC5.1 executable permissions and
legacy compatibility records.

Seed evidence from an empty in-memory store:

| Record class | Created |
|---|---:|
| Executable canonical permissions | 105 |
| Inactive route permissions | 30 |
| Legacy compatibility permissions | 93 |
| Total permission records | 228 |
| System roles | 33 |
| Role-permission links | 992 |
| User assignments | 0 |

System role mappings follow the frozen route and role matrices. Examples:

- `super_admin` receives every canonical permission;
- `admin` receives company application routes, but not customer portal or
  platform administration;
- `platform_admin` receives platform operations, health, administration, and
  integration routes;
- executive and manager roles receive their documented dashboard/reporting
  routes;
- `customer` and `corporate_buyer` receive the portal route permission;
- scoped partner/operational roles receive route presentation permissions
  only, not new backend capabilities.

The seed remains idempotent and does not assign users or mutate tenant custom
roles.

## Files changed

- `packages/identity/src/rbac/catalog/route-permission-catalog.ts`
- `packages/identity/src/rbac/catalog/route-permission-catalog.test.ts`
- `packages/identity/src/rbac/catalog/permission-catalog.ts`
- `packages/identity/src/rbac/catalog/role-catalog.ts`
- `packages/identity/src/rbac/catalog/validation.ts`
- `packages/identity/src/rbac/catalog/seed.ts`
- related RC5.1 catalog tests and exports
- `packages/identity/package.json`
- `packages/api/src/routes/auth-routes.ts`
- `packages/api/src/routes/auth-routes.test.ts`
- `packages/api/package.json`
- `packages/web/src/api/client.ts`

## Tests

Focused tests cover:

- route catalog version and canonical naming;
- route metadata uniqueness and catalog completeness;
- all 30 permission-bearing surfaces and 5 authentication-only surfaces;
- stricter child-route requirements;
- route permissions in seed idempotency and validation;
- system-role route mappings without backend capability widening;
- empty effective permissions for unassigned users;
- effective canonical permissions for assigned and inherited roles;
- exclusion of legacy compatibility keys from the session response;
- transport evidence that `GET /api/v1/auth/session` returns
  `permissionCodes`.

Results:

- `@afh/identity`: 54/54 tests pass.
- `@afh/api`: 4/4 tests pass.
- existing runtime-host verify/harden/accept suites: pass.
- full workspace build: pass.
- full workspace typecheck: pass.
- full workspace lint (`--max-warnings 0`): pass.

## Scope compliance

Confirmed absent from this prerequisite:

- route protection or direct-URL denial;
- permission-aware menu/navigation filtering;
- dashboard visibility changes;
- session context consumption of permission codes;
- Policy Engine decision or scope changes;
- CQRS handler/action changes;
- record-level or field-level security;
- workflow or approval authorization changes;
- new API routes, API families, middleware, services, frameworks, token
  claims, or token formats.

## Acceptance and next step

The prerequisite is complete: full workspace build, typecheck, lint, and all
relevant tests are green. RC5.2 must begin as a separate change and consume
this metadata and session field without moving authorization authority out of
the backend Policy Engine.
