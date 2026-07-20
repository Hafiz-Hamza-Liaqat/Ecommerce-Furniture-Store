# RC10 — Enterprise Workspace & Platform Enhancement

- **Created:** 2026-07-20
- **Last Updated:** 2026-07-21
- **Status:** RC10.1–RC10.3 committed · RC10.4 implemented — review

## Relationship to RC9

RC9 (through RC9.5) is the production foundation (UX, AI, persistence, security). RC10 expands the authenticated workspace and platform capabilities without weakening RC9.5 security guarantees.

## Roadmap

| Release | Focus | Status |
|---|---|---|
| **RC10.1** | Enterprise Workspace / Interior Design Studio | **Committed** (`169abf7`) |
| **RC10.2** | Notifications & Communication | **Committed** (`4ea453b`) |
| **RC10.3** | Smart Product Configuration & Quote Optimization | **Committed** (`3754311`) |
| **RC10.4** | Orders, CRM & Sales Workflow | **Implemented — review** |
| RC10.5 | Cloud Sync & Multi-Device (first new CX APIs) | Future |
| RC10.6 | Analytics & Business Intelligence | Future |
| RC10.7 | Release Candidate & Launch Preparation | Future |

**Sequence lock:** Do not start RC10.5 until RC10.4 is reviewed, tested, and committed.

## Document map (RC10.4)

| Doc | Path |
|---|---|
| CRM Workflow | `docs/release/RC10.4-CRM-Workflow-Report.md` |
| Orders | `docs/release/RC10.4-Orders-Report.md` |
| Quotation Workflow | `docs/release/RC10.4-Quotation-Workflow-Report.md` |
| Customer Timeline | `docs/release/RC10.4-Customer-Timeline-Report.md` |
| Assignments | `docs/release/RC10.4-Assignments-Report.md` |
| Search Verification | `docs/release/RC10.4-Search-Verification.md` |
| Operational Analytics | `docs/release/RC10.4-Operational-Analytics-Report.md` |
| Test Summary | `docs/release/RC10.4-Test-Summary.md` |

## Document map (RC10.3)

| Doc | Path |
|---|---|
| Smart Configuration Report | `docs/release/RC10.3-Smart-Configuration-Report.md` |
| Compatibility Verification | `docs/release/RC10.3-Compatibility-Verification.md` |
| Variant System Report | `docs/release/RC10.3-Variant-System-Report.md` |
| Budget Recalculation Report | `docs/release/RC10.3-Budget-Recalculation-Report.md` |
| Quote Integration Report | `docs/release/RC10.3-Quote-Integration-Report.md` |
| Catalog Gap Report | `docs/release/RC10.3-Catalog-Gap-Report.md` |
| Responsive Verification | `docs/release/RC10.3-Responsive-Verification.md` |
| Accessibility Report | `docs/release/RC10.3-Accessibility-Report.md` |
| Test Summary | `docs/release/RC10.3-Test-Summary.md` |

## Document map (RC10.2)

| Doc | Path |
|---|---|
| Notifications MVP Plan | `docs/release/RC10.2-Notifications-Plan.md` |
| Planner Stability (RC10.2.1) | `docs/release/RC10.2.1-Planner-Stability-Report.md` |
| RC10.2.1 Regression | `docs/release/RC10.2.1-Regression-Test-Report.md` |
| RC10.2.1 Test Summary | `docs/release/RC10.2.1-Test-Summary.md` |

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

## Development rules

- One sub-phase at a time; no next phase until current is reviewed, tested, and committed
- Preserve RC9.5 security guarantees
- Until RC10.5, CX persistence remains local (`afh.cx.*`)
- No automatic commit / push / tag / deploy without approval
- RC10.4 is implemented and awaiting manual review — do not commit or open RC10.5 until review completes
