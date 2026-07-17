# RC5 Field-Level Security Audit

> **Post-audit correction (2026-07-18, RC5.6):** The findings below describe
> the pre-RC5.6 baseline. RC5.6 now provides a shared Policy-driven projection
> and patch contract, applies it to live finance invoice/payment/credit DTOs,
> records sensitive field decisions without values, and adds presentation-only
> field metadata. Finance/KYC deny, masking, restricted-write, audit, and
> fail-closed tests live in
> `packages/api/src/authorization/field-authorization.test.ts`. No RBAC catalog,
> role seed, route, session, or Policy Engine algorithm changed. See
> `docs/release/RC5.6-field-level-security-audit.md` for the independent
> post-implementation audit.

## 1. Enforcement truth

No permission-aware DTO mapper, serializer redaction, field masking policy, field-write allowlist by role, or Policy-driven response projection was found. Policy currently decides an action on a record resource; an allowed query returns its normal result shape.

## 2. Sensitive field matrix

| Field family | Where it exists/appears | Current protection | Classification / gap |
|---|---|---|---|
| Salary / compensation | HR/payroll domain and HR presentation forms | HR route is session-only; no HR CQRS API | Domain model/presentation exists; field authorization absent |
| Profit / margin | Executive fixture widgets, finance/analytics summaries | Any authenticated route user can open UI; summary action is record-level only | No field gate/redaction |
| Cost / COGS | Sales, procurement, inventory/manufacturing/finance models and forms | Module session guard; allowed API records are not projected by cost permission | No `finance.costs.read` enforcement |
| Purchase price / supplier terms | Procurement PO/forms and related models | Session/company/record action only | No procurement field gate |
| Tax / tax identifiers | Sales/finance/commerce tax data and forms | Record action only; company financial identifiers are not separately projected | No field gate |
| Financial reports | Finance summary/reports/analytics | `finance.summary.read` is executable but unseeded; report routes session-only | Coarse record action only; report permissions missing |
| HR notes | RC5 prose/example | No confirmed current authoritative field/API path | Documentation-only concept |
| System settings/secrets | AI settings, integration API keys/configuration, platform settings | Session-only frontend; much data local/simulated | High-risk route/field gap |
| Bank/credit data | Finance models and RC5 permission examples | Finance record actions only | `finance.bank_accounts.read` / `finance.credit_accounts.update` not consumed |
| KYC/national ID | RC5 field matrix | No KYC CQRS/DTO projection found | Future/documentation-only |

## 3. Read-path findings

- Finance query handlers use one action per aggregate/summary and return the normal aggregate/read DTO.
- Sales/procurement/inventory queries do not request a second permission before returning internal price/cost/tax values.
- Executive and analytics fixture data can show profit/cost-style KPIs to any authenticated user.
- Portal data is fixture data, but its customer and invoice fields are still not role/ownership gated.
- “Hidden in UI” is not implemented as a reusable field policy and would not secure API data.

## 4. Write-path findings

- Mutating handlers authorize the command action, then validate the complete command payload.
- No field list is derived from principal permissions.
- A user allowed to update an aggregate is not separately denied for sensitive fields in that payload.
- Local-storage module forms bypass server Policy entirely for local records.

## 5. Masking and audit findings

| Control | Actual |
|---|---|
| Mask values in DTO | Not found |
| Omit fields based on permission | Not found |
| Read-only field by role | Not found |
| Restricted patch field by role | Not found |
| Sensitive-field access audit | General security/domain audit exists, but no field-read decision |
| Export-specific field projection | Not found |

## 6. Documentation comparison

`docs/rc5/07-Field-Level-Security.md` correctly says UI hiding is insufficient, but its field matrix is entirely target-state. The statement that sensitive reads “go through queries that omit fields or deny” is not supported by current query code. `dam.kyc_assets.read`, `finance.costs.read`, `finance.bank_accounts.read`, and `finance.credit_accounts.update` are proposed canonical permissions only.

## 7. Verdict

**Current field-level authorization:** 0 of the eight requested sensitive families has a permission-aware read/write implementation.  
**Existing protection:** authentication, company isolation, and coarse record actions only.  
**RC5 implication:** field-security sign-off cannot be inferred from existing Policy hooks; explicit DTO and patch tests are prerequisites for RC5.6, not RC5.1.
