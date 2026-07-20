# RC9.4.3 — Brand Identity Completion Report

**Date:** 2026-07-20  
**Status:** Implemented — awaiting manual review (**no commit**)

## Objective

Replace placeholder branding with the official **Rao Liaqat Furniture** identity across the web frontend. Branding and UI only — no changes to authentication, authorization, AI Consultant logic, Budget Planner logic, persistence, collaboration, routing contracts, backend, or APIs.

---

## 1. Canonical Brand Module

Single source of truth:

```
packages/web/src/brand/
  index.ts          — BRAND constants, whatsappUrl(), telUrl()
  BrandLogo.tsx     — BrandLogo, BrandMonogramSvg, BrandMark
  brand.css         — Responsive logo, contact, account menu styles
  brand.test.ts     — Canonical identity unit tests
```

| Field | Value |
|-------|-------|
| **name** | Rao Liaqat Furniture |
| **monogram** | RLF |
| **phone** | +92 300 7922450 |
| **phoneSecondary** | +92 313 8897350 |
| **whatsapp** | 923007922450 (wa.me digits) |
| **whatsappDisplay** | +92 300 7922450 |
| **email** | info@raoliaquatfurniture.com |
| **web** | https://raoliaquatfurniture.com |
| **showroomNotice** | Showroom location will be added before production launch. |

Marketing content re-exports via `marketing/data/content.ts` for backward compatibility.

---

## 2. Logo System

### Components

- **`BrandLogo`** — Navbar, login (variant `full` / `monogram` / `responsive`)
- **`BrandMonogramSvg`** — SVG tile with RLF letterform (forest/brass theme tokens)
- **`BrandMark`** — Workspace sidebar (full name expanded; monogram when collapsed)

### Surfaces updated

| Surface | Implementation |
|---------|----------------|
| Marketing navbar | `BrandLogo variant="responsive"` |
| Mobile drawer | `BrandLogo variant="monogram"` |
| Login | `BrandLogo variant="full"` (non-link) |
| Workspace sidebar | `BrandMark` |
| Favicon / PWA | `/icons/rlf-192.svg`, `/icons/rlf-512.svg`, `manifest.webmanifest` |
| `index.html` | Title, meta, favicon → RLF |
| Platform shells | Text brand from `BRAND.name` (Admin, Portal, Onboarding) |

### Responsive behavior

| Viewport | Logo treatment |
|----------|----------------|
| ≥ 1200px | Full name “Rao Liaqat Furniture” |
| 768–1199px | Full name (reduced font size) |
| < 768px | RLF monogram + SVG mark |

CSS reserves `min-width` per breakpoint to limit navbar layout shift.

---

## 3. Contact Information

All customer-facing contact surfaces consume `src/brand/index.ts`:

- Contact page (`CompanyPages.tsx`)
- Footer trust strip (`MarketingShell.tsx`)
- Floating WhatsApp CTA
- Consultant WhatsApp handoff link (URL only; engine copy unchanged per scope)
- SEO / JSON-LD (`Seo.tsx`)
- Legal / company copy (`content.ts`)

Helpers: `whatsappUrl()`, `telUrl()`.

---

## 4. Contact Page / Location

Production-ready layout with map placeholder:

- `.contact-details` — phones, WhatsApp, email from `BRAND`
- `.contact-map-placeholder` — dashed border, `BRAND.showroomNotice`, caption for future Google Maps embed
- Adding a map later requires replacing the placeholder block only

---

## 5. Footer Trust Section

Existing footer layout retained. Trust grid populated with:

- Official business name
- Both phone numbers (tel: links)
- WhatsApp (wa.me link)
- Showroom notice
- Company links (About · Contact)
- Download catalogue
- Social link placeholders (LinkedIn, Instagram, Facebook — URLs TBD)

---

## 6. Account Menu (Notifications UI Prep)

`buildRoleAccountSections()` in `marketing/nav/config.ts`:

**Structure (all authenticated roles):**

1. Role dashboard(s) — dynamic by role
2. 👤 Profile
3. 📁 My Projects · ❤️ Wishlist · ⚖ Compare · 🔔 Notifications · 🌓 Appearance
4. 📄 Orders · 💬 Messages
5. 🚪 Logout

**Role dashboards:**

| Role | Items |
|------|-------|
| Buyer | Buyer Dashboard |
| Designer | Designer Dashboard |
| Architect | Architect Dashboard |
| Civil | Engineer Dashboard |
| Sales | Sales Dashboard |
| Admin | Admin Dashboard, Admin Settings |
| Supplier | Manufacturer Dashboard |

Buyers additionally see **Become a Partner / Register as Designer or Agent** at the bottom of the dropdown (`BECOME_ROLE_OPTIONS`).

Icons render via emoji in `MarketingShell` `AccountDropdown`.

---

## 7. Branding Consistency Audit

### Replaced

- “Artisan Furnish Hub” / “AFH” in marketing pages, SEO, platform shells, catalogue product brands (RLF Atelier/Heritage/Studio)
- Placeholder phones and `@artisanfurnish.example` emails
- `sitemap.xml` and `robots.txt` domains → `raoliaquatfurniture.com`
- Enterprise AI assist labels (compact **RLF Assist**; documents use full business name)

### Intentionally unchanged (scope constraints)

| Area | Reason |
|------|--------|
| `marketing/cx/intelligent/*` | AI Consultant logic/copy — out of scope |
| `BudgetPlannerPage.tsx` | Budget Planner — out of scope |
| `public/catalogue.pdf` | Binary demo asset; regenerate before production |
| Internal dev fixtures (`@afh.local`, integration docs URLs) | Not customer-facing branding |

---

## 8. Validation Gates

| Gate | Result |
|------|--------|
| Typecheck | ✅ Pass |
| ESLint | ✅ Pass (0 warnings) |
| Unit tests | ✅ 153 passed (24 files) |
| Production build | ✅ Pass |

See companion reports for logo, contact, footer, theme, responsive, and test detail.

---

## 9. Stop Rule

- **No git commit** created
- **RC9.5 not started**
- Ready for manual review before RC9.4.3 commit
