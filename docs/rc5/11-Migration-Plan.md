# RC5 — Migration Plan

---

## 1. Migration order

1. **RC4.5 docs freeze** (recommended): tag `rc4-docs-freeze`.  
2. **RC5.1** define and seed only the locked catalog/constants/mappings/tests in `09`; do not activate route, UI, API, record, or field enforcement.  
3. After RC5.1 sign-off and before any enforcement milestone, perform a separately approved operational assignment of baseline Owner/Admin roles to existing users.  
4. Enable **API authorization strictness** gradually (RC5.4) with dual action codes if needed.  
5. Enable **UI route/dashboard gates** (RC5.2–5.3) behind `ui_route_perms`.  
6. Enable **record scope hardening** per module (RC5.5).  
7. Enable **field security** for finance/HR/KYC first (RC5.6).  
8. Run full test gate (RC5.7).  
9. Docs + candidate tag (RC5.8–5.9).

---

## 2. Backward compatibility

| Concern | Strategy |
|---|---|
| Existing sessions | Remain valid until expiry; backend Policy resolves role assignments per evaluation (re-login not required for backend). Frontend cannot consume roles until session/principal DTO is extended |
| Handlers with legacy action keys | Explicit versioned legacy-key → canonical-permission mapping; no implicit rewrite |
| Users with zero roles | Fail-closed for ERP; allow account/security/self routes |
| Presentation modules | UI may hide; no API change |
| OpenAPI clients | Document permission requirements; no route renames |
| Fixture UI data | Still visible until RC7 — communicate “not authoritative” |

**No** breaking HTTP path changes. **No** CQRS type renames without alias period.

---

## 3. Feature flags

| Flag | Default | Effect |
|---|---|---|
| `rbac_catalog_v1` | proposed off→on | Use seeded catalog |
| `ui_route_perms` | proposed off | Session-only vs permission nav/routes |
| `api_action_taxonomy_v1` | proposed off | Strict action codes |
| `record_scope_strict` | proposed off | Stricter own/branch/project |
| `field_security_v1` | proposed off | Field omit/redact |
| `ai_assistant` | architecture example only | **Not implemented as a runtime gate today**; `ai.assistant.use` is also not currently enforced in UI |

> **Audit correction (2026-07-17):** These flags are migration proposals, not existing Settings keys. Do not claim they are already wired. Introduce only through approved Settings/feature-flag use of the existing architecture.

---

## 4. Rollback

| Stage | Rollback |
|---|---|
| Seed data | Deactivate new roles; restore prior assignments from backup |
| API strictness | Disable `api_action_taxonomy_v1`; dual codes |
| UI gates | Disable `ui_route_perms` |
| Field security | Disable `field_security_v1` |
| Full RC5 | Redeploy previous release artifact; restore Identity DB backup |

SQLite backup before seed (`scripts/backup-sqlite.sh`) — note hot-copy limitations documented in commercial audit; prefer offline/safe backup before prod-like migrate.

---

## 5. Deployment sequence

1. Backup Identity/AFH DB.  
2. Deploy build with flags **off**.  
3. Run role/permission seed job.  
4. Smoke auth + one command/query per module.  
5. Enable `rbac_catalog_v1`.  
6. Enable API taxonomy in staging → prod.  
7. Enable UI gates for admin pilot users → all users.  
8. Enable record/field flags module-by-module.  
9. Monitor PolicyDenied rates and lockouts.  
10. Complete signoff.

---

## 6. Data prerequisites

| Data | Owner |
|---|---|
| Permission codes | Security/architecture |
| Role hierarchy | Security |
| UserRole assignments | Company admin |
| Partner/org memberships | Identity (for later RC8) |
| companyId on all sessions | Identity (existing) |

---

## 7. Compatibility with later RCs

| Later RC | Migration impact |
|---|---|
| RC6 Workflow | Approval/workflow permissions already named; bind APIs later |
| RC7 List* | Queries inherit same scope rules |
| RC8 Portals | Partner roles already catalogued |
| RC9 AI | Target `ai.assistant.use` gate; **not currently enforced** |

---

## 8. Communication

- Internal: “UI hide ≠ permission; API is source of truth.”  
- Operators: role assignment runbook.  
- Support: PolicyDenied correlation ID troubleshooting (existing observability).

---

## 9. Mandatory milestone checkpoints

No RC5 milestone may start until the prior checkpoint is signed or explicitly rolled back. Each checkpoint captures the build/artifact identifier, database/catalog snapshot identifier, catalog version, feature settings, test evidence, audit link, approver, and timestamp.

### RC5.1 — Catalog foundation

| Requirement | Definition |
|---|---|
| Entry criteria | Frozen docs `01`–`13`; source inventory still 107 handlers/105 legacy action keys; backup/snapshot tested; RC5.1 scope-lock acknowledged |
| Completion criteria | Canonical catalog/constants, 33 system roles, mappings, idempotent seed, and definition tests complete; no enforcement/UI/API behavior changed |
| Rollback trigger | Seed validation failure; unmapped/duplicate legacy key; role hierarchy cycle; unexpected custom-role/assignment mutation; scope violation |
| Rollback steps | Stop seed; restore catalog/role-link snapshot; reactivate previous catalog version; verify tenant custom roles untouched; rerun pre-RC5 authorization smoke |
| Verification checklist | Grammar/verb/wildcard tests; 107/105 mapping proof; idempotency; checksums; build/typecheck/lint/tests; seed audit; clean git status |

### RC5.2 — Route authorization declarations

| Requirement | Definition |
|---|---|
| Entry criteria | RC5.1 signed; permission-bearing session/principal contract approved; route inventory current; UI gating flag approved through existing settings architecture |
| Completion criteria | Required route metadata, navigation filtering, forbidden states, and direct-URL tests complete; backend remains authoritative |
| Rollback trigger | Admin lockout; route loop; permission payload mismatch; protected data exposed by denied deep link; navigation regression |
| Rollback steps | Disable UI route gate; restore prior route metadata/build; retain backend Policy behavior; verify session-only fallback and audit incident |
| Verification checklist | Direct URLs, menu visibility, onboarding decision, portal/admin gates, accessibility, build/typecheck/lint/E2E, scope audit |

### RC5.3 — Dashboard authorization

| Requirement | Definition |
|---|---|
| Entry criteria | RC5.2 signed; dashboard inventory and canonical codes frozen; live vs fixture data identified |
| Completion criteria | Open/export/configure/approve affordances match `08`; live summary queries remain Policy-authorized |
| Rollback trigger | Dashboard lockout; KPI leak; view permission incorrectly implies export/configure; fixture presented as secured authoritative data |
| Rollback steps | Disable dashboard gate; restore prior dashboard metadata/build; verify API Policy unchanged; record exposure assessment |
| Verification checklist | Role/dashboard matrix, export/configure denies, direct URL, query Policy traces, regression, build/typecheck/lint/tests |

### RC5.4 — API authorization

| Requirement | Definition |
|---|---|
| Entry criteria | RC5.1 signed; compatibility mapping active; all 18 routes and 107 contracts traced; safe rollback mapping proven |
| Completion criteria | Handler taxonomy/resource audit complete; canonical overlap works; upload uses `dam.assets.upload`; cross-company samples deny |
| Rollback trigger | False-deny spike; unexpected allow; unknown mapping; handler/client incompatibility; missing audit evidence |
| Rollback steps | Restore legacy mapping/action mode; disable strict taxonomy setting if approved; redeploy prior artifact; verify all 107 contracts resolve |
| Verification checklist | 18-route review, 107-handler mapping, allow/deny/API-only tests, upload, correlation/audit, performance, build/typecheck/lint/tests |

### RC5.5 — Record authorization

| Requirement | Definition |
|---|---|
| Entry criteria | RC5.4 signed; resource ownership data quality measured; load-before-authorize design approved where required |
| Completion criteria | Applicable own/assigned/org/branch/project checks and IDOR tests pass for live modules; missing resource data denies |
| Rollback trigger | Legitimate-user lockout above threshold; cross-scope allow; ownership data corruption; unbounded query/performance regression |
| Rollback steps | Disable strict record scope per affected module; restore prior artifact/config; preserve company isolation; reconcile affected data and audits |
| Verification checklist | Cross-company/tenant/org/branch/project/own attacks, persisted-record checks, missing attributes, performance, build/typecheck/lint/tests |

### RC5.6 — Field authorization

| Requirement | Definition |
|---|---|
| Entry criteria | RC5.5 signed; sensitive field catalog approved; DTO and patch behavior documented; rollback does not expose newly collected secrets |
| Completion criteria | Finance/HR/KYC omit/mask/read-only/restricted-edit behavior and alternate access paths pass |
| Rollback trigger | Sensitive-field leak; authorized workflow broken; inconsistent DTO/export behavior; forbidden partial update |
| Rollback steps | Stop affected endpoint/export; prefer fail-closed field omission; disable only safe UI presentation changes; redeploy prior secure projection |
| Verification checklist | Hidden-field direct requests, exports, forbidden patches, read-only enforcement, audit events, build/typecheck/lint/tests |

### RC5.7 — Authorization verification

| Requirement | Definition |
|---|---|
| Entry criteria | RC5.1–5.6 completion evidence available; test identities/scopes approved; representative environment stable |
| Completion criteria | Every applicable category in `10-Test-Plan.md` passes; Critical/High defects are zero; performance goals measured |
| Rollback trigger | Critical/High failure; nondeterministic authorization; missing evidence; unacceptable performance |
| Rollback steps | Halt candidate; revert the responsible milestone using its checkpoint; rerun prior green suite; update risk register |
| Verification checklist | Unit/integration/E2E/adversarial/regression/performance results, defect disposition, build/typecheck/lint/harden/accept |

### RC5.8 — Documentation and operations

| Requirement | Definition |
|---|---|
| Entry criteria | RC5.7 signed; shipped behavior and catalog version known; residual risks assigned |
| Completion criteria | RC5, operator, troubleshooting, migration, rollback, and productization docs match shipped behavior |
| Rollback trigger | Documentation contradicts runtime/security evidence; missing operator procedure; unresolved catalog statistic |
| Rollback steps | Withdraw candidate docs/tag; restore prior approved docs; correct against objective runtime evidence; repeat review |
| Verification checklist | Link/count/code scan, operator rehearsal, security/engineering review, docs diff limited to approved scope, clean git status |

### RC5.9 — Release candidate

| Requirement | Definition |
|---|---|
| Entry criteria | RC5.1–5.8 signed; rollback rehearsal complete; prior artifact and snapshots available |
| Completion criteria | `12-RC5-Signoff.md` evidence complete; candidate tag references exact artifact/catalog/docs; no unauthorized waiver |
| Rollback trigger | Any sign-off gate fails; production canary lockout/leak; scope violation; rollback evidence unavailable |
| Rollback steps | Disable approved RC5 enforcement settings in reverse order; redeploy prior artifact; restore catalog snapshot only if required; verify baseline and notify owners |
| Verification checklist | Build/typecheck/lint/tests/harden/accept, audit, docs, clean git status, scope review, rollback rehearsal, named approvals |
