# RC5 — Route Protection Matrix

**Current evidence:** `packages/web/src/App.tsx`, nested route files, `RC2-authorization-verification.md`.  
**Current protection:** session presence only (`tokens.sessionId`) for `/app`, `/admin/platform`, `/portal`.  
**Required:** declarative permission + scope metadata for UX gating; **Policy remains sole runtime authorizer** on API calls.

> **Audit correction (2026-07-17):** Zero protected frontend routes consume roles/permissions today. `/portal` and `/admin/platform` each expose an index surface with wildcard redirect (no multi-page trees). Generic `ModuleApp` children (`pipeline`/`gantt`/`calendar`/entity templates) exist for every module and are not yet permission-filtered. Full matrix: `docs/rc5/audit/02-Route-Audit.md`.

Legend for **Current:** Public · Session · None  
Legend for **Required:** Public · Auth · Perm(canonical `<module>.<resource>.<action>`) · Scope(company|org|project|own)

---

## A. Public marketing (27 patterns)

| Route | Current | Required | Role | Tenant/Company | Record ownership | Policy |
|---|---|---|---|---|---|---|
| `/` and company pages | Public | Public | Guest | N/A | N/A | Public catalog/CMS only |
| `/products`, `/products/:id` | Public | Public | Guest | N/A | Public product | Public read; soft-404 gap is content bug not auth |
| `/projects`, `/projects/:id` | Public | Public | Guest | N/A | Public case study | Public read |
| `/contact`, `/quote`, `/demo` | Public | Public | Guest | N/A | Lead (future) | Rate-limit; no auth |
| `/privacy`, `/terms` | Public | Public | Guest | N/A | N/A | Public |
| `*` NotFound | Public | Public | Guest | N/A | N/A | Public |

No role required. Do not put `/app` secrets on marketing routes.

---

## B. Auth pages

| Route | Current | Required | Role | Ownership | Policy |
|---|---|---|---|---|---|
| `/login` | Public | Public | Guest | N/A | Auth rate limit |
| `/register` | Public | Public | Guest | N/A | Auth rate limit |
| `/password-reset` | Public | Public | Guest | N/A | Auth rate limit |
| `/onboarding` | Public (unguarded) | Auth preferred / invite token | User | Company draft | `identity.onboarding.execute`; today localStorage only |

**Gap:** onboarding is currently unguarded — RC5 should require session or signed invite without inventing new APIs beyond Identity.

---

## C. Account (authenticated)

| Route | Current | Required | Role | Company | Policy |
|---|---|---|---|---|---|
| `/app/account/email-verification` | Session | Auth | Any user | Session company | Identity |
| `/app/account/mfa` | Session | Auth | Any; enforce for admin roles | Session company | MFA hooks |
| `/app/account/security` | Session | Auth | Own session | Session company | Session probe |

---

## D. Workspace / analytics / AI / integrations / platform

| Route | Current | Required permission | Typical roles | Company | Notes |
|---|---|---|---|---|---|
| `/app` | Session | `executive.dashboard.read` | executive, admin | ✔ | Hide if denied |
| `/app/me` | Session | Auth | Any staff | ✔ | Own workspace |
| `/app/calendar` | Session | `calendar.events.read` | Staff | ✔ | |
| `/app/preferences` | Session | Auth | Own | ✔ | |
| `/app/analytics/*` | Session | `analytics.dashboards.read` | executive, managers | ✔ | configure needs `analytics.dashboards.configure` |
| `/app/reports/*` | Session | `reporting.reports.read` | managers+ | ✔ | |
| `/app/insights` | Session | `analytics.insights.read` | executive+ | ✔ | |
| `/app/ai/*` | Session | `ai.assistant.use` + flag | flagged users | ✔ | Presentation |
| `/app/settings/ai` | Session | `ai.settings.manage` | admin | ✔ | |
| `/app/integrations/*` | Session | `integrations.catalog.read` | admin | ✔ | Presentation |
| `/app/platform/*` | Session | `platform.operations.read`; deployment child uses `platform.health.read` | admin, owner | ✔ | Presentation + health |
| `/app/workflow` | Session | `platform.workflows.read` | admin, approver | ✔ | Seed UI |
| `/app/approvals` | Session | `platform.approvals.read` | approver | ✔ | Local UI |

---

## E. ERP module mounts (14)

Each `{base}/*` uses the same generated screens. Required pattern:

| Pattern | Required |
|---|---|
| `{base}` dashboard | `{module}.dashboard.read` |
| `{base}/pipeline\|gantt\|calendar` | `{module}.dashboard.read` or `{module}.boards.read` |
| `{base}/:entity` list | `{module}.{resources}.read` |
| `{base}/:entity/new` | `{module}.{resources}.create` |
| `{base}/:entity/:id` | `{module}.{resources}.read` + record scope |
| `{base}/:entity/:id/edit` | `{module}.{resources}.update` + record scope |

| Module base | Module code | Company | Record ownership |
|---|---|---|---|
| `/app/sales` | sales | ✔ | own/assigned for reps |
| `/app/procurement` | procurement | ✔ | company/branch |
| `/app/inventory` | inventory | ✔ | branch/location |
| `/app/finance` | finance | ✔ | company; auditor read |
| `/app/projects` | projects | ✔ | project membership |
| `/app/crm` | crm | ✔ | own/team |
| `/app/service` | service | ✔ | assigned |
| `/app/hr` | hr | ✔ | HR-only |
| `/app/manufacturing` | manufacturing | ✔ | production scope |
| `/app/cms` | cms | ✔ | editor |
| `/app/dam` | dam | ✔ | visibility class |
| `/app/notifications` | notifications | ✔ | admin |
| `/app/search` | search | ✔ | result Policy |
| `/app/reporting` | reporting | ✔ | report ACL |

**Tenant ownership:** all ERP routes are company-scoped via session `companyId` / `x-company-id` match (RC4).

---

## F. Portal / admin

| Route | Current | Required | Role | Tenant | Record | Policy |
|---|---|---|---|---|---|---|
| `/portal` | Session | `portal.customer_portal.read` | customer, corporate_buyer | org/own | own orders/invoices | Deny other customers |
| `/admin/platform` | Session | `platform.administration.read` | platform_admin, super_admin | global/platform | tenants (fixture) | No company ERP bleed |

---

## G. Implementation note (no code in this doc)

RC5.2 should add **route metadata** (canonical permission codes, required scopes) consumed by the shell for:

- redirect/forbidden empty states;
- nav filtering;
- button disablement.

Denial of a deep link must still be safe if the user crafts a URL — **API Policy** blocks data. UI is defense in depth only.

---

## H. Counts (baseline)

| Class | Count |
|---|---:|
| Explicit route pages | 63 *(App.tsx `<Route>` tags minus 3 structural; overlaps the 27 marketing + 14 ERP mounts and omits ~43 nested center leaf pages — see audit)* |
| Public marketing patterns | 27 |
| ERP generated screen patterns | 860 |
| Current Policy-aware route guards | 0 (session only) |
| Required permission-declared app routes | all `/app`, `/portal`, `/admin` surfaces |

> **Resolved baseline (2026-07-17):** `/app/platform/*` uses `platform.operations.read`, while the deployment child additionally declares `platform.health.read`. AI usage declares `ai.usage.read`. These are RC5.2+ targets; current guards remain session-only.
