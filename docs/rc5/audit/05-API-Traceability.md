# RC5 API Traceability Audit

## 1. Complete HTTP route matrix

| Method / route | Handler file | Auth | Policy authorization | Company / record scope | RC5 comparison |
|---|---|---|---|---|---|
| GET `/health/live` | `routes/routes.ts` | No | None | N/A | Matches |
| GET `/health/ready` | `routes/routes.ts` | No | None | N/A | Matches |
| GET `/health/startup` | `routes/routes.ts` | No | None | N/A | Matches |
| GET `/health/version` | `routes/routes.ts` | No | None | N/A | Matches |
| POST `/api/v1/auth/register` | `routes/auth-routes.ts` | No | Credential/validation only | Company optional from registration flow | Matches public gate |
| POST `/api/v1/auth/sign-in` | `routes/auth-routes.ts` | No | Password/MFA/session service | User company returned | Matches |
| POST `/api/v1/auth/refresh` | `routes/auth-routes.ts` | Refresh credential | Session service, not RBAC Policy | Own token family | Matches |
| POST `/api/v1/auth/sign-out` | `routes/auth-routes.ts` | Yes | Own session operation, no RBAC Policy | Own session ID | Matches |
| GET `/api/v1/auth/session` | `routes/auth-routes.ts` | Yes | Own session operation, no RBAC Policy | Own session/user | Matches; response lacks roles/permissions |
| POST `/api/v1/auth/password-reset/request` | `routes/auth-routes.ts` | No | Reset service/token flow | User lookup internally | Matches |
| POST `/api/v1/auth/password-reset/confirm` | `routes/auth-routes.ts` | No | Reset token gate | Token subject | Matches |
| POST `/api/v1/auth/email-verification/request` | `routes/auth-routes.ts` | Yes | Own identity operation | Session user | Matches |
| POST `/api/v1/auth/email-verification/confirm` | `routes/auth-routes.ts` | No | Verification token gate | Token subject | Matches |
| POST `/api/v1/auth/mfa/enable` | `routes/auth-routes.ts` | Yes | Own identity operation | Session user | Matches; no step-up/admin policy |
| POST `/api/v1/commands` | `routes/routes.ts` | Yes | Dispatcher calls handler `authorize()` then Policy | Session/header/payload company checked; resource fields handler-defined | Matches at company level; record scope incomplete |
| POST `/api/v1/queries` | `routes/routes.ts` | Yes | Dispatcher calls handler `authorize()` then Policy | Same | Matches at company level; record scope incomplete |
| POST `/api/v1/uploads` | `routes/routes.ts` | Yes | **No Policy call** | Explicit session/header/body company match; no uploader ownership decision | **Gap:** canonical target `dam.assets.upload` is not consumed |
| GET `/api/v1/openapi.json` | `routes/routes.ts` | No | None | N/A | Matches current public state; production lock-down is not implemented |

## 2. Transport controls

| Control | Actual state | Evidence / limitation |
|---|---|---|
| Authentication | Bearer/session validation through `authenticateRequest` | Required routes reject unauthenticated calls |
| Rate limiting | `prepareRouteRequest` evaluates the configured hook; auth routes also explicitly gate | In-memory implementation; deployment-wide distribution is outside RC5 |
| Company header binding | Implemented | Header cannot override authenticated company |
| Command/query company | Payload and application context are compared | Company scope is real |
| Record ownership | Handler `PolicyResource` fields | Current helpers set owner/org/branch to `null` |
| Security headers/body limits | Implemented in Node HTTP transport | Transport hardening, not RBAC |
| OpenAPI exposure | Public | RC5 “consider lock-down” is future/config work |

## 3. CQRS transport behavior

Commands and queries are not separate HTTP endpoints. The body selects a registered `commandType` or `queryType`; the dispatcher pipeline performs Policy evaluation before handler execution.

The authorization chain is therefore:

`HTTP authentication → company binding → dispatch → handler AuthorizationSpec → EnhancedPolicyEngine → RbacPolicyEngine`.

`EnhancedPolicyEngine` is instantiated with empty enrichers and required-attribute predicates unless callers provide options; production composition does not establish record/field ABAC merely by wrapping the engine.

## 4. Mismatches against `docs/rc5/05-API-Authorization-Matrix.md`

| Documentation statement | Audit result | Required documentation treatment |
|---|---|---|
| Upload requires `dam.assets.upload` | False today | Mark as RC5.4 gap; current route authenticates and checks company only |
| Record fields are available for own/org/branch enforcement | Type support exists, but all seven application `companyResource` helpers populate them as `null` | Mark current scope company-only |
| Preferred action examples are namespaced | Only finance/inventory are consistently namespaced; sales/procurement/CRM/projects/service contain unprefixed codes | Separate current action catalog from proposed canonical taxonomy |
| OpenAPI can be locked down in production | No current auth/config gate on this route | Keep as future ops decision |
| No new RC5 endpoints | Accurate | Preserve |

## 5. API blockers and prerequisites

- Upload Policy is the only registered authenticated business route that bypasses the Policy engine.
- The session response exposes user/session fields but no effective roles, scope assignments, permissions, or authorization revision; frontend permission guards cannot be authoritative without an existing-response extension or another approved mechanism.
- Current permission action strings must be seeded before normalization. Seeding only the proposed namespaced strings would leave existing handlers denied.
- Record scope cannot be claimed from route authentication alone; handler resources need actual owner/org/branch data.

## 6. Verdict

**Route traceability:** 18/18 matched.  
**Authenticated route coverage:** implemented as documented.  
**Policy coverage:** commands/queries yes; upload no; identity self-service intentionally uses identity/session gates.  
**Record-level coverage:** company only in the current application handlers.
