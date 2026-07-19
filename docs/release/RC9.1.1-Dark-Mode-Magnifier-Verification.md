# RC9.1.1 — Dark Mode Magnifier Verification

- **Date:** 2026-07-20

## Root cause

RC9.1 `premium-ui.css` applied `transform: none !important` to **all** `.cx-gallery img`, which zeroed the floating pane’s `translate(...)` sampling transform in both themes. Dark mode made the failure more visible (lens overlay contrast + pane stacking).

## Fixes

| Item | Change |
|---|---|
| Pane image | Exempt `.cx-gallery__pane-img` from transform kill |
| Lens | Explicit light + dark overlays (readable dimming both themes) |
| Floating pane | `z-index: 95`, theme-aware border/shadow/background |
| Stage | Dark stage surface without hiding media |

## Parity checklist

| Check | Light | Dark |
|---|---|---|
| Floating zoom panel | PASS | PASS |
| Lens overlay | PASS | PASS |
| Hi-res sampling (`zoomUrl` / translate) | PASS | PASS |
| Cursor mapping | PASS | PASS |
| Fullscreen | PASS | PASS |
| Edge / placement | PASS | PASS |
| Panel visibility / z-index | PASS | PASS |
| Borders / shadows / contrast | PASS | PASS |

360° viewer was already theme-safe; left unchanged functionally.

## Verdict

**PASS** — zero intentional functional difference between themes.
