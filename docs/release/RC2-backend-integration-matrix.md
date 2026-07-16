# RC2 — Backend Integration Matrix

| Screen / Area | Backend endpoint? | CQRS handler? | Real API? | Local/demo? | Action taken |
|---------------|-------------------|---------------|-----------|-------------|--------------|
| Auth login/register/MFA/reset | Yes | Identity | Yes | Session storage only | Wired (RC1+RC2 refresh) |
| Auth refresh | Yes (`/api/v1/auth/refresh`) | Identity SessionService | Yes | — | **Added transport + auto-refresh** |
| Health probes | Yes | Health | Yes | Metric cards fixture | Wired probes / keep cards |
| Sales create/get/update/cancel/revise | Yes | Yes | Yes | List fixtures | **Update + lifecycle wired** |
| Sales company summary | No company-wide | Per-customer only | No | KPI fixtures | Keep presentation |
| Procurement summary + CRUD + submit/issue/cancel | Yes | Yes | Yes | List fixtures | **Lifecycle wired** |
| Inventory summary + item update + receive | Yes | Yes | Yes | List fixtures | **Update + ReceiveStock wired** |
| Finance summary + account update | Yes | Yes | Yes | List fixtures | **Update wired** |
| CRM summary + lead update/qualify/convert | Yes | Yes | Yes | List fixtures | **Lifecycle wired** |
| Projects summary + update/archive/complete task | Yes | Yes | Yes | List fixtures | **Lifecycle wired** |
| Service summary + update/close | Yes | Yes | Yes | List fixtures | **Lifecycle wired** |
| Manufacturing / HR / CMS / Notifications / Reporting / Search | Domain only | **No** | No | Fixtures | Keep presentation |
| DAM upload | Yes upload | Upload router | Yes | Catalogue fixtures | Wired (existing) |
| Workflow / Approvals CQRS | Engine only | **No handlers** | No | Operator UI seed | Keep — no invented APIs |
| Analytics summaries (6 packs) | Yes | Yes | Yes | KPI numbers fixture | Already dispatchQuery |
| Executive dashboard | Summary queries | Yes (6) | Yes | KPI widgets fixture | **LiveBackendSummaries** |
| Platform SaaS / Portal / Integrations catalog | No SaaS APIs | No | Health only | localStorage | Keep presentation |
| Workspace chrome prefs | No | No | No | localStorage | Keep presentation |

**Rule:** Lists remain fixture-backed because **no List\* query handlers exist**. Create/Get/Update/lifecycle commands use live CQRS when entity `api` bindings are set.
