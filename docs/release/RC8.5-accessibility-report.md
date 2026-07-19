# RC8.5 — Accessibility Report

| Requirement | Implementation |
|---|---|
| Keyboard gallery | ← →, F fullscreen, +/−/0 pinch reset |
| Keyboard 360 | ← → frames, ↑↓ rows (multi-row), A auto-spin, Home/0 reset, Esc |
| Focus management | Fullscreen uses shared `useFocusTrap` |
| Screen reader | Stage `aria-label` with frame/row counts; live frame meta |
| ESC exits fullscreen | Gallery + 360 |
| Touch gestures | Swipe gallery; drag 360 |
| Reduced motion | Auto-spin disabled when `prefers-reduced-motion: reduce` |
| Labels | Toolbar buttons with `aria-pressed` / titles |

## Notes

- Magnifier pane is `aria-hidden` (visual enhancement of the primary image).
- 360 stage uses `role="img"` with descriptive label; decorative frame `alt=""`.
