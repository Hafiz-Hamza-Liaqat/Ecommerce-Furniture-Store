# RC8.5 — Responsive Report

| Breakpoint | Gallery | 360° |
|---|---|---|
| Desktop | Thumbs rail + stage + dual-pane magnifier | Drag + toolbar + fullscreen |
| Tablet | Touch-friendly controls; dual-pane when width allows | Touch drag; `touch-action: none` on stage |
| Mobile | Horizontal thumbs; dual-pane hidden; pinch / swipe | Touch rotate; meta frame counter |

## Checks

- No intentional horizontal overflow on PDP media
- Object-fit contain avoids clipped heroes
- Lazy loading on non-primary gallery images
- Motion uses existing `--cx-*` tokens

## Manual matrix (sign-off)

| Device | Gallery | 360 | Notes |
|---|---|---|---|
| Desktop Chrome | ☐ | ☐ | |
| iPad | ☐ | ☐ | |
| iPhone Safari | ☐ | ☐ | |
| Android Chrome | ☐ | ☐ | |
