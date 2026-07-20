# RC9.5 — Persistence Verification

**Status:** Implemented — awaiting review  
**Date:** 2026-07-20

## Scope decision

Harden **local** CX persistence only. **No server CX sync APIs** (deferred to RC10+).

## Stores

| Key prefix | Storage | Notes |
|------------|---------|-------|
| `afh.cx.wishlist` / compare / recent / planner / consultant / leadQueue | localStorage | Device-local |
| `afh.cx.projects.*` | localStorage | Device-local; merge on login exists |
| `afh.cx.planner.handoff` | sessionStorage | Tab-scoped |

## Fixes

- `subscribeCxStorage` — cross-tab `storage` event for `afh.cx.*` (wired on Wishlist)
- `mergeWishlistOnLogin()` on successful login (dedupe local list; account sync deferred)
- `enqueueLead` 30s dedupe against double-submit
- InquiryForm sets `pending` before enqueue
- Corrupt JSON / quota failures return fallback / no-throw (offline recovery)
- `dequeueLead` helper for future flush

## Offline recovery

- Refresh with corrupt JSON → empty fallback, no crash
- Network interruption during inquiry → lead remains in local queue
- Server flush of lead queue: **not implemented** (document as future)

## Verified manually (checklist)

- [ ] Multi-tab wishlist toggle syncs
- [ ] Login preserves wishlist ids
- [ ] Double-click inquiry does not duplicate within 30s
