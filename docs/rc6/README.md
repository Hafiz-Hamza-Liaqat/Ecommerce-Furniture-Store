# RC6 — Workflow Definition Foundation (slice index)

RC6 executes incrementally. This pack tracks approved slices only.

| Slice | Title | Status | Reports |
|---|---|---|---|
| RC6.1 | Workflow Definition Foundation | Implemented (pending review/commit) | `docs/release/RC6.1-*` |
| RC6.2+ | Not started — wait for approval after RC6.1 review | — | — |

Canonical broad RC6 scope remains in
`docs/productization/01-productization-roadmap.md` §RC6. Do not implement the
entire roadmap in one delivery.

## RC6.1 entry criteria (met)

- Existing Workflow/Approval engines reused
- Default definitions registered for all declared workflow codes and approval types
- Existing start references resolve after host start
- No Policy / authz model changes
- No UI / operator CQRS / SLA / notifications / recovery / concurrency
