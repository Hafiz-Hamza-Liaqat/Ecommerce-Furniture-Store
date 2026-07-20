# RC9.5 — Performance Report

**Status:** Measured — awaiting review  
**Date:** 2026-07-20

## Production build (`npm run build -w @afh/web`)

Lazy route chunks retained. Notable gzip sizes:

| Chunk | ~gzip |
|-------|-------|
| `index` | 64.6 kB |
| `react` | 60.5 kB |
| `DamPage` | 44.1 kB |
| `router` | 14.1 kB |
| Marketing pages | typically 1–9 kB |

Build time ~3s. No homepage redesign.

## Memory / cleanup audit

| Area | Finding |
|------|---------|
| `subscribeCxStorage` | Returns unsubscribe; Wishlist `useEffect` cleans up |
| Session refresh timer | Existing session provider (unchanged) |
| IntersectionObservers / timers in marketing | No new observers added in RC9.5 |
| Notification poll | Existing 4s poll (accepted; not changed) |

## CSP / fonts

Google Fonts remain in CSP `style-src` / `font-src` allow-list (meta CSP).
