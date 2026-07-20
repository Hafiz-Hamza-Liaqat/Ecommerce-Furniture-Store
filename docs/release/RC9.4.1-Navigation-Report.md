# RC9.4.1 — Navbar Refinement & User Menu Consolidation

**Date:** 2026-07-20  
**Status:** Implemented — awaiting approval (no commit)

## Scope

UI/UX navigation refinement only. No changes to AI Consultant, Budget Planner, persistence/collaboration engines, CRM flows, auth contracts, or data models.

## What shipped

### 1. Minimal desktop navbar

Top bar contains only:

**Logo · Furniture · Products · Projects · Manufacturing · Consultant · Company ▼ · Journal · Search · Request Quote · User Avatar**

Removed standalone navbar controls:

- Theme / appearance icon
- Notifications bell
- Wishlist / Compare icons
- Account name/settings strip

Single-row layout with balanced spacing; no wrapping, overlap, or clipping.

### 2. Unified account dropdown

Clicking the user avatar opens a professional account menu with:

- Header: name + role badge
- Role-specific navigation links
- **Notifications** — expandable inline preview (top 3 + View all), unread count in menu row
- **Appearance** — inline ☀ / 🌙 toggle (persists via `afh.web.theme` across refresh, login, logout)
- Profile / Account Settings (where applicable)
- **Register another role** — buyer upgrade paths
- Logout

Unread badge appears **only on the avatar** (not a separate bell).

### 3. Role-aware menus

| Role | Menu highlights |
|---|---|
| Guest | Login, Register, Saved Wishlist |
| Buyer | Dashboard, Orders, Projects, Wishlist, Notifications, Appearance, Profile, Logout + Become… |
| Interior Designer | Designer Dashboard, Projects, Clients, Quotes, Notifications, Appearance, Profile, Logout |
| Architect | Architect Dashboard, Projects, Drawings, Quotes, Notifications, Appearance, Profile, Logout |
| Sales Agent | Agent Dashboard, CRM, Leads, Projects, Notifications, Appearance, Profile, Logout |
| Admin | Admin Dashboard, Admin Settings, Users, Reports, Notifications, Appearance, Logout |

### 4. Responsive behaviour

- **Desktop:** Avatar-only trigger, dropdown aligned right
- **Tablet/mobile:** Account section in slide drawer with full menu (Account, Dashboard, Projects, Wishlist, Notifications, Appearance, Logout)

### 5. Accessibility

- Keyboard navigation (Tab / Shift+Tab)
- Esc closes dropdown (focus trap + global handler)
- Click outside closes dropdown
- Focus trap on desktop account menu
- ARIA: `menu`, `menuitem`, `menuitemradio`, `aria-expanded`, `aria-label`
- Touch-friendly targets (≥2.75rem mobile)
- Smooth dropdown animation, z-index 60

### 6. Unchanged (regression guard)

Authentication, permissions, routing, AI Consultant, Budget Planner, Projects, Collaboration, CRM, persistence, APIs.

## Files

- `marketing/nav/config.ts` — role menus, appearance/notifications actions
- `marketing/MarketingShell.tsx` — consolidated utils bar, inline account menu
- `styles/premium-ui.css` — avatar badge, account menu appearance/notifications
- `marketing/nav/rc941-nav.test.ts`

## Manual checklist

- [ ] Desktop nav: single row, no icon clutter
- [ ] Avatar badge shows unread count only (no bell)
- [ ] Account menu: notifications preview + View all
- [ ] Appearance toggle persists after refresh / login / logout
- [ ] Guest / Buyer / Designer / Admin menus match role
- [ ] Mobile drawer includes account controls
- [ ] Esc + click-outside close account menu
- [ ] Journal link not overlapped by utils

## Known limitations

- Role membership still presentation/local until Identity multi-role API
- Notification seed is client-local until backend inbox sync
- Some role links map to shared existing routes (e.g. Drawings → `/downloads`)
