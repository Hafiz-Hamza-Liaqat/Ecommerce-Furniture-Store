# RC5 — API Authorization Matrix

**HTTP routes:** 18 registered (`createAllRoutes`).  
**CQRS contracts:** 107 (64 commands + 43 queries) via `POST /api/v1/commands` and `POST /api/v1/queries`.  
**Do not** treat CQRS contracts as separate HTTP endpoints.

Reuse: authentication middleware, rate limiting, company header binding, handler `authorize()`, Policy Engine.

---

## 1. HTTP endpoints

| Method | Path | Auth | Required permission / gate | Company scope | Tenant scope | Ownership | Policy notes |
|---|---|---|---|---|---|---|---|
| GET | `/health/live` | No | Public ops | N/A | N/A | N/A | No secrets |
| GET | `/health/ready` | No | Public ops | N/A | N/A | N/A | Dependency only |
| GET | `/health/startup` | No | Public ops | N/A | N/A | N/A | |
| GET | `/health/version` | No | Public ops | N/A | N/A | N/A | Non-sensitive version |
| POST | `/api/v1/auth/register` | No | Public + rate limit | New user | N/A | N/A | No Policy principal yet |
| POST | `/api/v1/auth/sign-in` | No | Public + rate limit | Session company | N/A | N/A | Lockout/MFA |
| POST | `/api/v1/auth/refresh` | No* | Refresh credential | Session company | N/A | Token family | Rotate; reuse detection |
| POST | `/api/v1/auth/sign-out` | Yes | Authenticated | Session | N/A | Own session | Revoke |
| GET | `/api/v1/auth/session` | Yes | Authenticated | Session | N/A | Own | |
| POST | `/api/v1/auth/password-reset/request` | No | Public + rate limit | N/A | N/A | N/A | Enumeration-safe |
| POST | `/api/v1/auth/password-reset/confirm` | No | Token gate | N/A | N/A | Token subject | Invalidate sessions |
| POST | `/api/v1/auth/email-verification/request` | Yes | Authenticated | Session | N/A | Own | |
| POST | `/api/v1/auth/email-verification/confirm` | No | Token gate | N/A | N/A | Token subject | |
| POST | `/api/v1/auth/mfa/enable` | Yes | Authenticated (+ admin MFA policy) | Session | N/A | Own | Step-up later |
| POST | `/api/v1/commands` | Yes | **Per commandType** via handler authorize | ✔ match header/session | company | Per payload resource | Fail-closed Policy |
| POST | `/api/v1/queries` | Yes | **Per queryType** via handler authorize | ✔ | company | Per payload resource | Fail-closed Policy |
| POST | `/api/v1/uploads` | Yes | **Current:** authenticated + company match only. **Required (RC5.4):** `dam.assets.upload` | ✔ match | company | Current: company only. Required: uploader + company | MIME allowlist RC4; **no Policy call today** |
| GET | `/api/v1/openapi.json` | No | Public or lock down in prod | N/A | N/A | N/A | Consider auth in prod deploy (ops decision; no new API invent) |

\*Refresh uses refresh token, not session bearer.

### Transport-enforced (already)

| Control | Status |
|---|---|
| Rate limit | Implemented (in-memory; edge hardening is deploy concern) |
| Company header mismatch | Implemented RC4 |
| Body size / security headers | Implemented RC4 |

---

## 2. CQRS authorization pattern (all 107)

Every registered handler must continue to provide:

```text
authorize(command|query, ctx) → { action, resource: PolicyResource }
```

### Required PolicyResource population

| Field | Rule |
|---|---|
| `type` | Aggregate/resource type string |
| `id` | Target id when known |
| `companyId` | From payload / loaded aggregate — must equal principal company (unless global platform) |
| `ownerUserId` | When own-scope applies |
| `organizationId` | B2B/partner |
| `branchId` | Branch-scoped ops |
| `attributes` | amount, stage, verification_status, visibility, projectId, etc. |

### Action naming

Canonical permissions follow `13-Authorization-Governance-Specification.md`, e.g.:

- `sales.opportunities.create`
- `sales.opportunities.read`
- `inventory.stock.receive`
- `finance.invoices.create`

> **Compatibility rule (2026-07-17):** Current handler strings are legacy executable action keys, not canonical permission codes. RC5.1 seeds 105 canonical backend permissions and an explicit mapping covering all 105 legacy keys used by 107 handlers. It does not rename handlers or change runtime enforcement. RC5.4 may normalize handler actions through the documented overlap window. Current AuthorizationSpecs populate company and leave owner/org/branch null.

---

## 3. Module contract expectations

| Module | Commands | Queries | Typical actions | Scope |
|---|---:|---:|---|---|
| Sales | 6 | 4 | create/update/revise/cancel/get/summary | company; rep=own |
| Procurement | 7 | 4 | supplier/PR/PO lifecycle | company; branch △ |
| Inventory | 9 | 8 | item/warehouse/stock | company; location △ |
| Finance | 8 | 6 | account/invoice/payment/ledger | company; finance roles |
| Projects | 12 | 8 | project/task/milestone/resource | company; project ◐ |
| Service | 10 | 6 | request/WO/appointment | company; assigned ◐ |
| CRM | 12 | 7 | lead/contact/account/campaign | company; own/team |

Full contract names: productization API audit / application `constants.ts` files.

### Special cases

| Contract family | Extra Policy checks |
|---|---|
| Cancel / archive / close | Higher privilege or Approval-pending attribute |
| Summaries | Company-wide; deny cross-company; reps may get reduced summaries |
| Get* by id | Load resource first or include companyId in query payload; deny if mismatch |
| Stock adjust/transfer | Branch/location + `inventory.stock.adjust` / `inventory.stock.transfer` |
| Record payment / credit | Finance + amount thresholds → Approval context |

---

## 4. Domains with repositories but zero handlers

`commerce`, `hr`, `manufacturing`, `cms`, `notifications`, `search`, `reporting`, `dam` (CQRS):

| RC5 requirement | Disposition |
|---|---|
| HTTP/CQRS | **None new** |
| Authorization | When RC7 registers handlers, they must ship with AuthorizationSpec |
| UI shells | Route Perm gates only |

---

## 5. Ownership validation checklist (API)

For every mutating command:

1. Authenticate and resolve the tenant/company context.  
2. Bind company (session ≡ header ≡ resource), then applicable organization/branch.  
3. Resolve active role assignments, inheritance, and the canonical permission through the versioned legacy mapping when required.  
4. Call the Policy Engine with action, resource, and context; Policy remains the sole authorizer.  
5. Evaluate required resource/record/field constraints without allowing any later step to override a deny.  
6. Apply Rules / Approval / Workflow business gates after authorization; they cannot grant authorization.  
7. Emit required authorization audit evidence.

For every get-by-id query, apply the same order and return 404/403 without leaking cross-tenant existence where required by security policy (prefer 404 for cross-company).

Default deny, explicit-deny precedence, missing-resource behavior, multiple assignments, and inheritance are normative in `13`.

---

## 6. Gaps (not new frameworks)

| Gap | RC5 action |
|---|---|
| Inconsistent legacy action strings across handlers | Map in RC5.1; normalize only in RC5.4; no new engine |
| Missing resource attributes on some authorize() builders | Complete using PolicyResource fields |
| OpenAPI public in production | Deploy/config policy |
| No List* queries | Out of scope (RC7); cannot authorize lists that do not exist |
| Workflow/Approval CQRS | Out of scope (RC6) |

---

## 7. Totals

| Metric | Count |
|---|---:|
| HTTP routes to document | 18 |
| CQRS contracts to verify AuthorizationSpec | 107 |
| Upload specialized route | 1 |
| New endpoints in RC5 | **0** |
