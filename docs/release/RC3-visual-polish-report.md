# RC3 — Visual Polish Report

## Enterprise shell

- Page headers: bottom border, consistent gap, action bar alignment
- Cards/widgets: subtle hover elevation
- Tables: enterprise bordered wrap, sticky header blur, row hover
- Page transitions: existing `.ws-page` fade (180ms gate + 220ms transition)

## Marketing site

- Header scroll shadow via `.site-header.is-scrolled`
- 404 page uses enterprise error card (consistent with workspace)
- Hero, booklet, catalogue, sustainability, contact/quote/demo — CSS tokens unchanged; no structural redesign

## Motion

- Fast/base/slow motion tokens
- `prefers-reduced-motion` disables table hover animation, card transitions, route fallback fade
- PWA update toast uses existing `ws-fade-up` keyframe

## PWA

- Service worker cache bumped to `afh-shell-v2`
- `PwaUpdatePrompt` — reload affordance when new SW waiting
- Offline bar in platform shell (existing `MobileReadinessBar`)

## Loading / empty

- Every lazy route: skeleton fallback (no blank screens)
- AppShell: skeleton during 180ms page transition
- Empty states: unchanged shared widgets

## Verdict

**Pass** — premium enterprise feel without feature expansion or redesign.
