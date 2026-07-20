# RC10 — Enterprise Workspace & Platform Enhancement

- **Created:** 2026-07-20
- **Last Updated:** 2026-07-21
- **Status:** RC10.1 committed (`169abf7`) · RC10.3 planned & frozen · RC10.2 in progress

## Relationship to RC9

RC9 (through RC9.5) is the production foundation (UX, AI, persistence, security). RC10 expands the authenticated workspace and platform capabilities without weakening RC9.5 security guarantees.

## Roadmap

| Release | Focus | Status |
|---|---|---|
| **RC10.1** | Enterprise Workspace / Interior Design Studio | **Committed** (`169abf7`) |
| **RC10.2** | Notifications & Communication | **In progress** |
| **RC10.3** | Smart Product Configuration & Quote Optimization | **Planned & frozen** |
| RC10.4 | Orders, CRM & Sales Workflow | Future |
| RC10.5 | Cloud Sync & Multi-Device (first new CX APIs) | Future |
| RC10.6 | Analytics & Business Intelligence | Future |
| RC10.7 | Release Candidate & Launch Preparation | Future |

**Sequence lock:** RC10.1 → RC10.2 → RC10.3. Do not reorder. Do not implement RC10.3 until RC10.1 and RC10.2 are committed; then reopen the frozen plan as documented.

## Document map (RC10.1)

| Doc | Path |
|---|---|
| Workspace Experience | `docs/release/RC10.1-Workspace-Experience-Report.md` |
| Studio Architecture | `docs/release/RC10.1-Studio-Architecture-Report.md` |
| Responsive Verification | `docs/release/RC10.1-Responsive-Verification-Report.md` |
| Accessibility | `docs/release/RC10.1-Accessibility-Report.md` |
| Test Summary | `docs/release/RC10.1-Test-Summary.md` |
| Runtime Verification | `docs/release/RC10.1-Runtime-Verification-Report.md` |
| Project Creation Fix | `docs/release/RC10.1-Project-Creation-Fix-Report.md` |
| Project Naming Verification | `docs/release/RC10.1-Project-Naming-Verification.md` |
| Project Creation Test Summary | `docs/release/RC10.1-Project-Creation-Test-Summary.md` |

## Document map (RC10.3)

| Doc | Path |
|---|---|
| Implementation Plan (frozen) | `docs/release/RC10.3-Implementation-Plan.md` |

## Document map (RC10.2)

| Doc | Path |
|---|---|
| Notifications MVP Plan | `docs/release/RC10.2-Notifications-Plan.md` |
| Planner Stability (RC10.2.1) | `docs/release/RC10.2.1-Planner-Stability-Report.md` |
| RC10.2.1 Regression | `docs/release/RC10.2.1-Regression-Test-Report.md` |
| RC10.2.1 Test Summary | `docs/release/RC10.2.1-Test-Summary.md` |

## Development rules

- One sub-phase at a time; no next phase until current is reviewed, tested, and committed
- Preserve RC9.5 security guarantees
- Until RC10.5, CX persistence remains local (`afh.cx.*`)
- No automatic commit / push / tag / deploy without approval
- RC10.3 scope is frozen — no further planning additions until reopen after RC10.2
