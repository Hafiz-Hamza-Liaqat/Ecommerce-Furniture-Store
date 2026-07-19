# Device QA checklist

Manual matrix before public launch. Playwright `mobile-chrome` covers a Pixel-class viewport in automation; physical devices still required.

| Device / browser | Home | Category | Product | Login | Dashboard | Notes |
|---|---|---|---|---|---|---|
| iPhone Safari (latest) | ☐ | ☐ | ☐ | ☐ | ☐ | Safe-area, notch, input zoom |
| Android Chrome | ☐ | ☐ | ☐ | ☐ | ☐ | Soft keyboard, back gesture |
| iPad Safari | ☐ | ☐ | ☐ | ☐ | ☐ | Split view / landscape nav |
| Desktop Chrome | ☐ | ☐ | ☐ | ☐ | ☐ | Primary CI path |
| Firefox | ☐ | ☐ | ☐ | ☐ | ☐ | CSS / flex quirks |
| Edge | ☐ | ☐ | ☐ | ☐ | ☐ | Parity with Chromium |

## Focus checks

- [ ] No horizontal scroll on marketing pages at 320–430px width
- [ ] Sticky header / cart / compare do not obscure CTAs
- [ ] Login form usable with password managers and MFA field
- [ ] Workspace nav opens/closes on touch; focus trap in dialogs
- [ ] Images and fonts load on constrained mobile networks
- [ ] Dark mode readable on OLED (if enabled)

## Sign-off

| Role | Date | Result |
|---|---|---|
| QA | | |
| Product | | |
