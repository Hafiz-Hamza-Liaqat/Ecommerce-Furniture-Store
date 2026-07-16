# RC5 — Field-Level Security

**Approach:** Field rules are **presentation + Policy attributes**, not a second authorization engine.  
**Target:** Sensitive reads that must not leak go through queries that omit fields or deny (`dam.kyc_assets.read`, finance exports).  
**Target:** UI hides/disables fields using permission codes; API remains authoritative.

> **Audit correction (2026-07-17):** No permission-aware DTO omit/mask/restricted-edit path exists today. Allowed queries return normal result shapes. Canonical codes such as `finance.costs.read`, `finance.bank_accounts.read`, `finance.credit_accounts.update`, and `dam.kyc_assets.read` are proposed for RC5.6, not implemented. See `audit/11-Field-Security-Audit.md`.

---

## 1. Field control classes

| Class | UI behavior | API behavior |
|---|---|---|
| **Hidden** | Not rendered | Not returned (or redacted) |
| **Read-only** | Display only | Updates ignore or reject field |
| **Restricted edit** | Editable if permission | Policy on update payload attributes |
| **Masked** | Partial display (e.g. ••••1234) | Full value only with permission |

---

## 2. Finance-only fields

| Field examples | Hidden from | Read-only for | Editable by |
|---|---|---|---|
| Cost, margin, COGS | Non-finance, partners, customers | Executive (optional view) | `finance_manager`, `admin` |
| Bank account, payment tokens | All except finance/admin | Auditor (masked) | finance |
| Credit limit, credit score | Sales reps (unless granted) | sales_manager view | finance |
| Tax IDs (company financial) | General staff | — | finance/admin |
| Commission rates | Non-managers | Rep own only if Rules allow | finance/sales_manager |

**Permission examples:** `finance.costs.read`, `finance.bank_accounts.read`, `finance.credit_accounts.update`.

---

## 3. HR-only fields

| Field examples | Control |
|---|---|
| Salary, compensation | Hidden except `hr_manager`, `admin`, subject (own limited) |
| National ID / CNIC | Restricted; often KYC/DAM `dam.kyc_assets.read` |
| Medical / emergency | HR only |
| Performance ratings | HR + manager of record |
| Personal phone (employee) | HR; managers masked |

---

## 4. Manufacturing-only fields

| Field examples | Control |
|---|---|
| Standard cost build-up, scrap rates | manufacturing_manager / finance |
| Machine efficiency / OEE internals | manufacturing_manager |
| Supplier confidential terms on BOM | procurement + mfg managers |
| Shop-floor notes | production_staff edit; partners hidden |

Until Manufacturing handlers exist, apply to **UI schemas only**.

---

## 5. Executive-only fields

| Field examples | Control |
|---|---|
| Company-wide margin rollups | `executive`, `admin`, `finance_manager` |
| Strategic forecasts | executive (RC14) |
| Board-level commentary | executive |
| Cross-branch P&L | executive/finance |

---

## 6. Module field matrix (representative)

| Module | Hidden (typical) | Read-only | Restricted edit |
|---|---|---|---|
| Sales | Internal cost | List price (reps) | Discount % above threshold |
| Procurement | Supplier bank | PO totals after issue | Unit price before issue |
| Inventory | Valuation layers | On-hand for partners | Adjust qty |
| Finance | — | Posted ledger lines | Draft invoices |
| CRM | Internal score weights | — | GDPR consent flags |
| Projects | Internal budget contingency | Client-visible budget | Cost to complete |
| Service | Internal SLA penalties | — | Warranty override |
| DAM | KYC media | Public thumbs | Restricted assets |
| Portal | Staff notes | Order status | Profile contact fields |
| AI settings | Provider secrets | — | Admin only |

---

## 7. Enforcement design (existing stack)

1. **Query handlers** shape DTOs per Policy (omit fields).  
2. **Update handlers** whitelist patchable fields by action/permission.  
3. **UI `EntityDef.fields`** gain metadata: `permissionView`, `permissionEdit`, `sensitivity`.  
4. **Audit** access to KYC/finance field views.  
5. **No** client-only security for sensitive values.

All field permission metadata uses the canonical grammar from `13-Authorization-Governance-Specification.md`. Missing field permission or missing required resource attributes deny; UI hiding does not authorize.

---

## 8. RC5.6 acceptance

- Field metadata catalog documented for V1 entities with live APIs.  
- At least finance cost/margin and KYC fields proven omitted under deny tests.  
- UI hides denied fields without claiming authorization.  
- No new field-ACL microservice.

---

## 9. Gaps

| Gap | Disposition |
|---|---|
| Fixture-backed forms still show all labels | Accept for presentation modules; strip when APIs go live |
| OpenAPI may expose schemas | Restrict in production config |
| Partners seeing ERP forms | Route Perm should block module entry |
