# 06 — Chatbot Audit (AI Furniture Consultant)

- **Audit ID:** RC8.0-CX-06
- **Evidence:** `MarketingShell.tsx` Live chat; `packages/web/src/ai/*` (authenticated `/app/ai`)

## 1. Surfaces compared

| Surface | Audience | Status |
|---|---|---|
| Public “Live chat” button | Customers | **P** — dialog text + link to `/contact` |
| WhatsApp deep link | Customers | **I** — external `wa.me` |
| `/app/ai` AI routes | Staff (auth) | **P** — simulated provider (`ai/provider.ts`) |
| Vision: AI Furniture Consultant | Customers | **M** |

Roadmap places true AI commerce in **RC9**, after catalogue trust (**RC11**).

## 2. Intended consultant capabilities

| Capability | Status |
|---|---|
| Recommend furniture | **M** |
| Recommend collections | **M** |
| Recommend layouts | **M** |
| Understand office size | **M** |
| Understand budget | **M** |
| Calculate quantities | **M** |
| Guide through products | **M** |
| Build quotations | **M** |
| Recommend accessories | **M** |
| Recommend materials / finishes | **M** |
| Recommend alternatives | **M** |
| Generate inquiry | **Partial** — human form only |
| Escalate to sales | **Partial** — contact/quote links |
| Book consultation | **Partial** — `/demo` form simulate |
| Save conversation | **M** (public); staff AI has local prefs only |
| Multi-language | **M** |

## 3. Gap records

### Public AI Furniture Consultant

| Field | Value |
|---|---|
| **Current status** | Missing; Live chat is a stub |
| **Why it matters** | High-intent B2B/B2C guidance; differentiates vs static catalogue |
| **Recommended implementation** | Customer chat shell → server AI gateway grounded on catalogue/Search read models; actions only via existing commands (CreateLead, draft Quote) under Policy; human handoff to CRM |
| **Dependencies** | RC5 consent/security; RC11 catalogue; RC7 Search; RC9 gateway; **forbid** inventing prices not from Rules/Sales |
| **Priority** | **High** (after catalogue truth); stub upgrade **Critical** for honesty |

### Staff AI vs customer AI

| Field | Value |
|---|---|
| **Current status** | Separate simulated staff copilots; not customer consultant |
| **Why it matters** | Avoid shipping `/app/ai` UX as if it were customer-facing |
| **Recommended implementation** | Keep enterprise copilots distinct; public consultant is new marketing-integrated surface |
| **Dependencies** | Architecture AI spec `09-ai-platform-spec.md` |
| **Priority** | **Medium** (governance) |

## 4. Honesty requirement

Until consultant exists: Live chat copy must not imply 24/7 AI advice. Current copy (“business hours… leave a message”) is acceptable interim; do not brand it as AI Furniture Consultant prematurely.

## 5. Verdict

**Chatbot consultant: Missing.** Public chat is escalation UI only. Real consultant belongs after catalogue + Policy-governed AI gateway (RC9), but Phase A can define UX shell + lead handoff contracts.
