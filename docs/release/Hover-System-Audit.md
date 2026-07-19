# Hover System Audit

- **Date:** 2026-07-19
- **Phase:** RC9.1

## Interaction language

One language via `--cx-ease`, `--cx-duration`, `--cx-lift`, `--cx-scale`, `--cx-shadow-hover`.

| Surface | Hover treatment | Status |
|---|---|---|
| Primary / ghost buttons | Lift 3px + scale ~1.015 + soft shadow | Unified |
| Text links / footer / mega links | Color / opacity only | Unified |
| Product / project cards | Lift + image scale ~1.025 | Unified |
| Category cards | Lift + image ~1.03 + overlay deepen | Unified |
| Nav links | Color only (no bounce) | Unified |
| PDP gallery / 360 / thumbs | **No** card-style zoom or elevation | Exempt |

## Removed / overridden anti-patterns

- Mixed legacy `translateY(-1px)` vs `-3px` card lifts → RC9.1 layer
- Aggressive dual `cx-hover-lift` + card transform stacking → single card language
- Hero media zoom hover — none (hero has no hover effects)

## Forbidden effects (not used)

Bouncing, glow, rotation, flashy scales, oversized zoom.

## Verdict

**PASS** — one restrained hover language across customer surfaces.
