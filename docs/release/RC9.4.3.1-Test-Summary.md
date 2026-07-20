# RC9.4.3.1 — Test Summary

**Date:** 2026-07-20  
**Package:** `@afh/web`

## Commands

```bash
npm run typecheck -w @afh/web
npm run lint -w @afh/web
npm run test -w @afh/web
npm run build -w @afh/web
```

## Results

| Gate | Result |
|------|--------|
| Typecheck | ✅ Pass |
| Lint | ✅ Pass (0 warnings) |
| Unit tests | ✅ **153** passed (24 files) |
| Production build | ✅ Pass |

## Accessibility smoke (code review)

| Check | Status |
|-------|--------|
| 44px touch targets (drawer close, toggle) | ✅ `min-height/width: var(--brand-touch-min)` |
| Focus ring | ✅ `--brand-focus-outline` on close + buttons |
| ESC closes drawer | ✅ existing focus trap / key handler |
| Body scroll lock | ✅ fixed body + restore |
| ARIA labels | ✅ unchanged (`Close menu`, logo home label) |
| Reduced motion | ✅ existing prefers-reduced-motion on buttons |

## Manual QA checklist (recommended before commit)

- [ ] Home light: Book a demo clearly visible  
- [ ] Home dark: brass secondary outline  
- [ ] Open drawer @ 320px: single RLF, no FABs, no page scroll  
- [ ] Close drawer: scroll + FABs restored  
- [ ] 1280px: nav + utils + CTA no overlap  

## Stop rule

**Do not commit. Do not start RC9.5.** Await manual review.
