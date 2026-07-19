# RC9.3 — Budget Optimization Report

- **Date:** 2026-07-20
- **Phase:** RC9.3 Intelligent Budget Planner & Space Planning

## Strategy

1. Build a **complete** package from the industry template (not “buy expensive until broke”).
2. If over budget by >25%, **scale quantities** proportionally.
3. **Swap** to cheaper grounded alternatives (optional → essential).
4. **Reduce** quantities on highest-cost lines.
5. **Drop** optional, then important roles if still over.
6. Last resort: drop expensive essentials while keeping at least one grounded line.
7. Surface **upgrade** suggestions when budget remains.

## Outputs

- `utilizationPercent` / `remainingPkr`
- `downgrades[]` — substitutions made
- `upgrades[]` — optional improvements within remainder
- `explanations[]` — human-readable rationale
- `conceptual[]` — non-SKU suggestions

## Tiers

| Tier | Behaviour |
|---|---|
| Economy | Value picks + ~85% budget target |
| Recommended | Mid picks + full budget fit |
| Premium | Premium picks; soft-trim only if extreme overshoot |

## Verification

Tight office brief (40 seats, PKR 800k) fits within ~1.15× budget after optimisation.

## Verdict

**PASS**
