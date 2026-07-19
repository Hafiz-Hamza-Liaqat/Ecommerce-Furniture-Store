# RC9.3 — Intelligent Budget Planner Report

- **Date:** 2026-07-20
- **Phase:** RC9.3 Intelligent Budget Planner & Space Planning
- **Commit:** pending — **do not commit until review approval**
- **Scope:** Customer marketing CX — extend RC9.2 grounded engine + Budget Planner UI

## Objective

Upgrade the static Budget Planner into an AI-driven furnishing planner that discovers requirements, applies industry templates (including Pakistan Jahez), estimates quantities, optimises to budget, and shares the same recommendation engine as the AI Consultant.

## Architecture compliance

| Constraint | Result |
|---|---|
| No CQRS / Workflow / Auth / Policy / Runtime redesign | **PASS** |
| Reuse RC9.2 grounded AI engine | **PASS** |
| Extend Budget Planner (do not replace architecture) | **PASS** |
| Catalogue-grounded products only | **PASS** |
| Conceptual items never presented as AFH SKUs | **PASS** |

## Delivered

| Area | Implementation |
|---|---|
| Requirement discovery | Per-template questions in `space-brief.ts` + planner UI |
| Industry templates | Office, home, hotel, restaurant, café, school, university, hospital, clinic, coworking, retail, government, **jahez** |
| Quantity estimation | Role qty functions from headcount / rooms / flags |
| Budget optimisation | Scale → swap → reduce → drop until near budget |
| Package builder | Zone-grouped packages with economy / recommended / premium |
| Planner ↔ Consultant | Shared `planFromBrief` / `planFromConsultantMemory` + **Planner→AI handoff hydration** |
| Outputs | Product list, qty, utilisation, alternatives, upgrades, PDF, quote, CRM lead (enriched meta) |

## Key files

- `packages/web/src/marketing/cx/intelligent/space-brief.ts`
- `packages/web/src/marketing/cx/intelligent/templates.ts`
- `packages/web/src/marketing/cx/intelligent/optimize.ts`
- `packages/web/src/marketing/cx/intelligent/planner.ts`
- `packages/web/src/marketing/pages/BudgetPlannerPage.tsx`
- `packages/web/src/marketing/cx/rc93-planner.test.ts`

## Verdict

**IMPLEMENTED — awaiting manual review.** Do **not** commit. Do **not** begin RC9.4.
