# RC9.2 — Conversation Flow Report

- **Date:** 2026-07-20
- **Phase:** RC9.2 Intelligent Furniture Consultant

## Session memory

Persisted fields include: room/end-use, industry, dimensions, seats/employees, style, colours, materials, budget, preference, selected/rejected product IDs, ready-for-quote flag.

Storage key: `afh.cx.consultant.memory` (session-scoped local persistence).

## Flow patterns

### Multi-turn merge

```
"I have 20 employees."
→ seats=20
"My budget is 2 million."
→ budgetPkr=2_000_000 (seats retained)
"I prefer Scandinavian style."
→ style=scandinavian (prior slots retained)
→ ask only for missing space type if needed
```

### Rich single opener

```
"I need furniture for a 20-person software company"
→ endUse=office, seats=20, industry=software
→ ask for remaining slots OR accept budget/style in next message
→ "Budget is 2 million, modern style, build a full package"
→ package + quote/handoff cards (done=true)
```

### Classic chip path

Button/chip answers still feed `nextConsultantTurn` — same engine, same memory.

## Follow-up policy

`missingFollowUps(memory)` asks **only** for absent critical slots (space type, budget, dimensions/seats, style as needed). Does not re-ask filled slots.

## Handoff detection

When a package/recommendation is ready (or user intent signals purchase readiness), assistant offers:

- Request quotation
- Contact sales / WhatsApp
- Book consultation / showroom visit
- Create CRM lead (existing lead queue)

## UX timeline

Conversation log uses `role="log"` + `aria-live="polite"`; typing indicator + optional stream preview between turns.

## Verdict

**PASS** — context retention and follow-up behavior verified by unit tests.
