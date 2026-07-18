# RC6 Release Checklist

- **Date:** 2026-07-18
- **Suggested tags:** `rc6` or `v0.6.0` (annotated; do **not** create until approved)
- **Related:** `docs/rc6/README.md`, final verification + audit reports
- **HEAD (RC6.7):** `58e5391`

## A. Scope & freeze

| Item | Status |
|---|---|
| RC6 charter only (workflow / approval completion) | [x] |
| No engine ownership change | [x] |
| Workflow = lifecycle SSoT; Approval = approval owner; Policy = authz | [x] |
| No RC7 ERP / list / operational-data work | [x] |
| RC6.1–RC6.7 committed | [x] |
| Final documentation packet authored | [x] |

## B. Milestone delivery

| Milestone | Status |
|---|---|
| RC6.1 Definition foundation (D49) | [x] `c474345` |
| RC6.2 Operator CQRS (D50) | [x] `72649f7` |
| RC6.3 UI integration (D51) | [x] `cfb039e` |
| RC6.4 SQL durability (D52) | [x] `e5bcc9d` |
| RC6.5 Engine completion (D53) | [x] `c068249` |
| RC6.6 Status projection proof (D54) | [x] `4be49fa` |
| RC6.7 Recovery acceptance (D55) | [x] `58e5391` |

## C. Roadmap items 1–6

| Item | Status |
|---|---|
| 1 Default definitions | [x] |
| 2 Operator contracts | [x] |
| 3 UI wired to real data | [x] |
| 4 Guards / assignment / SLA / events / projections | [x] |
| 5 Status is workflow projection | [x] |
| 6 Restart / retry / idempotency / concurrency acceptance | [x] |

## D. Quality gates

| Gate | Status |
|---|---|
| Build | [x] PASS |
| Typecheck | [x] PASS |
| Lint `--max-warnings 0` | [x] PASS |
| Runtime verify | [x] PASS |
| Runtime harden | [x] PASS |
| Runtime accept | [x] PASS |

## E. Documentation

| Item | Status |
|---|---|
| Per-slice reports RC6.1–RC6.7 | [x] |
| ADR D49–D55 | [x] |
| ADR-INDEX.md | [x] |
| `docs/rc6/README.md` | [x] |
| Final verification / audit / checklist | [x] |

## F. Release decision

| Item | Status |
|---|---|
| Technical gates PASS | [x] |
| Final audit PASS | [x] |
| Human Engineering signoff | [ ] |
| Annotated tag `rc6` or `v0.6.0` | [ ] create locally when approved; **do not push** until authorized |
| Begin RC7 | [ ] **Do not start** until explicit approval |

## Overall

**RC6 is release-ready.** Do not start RC7 until approved.
