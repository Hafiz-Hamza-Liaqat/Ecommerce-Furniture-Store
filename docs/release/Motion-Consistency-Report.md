# Motion Consistency Report

- **Date:** 2026-07-19
- **Phase:** RC9.1

## Token set (`premium-ui.css`)

| Token | Value | Role |
|---|---|---|
| `--cx-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | Premium easing |
| `--cx-duration` | 280ms | Hover / UI chrome |
| `--cx-duration-slow` | 560ms | Drawer / image |
| `--cx-duration-reveal` | 600ms | Scroll reveal |
| `--cx-reveal-y` | 16px | Reveal travel |
| `--cx-stagger` | 55ms | Grid stagger |

## Systems audited

| System | Consistent with `--cx-*`? |
|---|---|
| Buttons | Yes |
| Cards | Yes |
| Nav drawer / backdrop | Yes |
| Scroll reveal | Yes |
| Hero intro | Yes (subtle, no parallax) |
| Page transition | Yes |
| Dialogs / search / cookies | Existing RC8 traps; no flashy motion added |
| Gallery / 360 | Interaction-owned; no competing hover motion |

## Reduced motion

`prefers-reduced-motion: reduce` disables reveal, hover transforms, drawer transitions, and loading spinner spin.

## Verdict

**PASS WITH NOTES** — enterprise workspace CSS unchanged (out of RC9.1 customer polish scope); customer site motion is unified.
