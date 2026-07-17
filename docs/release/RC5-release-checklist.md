# RC5 Release Checklist

- **Date:** 2026-07-18
- **Suggested tags:** `rc5` or `v0.5.0` (annotated; do not push until approved)
- **Related:** `docs/rc5/12-RC5-Signoff.md`, final verification + audit reports

## A. Scope & freeze

| Item | Status |
|---|---|
| RC5 charter only (authorization) | [x] |
| No new authorization framework | [x] |
| Policy Engine sole runtime authorizer | [x] |
| Frontend gates presentation-only | [x] |
| RC5.1–5.9 committed | [x] |
| Working tree clean of RC5 work | [x] after this packet |

## B. Milestone delivery

| Milestone | Status |
|---|---|
| RC5.1 Foundation | [x] |
| RC5.2 Route protection + session projection | [x] |
| RC5.3 Module permissions | [x] |
| RC5.4 API authorization | [x] |
| RC5.5 Record authorization (D45) | [x] |
| RC5.6 Field security | [x] |
| RC5.7 List filtering (D46) | [x] |
| RC5.8 Scope binding (D47) | [x] |
| RC5.9 Observability (D48) | [x] |

## C. Quality gates

| Gate | Status |
|---|---|
| Build | [x] PASS |
| Typecheck | [x] PASS |
| Lint `--max-warnings 0` | [x] PASS |
| Identity / API / Web tests | [x] PASS |
| Runtime verify / harden / accept | [x] PASS |

## D. Guarantees

| Guarantee | Status |
|---|---|
| Policy Engine only | [x] |
| Frontend presentation only | [x] |
| Catalog versions consistent | [x] |
| Session canonical only | [x] |
| Route catalog-driven | [x] |
| Load-before-authorize | [x] |
| Field fail-closed | [x] |
| List Policy-driven | [x] |
| Scope binding permission-aware | [x] |
| Observability active | [x] |

## E. Release decision

| Item | Status |
|---|---|
| Technical gates PASS | [x] |
| Final audit PASS | [x] |
| Human Engineering signoff | [ ] |
| Human Security signoff | [ ] |
| Annotated tag `rc5` or `v0.5.0` | [ ] create locally when approved; **do not push** until authorized |
| Begin RC6 | [ ] **Do not start** until tag + signoff complete |

## Overall

**RC5 is release-ready.**
