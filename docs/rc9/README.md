# RC9 — Premium Experience Track

- **Created:** 2026-07-19
- **Last Updated:** 2026-07-20
- **Status:** RC9.1 committed · **RC9.2 implemented + verified (awaiting review — not committed)**

## Relationship to RC8

RC8 is **COMPLETE AND FROZEN**. RC9 is customer UI/content polish and customer-facing AI only.

## Roadmap

| Release | Focus | Status |
|---|---|---|
| **RC9.1** | Premium UI Polish (+ catalog/blog CX) | **Committed** (`60c8334`) |
| **RC9.2** | Intelligent Furniture Consultant (Grounded AI) | **Implemented — review** |
| RC9.3+ | TBD after RC9.2 approval | Not started |

## Document map (RC9.2)

| Doc | Path |
|---|---|
| Intelligent Furniture Consultant Report | `docs/release/RC9.2-Intelligent-Furniture-Consultant-Report.md` |
| AI Architecture Report | `docs/release/RC9.2-AI-Architecture-Report.md` |
| Grounding Layer Report | `docs/release/RC9.2-Grounding-Layer-Report.md` |
| Recommendation Verification | `docs/release/RC9.2-Recommendation-Verification-Report.md` |
| Conversation Flow Report | `docs/release/RC9.2-Conversation-Flow-Report.md` |
| Budget Intelligence Report | `docs/release/RC9.2-Budget-Intelligence-Report.md` |
| Quotation Integration Report | `docs/release/RC9.2-Quotation-Integration-Report.md` |
| Runtime Verification Report | `docs/release/RC9.2-Runtime-Verification-Report.md` |
| Accessibility Report | `docs/release/RC9.2-Accessibility-Report.md` |
| Performance Report | `docs/release/RC9.2-Performance-Report.md` |
| Test Summary | `docs/release/RC9.2-Test-Summary.md` |

## Constraints

- Frontend / content / customer AI only
- Do **not** modify CQRS, Workflow, Policy, Authentication, Runtime Host, or enterprise modules
- Extend the existing consultant shell — do not replace it
- Do **not** commit RC9.2 until explicit approval
- Do **not** begin RC9.3 until RC9.2 is approved and committed
