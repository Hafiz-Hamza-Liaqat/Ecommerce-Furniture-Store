# RC9.3 — Space Planning Engine Report

- **Date:** 2026-07-20
- **Phase:** RC9.3 Intelligent Budget Planner & Space Planning

## Engine flow

```
Template selection
    ↓
Requirement discovery (SpaceBrief)
    ↓
Industry template roles × quantity functions
    ↓
Grounding search / rank (RC9.2)
    ↓
Budget optimisation
    ↓
Package tiers + explanations
    ↓
Planner UI / Consultant cards / Quote / CRM
```

## SpaceBrief

Captures programme template, end-use, style, budget, seats/employees, managers, cabins, bedrooms, hotel rooms, classrooms, doctor rooms, meeting rooms, dimensions, and boolean space flags (reception, conference, VIP, etc.).

## Discovery coverage

| Programme | Example prompts |
|---|---|
| Office | Employees, managers, cabins, reception, waiting, conference, open vs cabins |
| Home | Apartment/house, bedrooms, living/drawing/TV/dining/office/guest |
| Hotel | Rooms, lobby, reception, restaurant, suites, waiting |
| Restaurant / Café | Capacity, indoor/outdoor, counter, waiting, VIP |
| School / University | Classrooms, labs, library, faculty, reception |
| Hospital / Clinic | Reception, waiting, doctor rooms, patient rooms, staff |
| Coworking | Seats, meeting rooms, reception, café, phone booths |
| Retail | Welcome desk, lounge |
| Jahez | Bedroom / living / dining / storage / décor + budget |

## Quantity examples (office, 12 employees)

- Workstations ≈ staff − managers − cabins
- Task chairs = employees
- Conference set when flagged / headcount ≥ 8
- Reception + waiting when flagged

## Verdict

**PASS** — space planning engine is template-driven and shared across Consultant and Planner.
