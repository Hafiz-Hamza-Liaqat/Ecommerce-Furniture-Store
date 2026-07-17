# RC5 — Field-Level Security

**Approach:** Field rules are **presentation + Policy attributes**, not a second authorization engine.  
**Target:** Sensitive reads that must not leak go through queries that omit fields or deny (`dam.kyc_assets.read`, finance exports).  
**Target:** UI hides/disables fields using permission codes; API remains authoritative.

> **Implementation evidence (2026-07-18, RC5.6):** Policy-driven DTO
> projection, masking, restricted-patch rejection, audit evidence, and
> presentation metadata are implemented. The four RC5.6 field permissions
> remain field metadata outside the immutable system RBAC seed catalog, as
> required by the RC5.6 constraint. Missing grants therefore fail closed.
> Finance invoice/payment/credit query DTOs are protected; KYC omission is
> proven through the shared projection contract because no KYC CQRS read API
> exists. HR remains UI metadata/domain-only until an HR CQRS API exists.
> Evidence: `docs/release/RC5.6-field-level-security.md`,
> `docs/release/RC5.6-verification-report.md`, and
> `docs/release/RC5.6-field-level-security-audit.md`.

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

## 8. RC5.6 field metadata catalog

| Live surface / field | Permission | Sensitivity | Read deny | Write deny | Audit |
|---|---|---|---|---|---|
| Finance invoice `subtotal`, `taxTotal`, `total` | `finance.costs.read` | Financial | Omit | N/A (not patchable) | `field.read` |
| Finance invoice line `unitAmount`, `lineAmount` | `finance.costs.read` | Financial | Omit | Reject entire create before mutation | `field.read` / `field.update` |
| Finance payment `method`, `externalRef` | `finance.bank_accounts.read` | Restricted | Mask identifiers | Reject entire record command before mutation | `field.read` / `field.update` |
| Finance credit account `adjustments` | `finance.credit_accounts.update` | Financial | Omit | Existing adjustment command remains Policy-gated | `field.read` |
| KYC DTO `nationalId` / restricted metadata | `dam.kyc_assets.read` | Restricted | Omit | Reject through shared patch contract | `field.read` / `field.update` |

The field codes above are deliberately **not** added to the frozen system RBAC
catalog or system-role seeds. They are evaluated as exact canonical strings by
the existing Policy Engine. A tenant permission assignment may supply them;
otherwise omission/masking/rejection is the mandatory fail-closed result.

`packages/application/src/security/field-security.ts` is the shared application
contract. It does not decide access: it calls `PolicyEngine.evaluate` for every
field permission and only applies that decision to DTO/patch behavior. It also
records field name, permission, sensitivity, and outcome without field values.

`EntityDef.fields` has presentation-only `permissionView`, `permissionEdit`,
and `sensitivity` metadata. The UI hides denied fields and disables view-only
fields, but backend projection and patch rejection remain authoritative.

The planning-table `field_security_v1` rollback flag is not wired because
turning field security off would expose protected values. Operational rollback
follows `11-Migration-Plan.md`: stop the affected endpoint/export and redeploy
the prior secure projection while retaining fail-closed omission. UI metadata
may be disabled only when doing so cannot disclose server data.

HR salary/KYC domain objects and manufacturing fields do not currently have
live CQRS read/update DTOs. RC5.6 does not invent endpoints or secure fixture
rows as if they were authoritative APIs; the shared contract must be applied
when those APIs become live.

---

## 9. RC5.6 acceptance

- Field metadata catalog documented for V1 entities with live APIs.  
- At least finance cost/margin and KYC fields proven omitted under deny tests.  
- UI hides denied fields without claiming authorization.  
- No new field-ACL microservice.

---

## 10. Gaps

| Gap | Disposition |
|---|---|
| Fixture-backed forms still show all labels | Accept for presentation modules; strip when APIs go live |
| OpenAPI may expose schemas | Restrict in production config |
| Partners seeing ERP forms | Route Perm should block module entry |
