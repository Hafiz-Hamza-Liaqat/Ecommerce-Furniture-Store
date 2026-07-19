# 09 — Accessibility Audit

- **Audit ID:** RC8.0-CX-09
- **Evidence:** `MarketingShell`, `marketing.css` (`prefers-reduced-motion`), `Seo`, forms, FAQ details

## 1. Capability matrix

| Area | Status | Notes |
|---|---|---|
| Skip to content | **I** | `.site-skip` |
| Keyboard — primary nav | **Partial** | Links focusable; mega keyboard incomplete |
| Keyboard — search dialog | **Partial** | Focus on open; Esc closes; no focus trap documented |
| Keyboard — gallery | **M** | No gallery controls |
| Focus visibility | **Partial** | Depends on browser + CSS; enterprise shell stronger |
| ARIA — nav / dialogs | **Partial** | `aria-expanded`, `aria-modal` search, chat `role=dialog` |
| ARIA — live regions | **Partial** | Newsletter/status; skeleton `aria-live` |
| Contrast | **Partial** | Theme tokens; not audited to WCAG AA systematically |
| Screen readers | **Partial** | Structure OK; decorative imgs often `alt=""` |
| Reduced motion | **Partial** | Marketing CSS disables many animations |
| Alt text quality | **Partial** | Hero has meaningful alt; many category/product alts empty |
| Form labels | **I** | InquiryForm labels present |
| FAQ | **I** | Native `<details>` |
| Cookie dialog | **Partial** | Accept only; no reject/manage |
| Language / i18n | **M** | English only |

## 2. Gap records

### Mega menu & gallery keyboard access

| Field | Value |
|---|---|
| **Current status** | Partial / Missing |
| **Why it matters** | WCAG 2.2 operable; legal/compliance for public site |
| **Recommended implementation** | Disclosure pattern with focus trap; arrow key thumbnail nav; visible focus rings in site tokens |
| **Dependencies** | Nav + gallery rebuild |
| **Priority** | **High** |

### Meaningful images & Product semantics

| Field | Value |
|---|---|
| **Current status** | Partial (empty alts on cards) |
| **Why it matters** | Screen reader users cannot browse catalogue |
| **Recommended implementation** | Require alt from DAM metadata; product name fallback |
| **Dependencies** | DAM metadata; catalogue |
| **Priority** | **High** |

### Consent / cookie controls

| Field | Value |
|---|---|
| **Current status** | Accept-only banner |
| **Why it matters** | Privacy regimes expect choice when non-essential cookies used |
| **Recommended implementation** | Essential vs analytics categories; wire to real analytics consent (RC13) |
| **Dependencies** | Privacy policy; analytics vendor |
| **Priority** | **Medium** |

## 3. Verdict

Foundation a11y exists (skip link, reduced motion, labeled forms). Commerce interactions (mega, gallery, chat, cookies) need deliberate WCAG work in Phase A/C.
