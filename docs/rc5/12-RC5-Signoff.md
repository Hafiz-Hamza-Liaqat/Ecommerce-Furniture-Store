# RC5 — Signoff Checklist

**Type:** Checklist only. No implementation in this document.  
**Candidate tag:** `rc5-candidate` (after RC5.9)

---

## A. Architecture compliance

- [ ] Policy Engine remains sole runtime authorizer  
- [ ] No new authorization framework introduced  
- [ ] No new HTTP business routes or invented List*/Workflow query APIs  
- [ ] Identity, CQRS, Persistence, Workflow ownership unchanged  
- [ ] Architecture freeze respected (ADR only if exception)

## B. Catalog & roles

- [ ] 33 initial immutable system roles from `03-Role-Catalog.md` seeded or waived with owner  
- [ ] 105 canonical backend permissions and 105 legacy-key mappings documented, unique, and stable  
- [ ] All permission codes satisfy `<module>.<resource>.<action>`; no stored wildcard grants  
- [ ] Hierarchy inheritance verified  
- [ ] Super Admin grant restricted  
- [ ] Super Admin bypass semantics in `13` verified (Policy/audit/workflow/feature controls not bypassed)  
- [ ] Partner/professional roles mapped without new engines  

## C. Routes & UI

- [ ] Route protection matrix implemented or flagged with residual gaps listed  
- [ ] Nav/dashboard gates do not authorize  
- [ ] Onboarding guard decision documented and applied  
- [ ] Portal/admin gates applied  

## D. API

- [ ] All 18 HTTP routes reviewed against `05`  
- [ ] All 107 CQRS contracts AuthorizationSpec audited  
- [ ] Company header binding still enforced  
- [ ] Upload permission + MIME/company checks intact  
- [ ] Cross-company deny tests green  

## E. Record & field

- [ ] Own/assigned/org/project/branch cases tested for live modules  
- [ ] Finance/HR/KYC field controls tested  
- [ ] Residual fixture-list risk documented for RC7  

## F. Dashboards

- [ ] Open/export/configure matrix applied  
- [ ] Live summary queries still Policy-checked  

## G. Security dependencies (may be parallel)

- [ ] localStorage session risk status recorded (RC4 R1)  
- [ ] MFA enrollment residual status recorded  
- [ ] Rate-limit multi-instance residual recorded  

## H. Quality

- [x] Unit/integration auth suites green — evidence: `docs/release/RC5.9-verification-report.md`
- [x] Typecheck/lint/build green — evidence: same
- [x] Harden/accept green — evidence: same (`authz_policy_smoke` added)
- [x] Regression auth/ERP smoke green — Identity/API/Web suites in verification report
- [x] Known Medium/Low issues listed with owners — residual register below + RC5.9 release report
- [x] Authorization performance goals measured and dispositioned — identity observability suite + verification report

## I. Docs & ops

- [x] `docs/rc5/*` matches shipped behavior — governance §5.2/§5.3, implementation plan RC5.9 evidence
- [ ] Operator role assignment runbook published — partial: correlationId + reason-code troubleshooting in `docs/release/RC5.9-authorization-observability.md` §Operator notes; full assignment runbook remains ops-owned
- [ ] Migration/rollback rehearsed in staging — ops-owned; rollback = revert RC5.9 commit / prior build
- [ ] Feature flag defaults documented — N/A for RC5.9 (no new flags)

## J. Release decision

- [x] RC5 scope complete (authorization only) — RC5.1–5.9 evidence packets delivered; human charter signoff still required below
- [x] No go-live claim beyond RC5 charter
- [x] RC6 entry criteria acknowledged (workflow definitions / operator APIs)
- [ ] Signoff: Engineering ________  Security ________  Product ________  Date ________

## K. Objective evidence required for every milestone

Each RC5.1–RC5.9 milestone must attach an evidence packet. “Not applicable” requires a written reason and approver; it is not an implicit pass.

| Evidence | Required proof |
|---|---|
| Build passes | Command, environment, artifact/build id, exit code, timestamp |
| Typecheck passes | Command/package scope, exit code, timestamp |
| Lint passes (if applicable) | Command/package scope, exit code; or approved N/A reason |
| Tests pass | Suite names, counts, failures/skips, report link, environment |
| Documentation updated | Files changed and reviewer confirmation that behavior/counts/codes match |
| Audit completed | Authorization/security audit reference, findings, owner, disposition |
| Git status clean | `git status` evidence after approved commit; no unexplained tracked or untracked files |
| Implementation scope respected | Diff-to-milestone review confirming only the milestone’s allowed scope |
| Rollback ready | Snapshot/artifact/config identifiers plus rehearsal or executable steps |
| Approval | Engineering and Security approvers; Product where behavior/UX changes |

### Milestone evidence register

| Milestone | Entry criteria evidenced | Completion criteria evidenced | Rollback checkpoint evidenced | Quality packet complete | Scope respected | Sign-off |
|---|---|---|---|---|---|---|
| RC5.1 | [ ] | [ ] | [ ] | [ ] | [ ] Catalog/constants/seeds/mappings/tests only | ______ |
| RC5.2 | [ ] | [ ] | [ ] | [ ] | [ ] Routes/navigation/UI declarations only | ______ |
| RC5.3 | [ ] | [ ] | [ ] | [ ] | [ ] Dashboard affordances only | ______ |
| RC5.4 | [ ] | [ ] | [ ] | [ ] | [ ] API authorization only | ______ |
| RC5.5 | [ ] | [ ] | [ ] | [ ] | [ ] Record authorization only | ______ |
| RC5.6 | [ ] | [ ] | [ ] | [ ] | [ ] Field authorization only | ______ |
| RC5.7 | [ ] | [ ] | [ ] | [ ] | [ ] Verification only | ______ |
| RC5.8 | [ ] | [ ] | [ ] | [ ] | [ ] Documentation/operations only | ______ |
| RC5.9 | [x] RC5.1–5.8 *implementation* evidence packets in `docs/release/RC5.*` (human register rows above remain open) | [x] Observability/hardening code + verification + audit packets | [x] Revert RC5.9 commit | [x] | [x] Authorization observability/hardening only (ADR D48) | ______ |

The entry/completion/rollback definitions and verification checklists are normative in `11-Migration-Plan.md`. A milestone cannot be marked complete from narrative assurance alone.

### Waiver schema

Any waived control must record:

| Field | Required |
|---|---|
| Control / checklist ID | Yes |
| Waiver owner | Yes |
| Rationale | Yes |
| Residual risk | Yes |
| Compensating control | Yes, or explicit “none” with Security approval |
| Expiry date | Yes |
| Approvers | Engineering + Security; Product when UX/behavior is affected |

A waived item is not a pass. Expired waivers reopen the milestone.

---

## Residual risks acceptable for RC5 exit (examples)

| Risk | Severity | Owner | Follow-up |
|---|---|---|---|
| Fixture ERP lists | Medium | Product | RC7 |
| Workflow UI seeds | Medium | Platform | RC6 |
| Session localStorage | Critical | Security | Cookie migration track |
| In-memory rate limit | Medium | Ops | Edge controls |
| Presentation AI/SaaS | Medium | Product | RC8–RC9 |
| Policy allow audit volume on filtered lists | Low | Ops | Accepted (governance forbids sampling); monitor `policy.allow` rate |
| Legacy principal fallback (pre-RC5.8 shape) | Low | Platform | Production uses `buildPrincipal` only; metric `authz.policy.legacy_principal` |
| Allow-path audit availability coupling | Medium | Ops | Audit store outage fails evaluate closed (including list-row allows); monitor audit health |

---

## Explicit non-signoff items (not RC5)

- [ ] Workflow definitions registered  
- [ ] Approval operator CQRS  
- [ ] List* APIs  
- [ ] Professional portals live  
- [ ] Commercial launch  

If any of the above are checked, scope was violated — reopen review.
