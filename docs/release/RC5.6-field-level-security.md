# RC5.6 — Field-Level Security Implementation Report

Date: 2026-07-18  
Status: Complete, pending review  
Commit: Not created

## Scope delivered

RC5.6 adds authoritative field-level DTO projection and restricted-write
validation without changing the Policy Engine, RBAC catalog, role seeds,
routes, sessions, authentication, or list-row behavior.

### Shared application contract

`packages/application/src/security/field-security.ts` provides:

- `projectFields` — delegates each protected-field decision to
  `PolicyEngine.evaluate`, then keeps, omits, masks, or denies according to
  field metadata.
- `authorizeFieldPatch` — evaluates every supplied restricted field and
  rejects the complete patch before mutation when any decision denies.
- `auditFieldDecisions` — records field name, permission, sensitivity,
  outcome, and reason only; field values and payloads are never logged.
- `Rc5FieldPermissions` — the frozen RC5.6 field metadata codes:
  `finance.costs.read`, `finance.bank_accounts.read`,
  `finance.credit_accounts.update`, and `dam.kyc_assets.read`.

These strings are intentionally outside the frozen system RBAC seed catalog.
The existing Policy Engine remains the only decision authority. Missing
principal, missing permission, or Policy evaluation failure denies.

### Live finance API projections

| Query | Protected data | Denied result |
|---|---|---|
| `finance.GetInvoice` | Invoice subtotal/tax/total and line unit/line amounts | Fields omitted |
| `finance.GetPayment` | Payment method identifier/label and external reference | Identifier/reference masked; label removed |
| `finance.GetCreditAccount` | Credit adjustments | Field omitted |

Unprotected DTO fields remain unchanged. API transport still passes application
results through without authorization logic.

### Restricted writes

- `finance.CreateInvoice` rejects line `unitAmount` / `lineAmount` unless
  Policy grants `finance.costs.read`.
- `finance.RecordPayment` rejects `methodId`, `methodLabel`, or `externalRef`
  unless Policy grants `finance.bank_accounts.read`.
- Validation occurs before workflow, Rules, repository writes, events, or
  other side effects. A denied field rejects the whole command.

### Presentation metadata

`EntityDef.fields` now supports:

- `permissionView`
- `permissionEdit`
- `sensitivity`

ERP forms hide fields without view permission, disable fields without edit
permission, and exclude non-editable values from UI-built payloads. This is
defense in depth only; backend projection and patch validation remain
authoritative.

Finance invoice amount and payment method/reference form fields carry RC5.6
metadata. No route or navigation behavior changed.

## Files changed

- `packages/application/src/security/field-security.ts`
- `packages/application/src/security/index.ts`
- `packages/application/src/index.ts`
- `packages/finance-application/src/security/field-security.ts`
- `packages/finance-application/src/security/index.ts`
- `packages/finance-application/src/index.ts`
- `packages/finance-application/src/handlers/query-handlers.ts`
- `packages/finance-application/src/handlers/account-invoice-handlers.ts`
- `packages/finance-application/src/handlers/payment-ledger-handlers.ts`
- `packages/api/src/authorization/field-authorization.test.ts`
- `packages/api/package.json`
- `packages/web/src/modules/erp/types.ts`
- `packages/web/src/modules/erp/types.test.ts`
- `packages/web/src/modules/erp/ModuleApp.tsx`
- `packages/web/src/modules/finance/definition.ts`
- RC5 and release documentation listed below

## Tests added

API tests prove:

- finance amount fields omitted under deny and returned under allow;
- payment identifiers masked under deny and returned under allow;
- KYC/national-ID field omitted under deny;
- Policy exceptions fail closed;
- missing principal rejects restricted writes;
- denied payment fields cause no repository mutation;
- allowed restricted patches require an explicit Policy grant;
- audit records contain metadata only, never sensitive values.

Web tests prove:

- protected fields hide while unresolved or denied;
- view permission reveals a field;
- missing edit permission produces read-only presentation;
- ordinary fields remain unaffected.

## Explicitly unchanged

- Identity RBAC permission catalog and version
- System role definitions and seeds
- `RbacPolicyEngine` algorithm and scope behavior
- Route permission catalog and guards
- Authentication and session projection
- API routes and endpoint inventory
- List-row filtering (reserved for RC7)
- UI information architecture and visual design

## Known boundaries

- No live KYC or HR CQRS read/update endpoint exists. RC5.6 proves the shared
  KYC omission contract without inventing an API. HR remains domain/UI-only.
- Fixture-backed financial/HR pages are presentation data, not authoritative
  API projections.
- Field permissions are fail-closed until explicitly supplied through the
  existing tenant permission store.
- `field_security_v1` is not implemented because disabling enforcement could
  expose protected values. Rollback stops affected surfaces and redeploys a
  prior secure projection.

## Documentation updated

- `docs/rc5/07-Field-Level-Security.md`
- `docs/rc5/09-Implementation-Plan.md`
- `docs/rc5/audit/11-Field-Security-Audit.md`
- `docs/release/RC5.6-field-level-security.md`
- `docs/release/RC5.6-verification-report.md`
- `docs/release/RC5.6-field-level-security-audit.md`

## Suggested commit message

`feat(rc5.6): enforce Policy-driven field-level security`

