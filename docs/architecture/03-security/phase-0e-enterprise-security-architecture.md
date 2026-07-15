# Phase 0E — Enterprise Security Architecture, Identity, Authorization & Compliance

**Role:** Principal Enterprise Security Architect  
**Mode:** Documentation only · Technology-agnostic · No code · No SQL · No transport/framework syntax  
**Depends on:** Phase 0A FROZEN · Phase 0B–0D APPROVED  
**Status:** PHASE 0E ARTIFACT APPROVED  
**Cross-references:** [Master Index](../README.md) · [0A Laws](../00-foundation/phase-0a-enterprise-architecture-laws.md) · [0B Data](../01-domain/phase-0b-enterprise-data-architecture.md) · [0C Services](../01-domain/phase-0c-enterprise-domain-service-architecture.md) · [0D Integration](../02-integration/phase-0d-event-bus-integration-saga.md) · [0F Observability](../04-observability/phase-0f-observability-operations.md) · [Glossary](../glossary.md) · [ADR Index](../decision-records/ADR-INDEX.md)

---

# 1. Security Principles

| Principle | Enterprise meaning for this platform |
|-----------|--------------------------------------|
| **Zero Trust** | No implicit trust by network location, role label, or prior session alone. Every command/query is authenticated and **Policy-authorized** in context. |
| **Least privilege** | Grant minimum permissions and scopes (company → branch → location → project → own). Default deny. |
| **Defense in depth** | Edge validation, authentication, Policy Engine, Workflow/Approval gates, Rules constraints, encryption, audit, monitoring—independent layers. |
| **Secure by default** | New users least privilege; feature flags off for risky capabilities; media default non-public unless catalog/CMS requires public; secrets never logged. |
| **Explicit authorization** | **Policy Engine is the only runtime authorization engine** (Architecture Law). RBAC/ABAC data feed Policy; controllers/services do not implement parallel allow/deny. |
| **Separation of duties** | Maker-checker via Approval Engine for money, credit, B2B activation, refunds, PO, publish where configured. Super Admin ≠ day-to-day Admin for break-glass. |
| **Immutable audit** | Security- and finance-relevant actions append to immutable audit store; no silent rewrite of ledger, stock ledger, commission ledger, or audit rows. |

---

# 2. Identity Architecture

## 2.1 Identity types

| Identity | Description | Typical linkage (0B) |
|----------|-------------|----------------------|
| **User** | Human login principal | `users` |
| **Customer** | B2C buyer | User + Customer role + profile |
| **Employee** | Staff principal | User + `employees` + Team membership |
| **Partner** | Agent, Designer, Architect, Civil, Contractor | User + `partner_profiles` (+ org optional) |
| **Organization** | B2B / shop / wholesaler / contractor firm | `organizations` + members |
| **Service account** | Non-human integration principal | Dedicated user/service identity with constrained roles |
| **External integration** | Payment, SMS, WhatsApp, accounting, logistics | Service account + webhook verification + scoped permissions |

Trades (Carpenter, Painter, Polisher) remain **Employee + Team**, not separate identity types or RBAC roles.

## 2.2 Account lifecycle

```text
Invited / Registered
  → Email/phone verification (as required)
  → Active
  → Suspended (temporary)
  → Deactivated (soft)
  → Anonymized / deleted (compliance process)
```

- Role/scope changes are audited.  
- Org verification is Approval-gated before B2B privileges.  
- Partner applications Approval-gated before partner scopes.

## 2.3 Session lifecycle

```text
Authenticate → Session created → Active use → Refresh (if used) → Idle/absolute expiry → Revoke
                                                      ↘ Explicit logout / admin revoke / password change → revoke all
```

Sessions and API tokens are secrets (hashed at rest per 0B). Correlation IDs attach to requests for audit/security monitoring.

---

# 3. Authentication Model

| Concern | Architecture contract |
|---------|------------------------|
| **Login lifecycle** | Identify → verify credentials/MFA → Policy-irrelevant until authenticated → create session → audit success/failure |
| **Session lifecycle** | Bound to user, device metadata, company context; absolute and idle timeouts (Settings) |
| **Refresh strategy** | Refresh credentials rotate; reuse detection revokes family; short-lived access, longer refresh |
| **MFA** | Required capability for Super Admin / Admin (mandate timing per Decision Register D31 deferred—architecture supports enforcement). Step-up MFA for high-risk actions (refund, role grant, KYC view). |
| **Password policy** | Length/complexity/breach resistance via Settings; no password in logs/events |
| **Password reset** | Time-limited, single-use token; invalidate sessions on success |
| **Account lockout** | Progressive lockout after failed attempts; alert on spikes; admin unlock audited |
| **Email verification** | Required before privileged customer/partner actions as configured |
| **Phone verification** | Required for B2B/partner onboarding and delivery OTP trust as configured |
| **Device trust / remember device** | Optional trusted-device tokens; bind to user; revocable; not a Policy bypass |

Federation/OAuth for future integrations is compatible; runtime authorization remains Policy.

---

# 4. Authorization Architecture

## 4.1 Non-negotiable law

**Policy Engine = sole runtime authorization decision point.**  
RBAC supplies permission assignments. ABAC/scopes supply conditions. Approval/Workflow/Feature flags appear as **Policy context inputs**, not alternate authorizers.

## 4.2 Evaluation model

```text
Request
  → Authenticate
  → Build principal (roles, scopes, org, branch, flags)
  → Policy.Evaluate(principal, action, resource, context)
       → Allow | Deny(+reason)
  → On Allow: Application Service → Rules / Workflow / Approval as business gates
  → On Deny: PolicyDenied event + audit (sensitive)
```

## 4.3 RBAC

- Permissions (`module.action`), Roles, RolePermission, UserRole with scope (company / branch / organization / own).  
- Governance roles: Super Admin, Admin, Moderator, Editor + business roles from 0A.

## 4.4 ABAC / resource conditions

Policy conditions may use: resource owner, assignee team, organization membership, project membership, verification_status, workflow stage, amount thresholds, media visibility, feature flags.

## 4.5 Scopes

| Scope | Meaning |
|-------|---------|
| **Company** | Tenant boundary (`company_id`)—mandatory isolation |
| **Branch** | Operational site |
| **Location** | Warehouse/showroom/workshop |
| **Organization** | B2B/partner firm data |
| **Project** | Interior/architecture/civil/contractor project members |
| **Own / Assigned** | Self or explicitly assigned work orders/orders |

## 4.6 Approval interaction

If Policy allows “submit” but Approval required: mutation creates ApprovalRequest; effect waits. Policy may deny “finalize” while `approval_pending`.

## 4.7 Workflow interaction

Policy may allow `workflow.transition` only if role may act on subject in current stage; illegal transitions remain Workflow violations (separate error class). Workflow does not replace Policy.

---

# 5. Permission Model

| Concept | Contract |
|---------|----------|
| **Permissions** | Atomic codes (e.g. `order.view`, `refund.approve`, `kyc.view`) |
| **Roles** | Bundles of permissions; system vs company roles |
| **Role hierarchy** | Logical inheritance for Admin ⊃ Moderator/Editor packs where defined; **Super Admin** not grantable by Admin (0A) |
| **Permission inheritance** | Via role hierarchy and org member roles—not via ad-hoc wildcards in services |
| **Role assignment** | UserRole with scope + validity window; audited |
| **Temporary permissions** | `valid_from` / `valid_to` on UserRole; auto-expire; break-glass time-boxed Super Admin actions audited |
| **Delegated permissions** | Explicit delegation records (optional) still evaluated by Policy—no “share my admin” side channel |
| **Organization permissions** | Org-scoped roles for B2B members |
| **Partner permissions** | Partner-type roles limited to attributed/assigned/project resources |

Field workers: Employee permissions + assignment/team attributes in Policy—**not** extra roles per trade.

---

# 6. Security Boundaries

| Boundary | Who | Access pattern |
|----------|-----|----------------|
| **Public** | Anonymous | Catalog, CMS public, auth endpoints; no PII of others |
| **Authenticated** | Any logged-in user | Own profile, own orders; Policy scoped |
| **Employee** | Staff | Assigned tasks/queues |
| **Manager** | Branch/team leads | Branch-scoped ops |
| **Finance** | Finance-capable Admin roles | Invoices, payments, refunds, AP/AR views |
| **Production** | Production managers/teams | MO/QC/schedules |
| **Warehouse** | Warehouse staff | Stock/GRN/transfers at locations |
| **Admin** | Company Admin | Ops + most settings; not Super Admin control plane |
| **Super Admin** | Break-glass | Roles, security settings, gateway secrets, grant Admin |
| **Platform Operator** | Future SaaS ops | Cross-tenant only with explicit platform role (v1 unused) |
| **Support** | Constrained staff | Impersonation forbidden by default; read with audit if ever enabled |
| **API integrations** | Service accounts | Least privilege, signed webhooks, rate limits |

Boundaries are enforced by Policy + scopes, not by separate apps alone.

---

# 7. Data Protection

## 7.1 Classification

| Class | Examples | Controls |
|-------|----------|----------|
| **PII** | Name, email, phone, address | Access Policy, encryption in transit, minimized events, retention |
| **Financial** | Payments, invoices, credit, commission | Strict Policy, immutable ledgers, enhanced audit |
| **KYC / restricted** | CNIC, tax docs, shop docs | DAM restricted, encryption at rest, `kyc.view`, purpose limitation |
| **Media** | Product/public vs proof/KYC | DAM visibility classes |
| **Documents** | Generated PDFs | Reporting + Templates + DAM; ACL via Policy |
| **Secrets** | Password hashes, API keys, gateway secrets | Settings `is_secret`, vaulting, never in events/logs |

## 7.2 Cryptographic controls (logical)

| Control | Use |
|---------|-----|
| **Encryption in transit** | All client and integration channels |
| **Encryption at rest** | KYC media, secrets, sensitive columns as designated |
| **Hashing** | Passwords, OTP/proof secrets, token hashes |
| **Tokenization / redaction** | Logs, analytics, AI tool outputs |

## 7.3 Retention, deletion, backup

| Topic | Contract |
|-------|----------|
| **Retention** | Per class in Settings (financial vs KYC vs logs) |
| **Deletion** | Soft delete where 0B allows; compliance erasure anonymizes PII; financial/audit retention overrides casual delete |
| **Backup** | Encrypted backups; access controlled; restore tested; KYC included under same classification |

---

# 8. Audit Architecture

## 8.1 Must-audit categories

Authentication success/failure/lockout · MFA challenges · Permission/role changes · Policy denials (sensitive) · Approval decisions · Workflow transitions on money/stock subjects · Inventory adjustments · Payments/refunds/credit · PO approve/GRN · KYC view/download · Admin settings/secret changes · Feature flag changes affecting payments/AI/ads · Impersonation if ever enabled  

## 8.2 Immutable audit requirements

- Append-only `audit_logs`  
- Include actor, action, entity, before/after (redacted), IP/device, `correlation_id`, `company_id`  
- No update/delete APIs for business users  
- Distinct from debug application logs  

## 8.3 Correlation

All authenticated requests propagate `correlation_id` into audit, outbox events, and security alerts (0D).

---

# 9. API Security

| Control | Contract |
|---------|----------|
| **Authentication** | Session and/or token for humans; service credentials for integrations |
| **Authorization** | Policy on every command/query |
| **Rate limiting** | Per identity, IP, and endpoint class (auth, search, webhooks) |
| **Replay protection** | Nonces/timestamps on signed webhooks; short-lived tokens |
| **Idempotency** | Required keys for payments, GRN, invoice, WF transitions, etc. (0C/0D) |
| **Request validation** | Edge validation before Policy |
| **CSRF** | Required for cookie-session browser mutations |
| **Session security** | Secure cookie attributes (logical), rotation, revoke on privilege change |
| **API keys** | Service accounts only; rotatable; scoped permissions; hashed storage |
| **Webhook verification** | Signature + timestamp + idempotency; company isolation on payload |

No transport syntax prescribed.

---

# 10. File Security (DAM)

| Rule | Contract |
|------|----------|
| **Ownership** | DAM sole file owner (Architecture Law) |
| **Visibility** | `public` \| `authenticated` \| `internal` \| `restricted` |
| **Signed access** | Short-TTL access for non-public objects |
| **Restricted / KYC** | Encryption at rest; `kyc.view` + Policy; audited access |
| **Version history** | Versions immutable; delete soft on asset with retention rules |
| **Deletion** | Soft delete; restricted purge only via compliance process + audit |
| **Derivatives** | Inherit parent visibility class |

---

# 11. Event Security

Aligned with Phase 0D §9:

| Control | Contract |
|---------|----------|
| **Classification** | public / internal / pii / restricted / financial on envelope |
| **Sensitive payloads** | Minimize; KYC by media id reference only |
| **Tenant / company isolation** | Mandatory `company_id`; consumer filter |
| **Branch isolation** | When present, enforce in consumer Policy context |
| **Event authorization** | Broker ACL + consumer identity; **business** authz still Policy on resulting commands |
| **Producer validation** | Only owning service publishes its event types |
| **Consumer validation** | Schema/version check; Inbox dedupe |
| **Replay protection** | Inbox + aggregate guards; financial replays safe |

Event Bus remains **transport only**—not an authorization engine.

---

# 12. Compliance

| Area | Readiness contract |
|------|-------------------|
| **GDPR readiness** | Lawful basis/consent records where marketing; access/export/erase workflows; DPA-ready processing inventory |
| **Consent tracking** | Marketing vs transactional; portfolio reuse consent for before/after media |
| **Data export** | Subject access package (profile, orders, consents)—excludes others’ data and secrets |
| **Data deletion / anonymization** | Erase or irreversibly anonymize PII subject to financial/legal retention holds |
| **Financial record retention** | Invoices, payments, ledgers retained per jurisdiction Settings; immutable |
| **Access logging** | KYC and admin access audited |
| **Audit readiness** | Exportable audit trails with correlation |

Exact legal jurisdiction texts remain business/legal; architecture supplies controls.

---

# 13. Operational Security

| Capability | Contract |
|------------|----------|
| **Monitoring** | Auth failures, lockouts, PolicyDenied rates, DLQ, outbox lag, privilege changes |
| **Alerting** | Threshold breaches to security/ops channels |
| **Intrusion / abuse detection** | Credential stuffing patterns, anomalous admin actions, cross-tenant attempt signals |
| **Failed login detection** | Per account and fleet-wide |
| **Policy denial monitoring** | Spikes and sensitive resource probes |
| **Suspicious behavior** | Unusual refund volume, mass KYC download, role grants |
| **Security dashboards** | Owned by **Reporting** presentation layer; metrics from security/audit events |

---

# 14. Security Validation Checklist

| Check | Result |
|-------|--------|
| Phase 0A Architecture Laws preserved | **Yes** |
| Phase 0B ERD alignment (users, roles, policy, audit, DAM, outbox) | **Yes** |
| Phase 0C Policy-on-every-command/query | **Yes** |
| Phase 0D event security / Notifications consumer-only | **Yes** |
| Workflow = lifecycle SSoT | **Yes** |
| Policy = sole runtime authorization | **Yes** |
| Rules = business calculation engine (not authz) | **Yes** |
| Approval = human decision engine | **Yes** |
| Reporting = presentation owner (incl. security dashboards) | **Yes** |
| DAM = file owner | **Yes** |
| Event Bus = transport only | **Yes** |
| No duplicate authorization systems | **Yes** |
| No duplicate security engines | **Yes** |
| No ownership conflicts with 0C/0D | **Yes** |

---

## Document control

This Phase 0E artifact defines enterprise security **contracts** only. It does not select vendors, frameworks, cipher suites, or protocol syntax. Implementation must satisfy these contracts without introducing a second authorization path or bypassing Workflow, Approval, Rules, DAM, Reporting, or Event Bus ownership laws.

---

PHASE 0E ARTIFACT APPROVED
