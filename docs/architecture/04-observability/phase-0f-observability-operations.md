# Phase 0F — Enterprise Observability, Monitoring, Logging, Diagnostics & Operations Architecture

**Role:** Principal Enterprise Platform & Observability Architect  
**Mode:** Documentation only · Technology-agnostic · No code · No SQL · No frameworks · No transport syntax · No redesign  
**Depends on:** Phase 0A FROZEN · Phase 0B–0E APPROVED  
**Status:** PHASE 0F ARTIFACT APPROVED  
**Cross-references:** [Master Index](../README.md) · [0A Laws](../00-foundation/phase-0a-enterprise-architecture-laws.md) · [0B Data](../01-domain/phase-0b-enterprise-data-architecture.md) · [0C Services](../01-domain/phase-0c-enterprise-domain-service-architecture.md) · [0D Integration](../02-integration/phase-0d-event-bus-integration-saga.md) · [0E Security](../03-security/phase-0e-enterprise-security-architecture.md) · [Glossary](../glossary.md) · [ADR Index](../decision-records/ADR-INDEX.md)

---

# 1. Observability Principles

| Principle | Contract |
|-----------|----------|
| **Observability vs monitoring** | **Monitoring** watches known signals and thresholds. **Observability** enables asking new questions from logs, metrics, and traces during novel failures. Both are required. |
| **Golden signals** | Latency, traffic, errors, saturation—for every externally relevant service and critical dependency. |
| **Operational visibility** | Operators can see health of APIs, workflows, sagas, outbox/inbox, queues, stock/money paths, and security signals without reading source code. |
| **End-to-end traceability** | A single customer or staff action is reconstructable across services, workflow transitions, events, and notifications via correlation. |
| **Correlation IDs** | Every request carries `correlation_id`; derived work (events, saga steps, audits) inherits it. Aligns with Phase 0D/0E. |
| **Structured telemetry** | Logs/metrics/traces use structured fields (`company_id`, `service`, `event_type`, `aggregate_id`, outcome)—not free-text-only logging. |
| **No new business engines** | Observability does not authorize, price, transition workflows, or own files/reports. It **observes** Policy, Rules, Workflow, Approval, DAM, Reporting, and the Event Bus. |

**Telemetry ownership:** Domains emit metrics/events; **Reporting** owns operational/executive **dashboards** (presentation); platform ops owns collectors/pipelines and alert routing.

---

# 2. Logging Architecture

## 2.1 Log classes

| Class | Purpose | Mutability |
|-------|---------|------------|
| **Application logs** | Diagnostics, errors, debug | Rotated; not system of record |
| **Audit logs** | Business/security evidence (0B/0E) | **Immutable append-only** |
| **Security logs** | Authn failures, lockouts, PolicyDenied, privilege changes | High retention; restricted access |
| **Workflow logs** | Transitions, guard failures, assignment changes (also in workflow tables) | Durable; correlate to instances |
| **Integration logs** | Sync command outcomes to Inventory/Payments/etc. | Retain for incident RCA |
| **Event Bus logs** | Publish/consume/retry/DLQ | Ops + integration RCA |
| **AI logs** | Job start/fail/latency; prompt/response **redacted** | Restricted; no secrets/PII dumps |
| **Infrastructure logs** | Hosts, containers, DB, network | Platform retention |

## 2.2 Levels

`DEBUG` (non-prod / sampled) · `INFO` · `WARN` · `ERROR` · `FATAL`  

Production default: INFO+; DEBUG only with guarded, time-boxed enablement.

## 2.3 Retention (logical defaults; Settings-adjustable)

| Class | Retention posture |
|-------|-------------------|
| Application | Short–medium |
| Security / Audit | Long (compliance-aligned with 0E) |
| Financial-adjacent audit | Longest |
| Event Bus / integration | Medium |
| AI | Medium; redacted |
| Infrastructure | Medium |

## 2.4 Sensitive data redaction

**Never log:** passwords, session tokens, API keys, raw card data, OTP secrets, raw CNIC/tax document contents, unrestricted KYC payloads.  
**Redact/tokenize:** email/phone/address in application logs where not required; full detail belongs in audited business stores with Policy access.  
Event payload logging follows Phase 0D sensitivity classification.

---

# 3. Metrics Architecture

*Domain modules own **metric definitions**; pipelines record **snapshots/time series**; Reporting presents dashboards/widgets.*

## 3.1 Business metrics

Orders placed/cancelled · GMV/net revenue · quote conversion · AOV · B2B vs B2C mix · project completions · service request volume · commission accrued/paid · refund rate  

## 3.2 Technical metrics

Request rate · error rate · latency percentiles (P50/P95/P99) · dependency error rate · saturation (CPU, memory, pool wait)  

## 3.3 Infrastructure metrics

Node/container health · DB connections · disk · network · backup success  

## 3.4 Workflow metrics

Transitions/sec · time-in-stage · SLA breach count · illegal transition attempts · stuck instances (no progress beyond threshold)  

## 3.5 Inventory metrics

Reserve/release rate · adjust rate · stockout/low-stock events · transfer latency · ledger write failures  

## 3.6 Financial metrics

Payment success/fail · capture latency · refund success · invoice issue rate · outbox lag on financial events  

## 3.7 Queue / Event metrics

Outbox pending age · publish rate · consumer lag · retry count · DLQ depth/age · duplicate suppressions (inbox)  

## 3.8 API metrics

Per-resource latency/errors · auth failure rate · rate-limit hits · idempotency conflict rate  

## 3.9 AI metrics

Job volume · success/fail · latency · tool authorization denials · flag-disabled short-circuits  

## 3.10 Search / Reporting metrics

Index lag · query latency · report run duration/fail · schedule miss  

---

# 4. Distributed Tracing

| Concept | Contract |
|---------|----------|
| **Request lifecycle** | Edge → Policy → Application Service → Rules/Workflow/Approval/Inventory as applicable → Outbox commit → response |
| **correlation_id** | Business journey id (user or saga); stable across async hops |
| **trace_id / span_id** | Technical distributed trace; one trace may cover sync path; async consumers continue with linked spans via envelope ids |
| **Span relationships** | Parent span = caller; child = dependency (DB, Rules, Workflow, bus publish) |
| **Cross-service tracing** | Every service boundary propagates correlation + trace context |
| **Event tracing** | Outbox publish and consumer handle spans reference `event_id`, `causation_id` |
| **Workflow tracing** | `TransitionWorkflow` spans include `instance_id`, `from_stage`, `to_stage` |
| **Saga tracing** | Saga step spans share `correlation_id` / `saga_id`; compensations are distinct spans linked by causation |

Traces are diagnostic; they do not replace audit logs for compliance evidence.

---

# 5. Monitoring Architecture

| Surface | What is watched |
|---------|-----------------|
| **API** | Golden signals, 4xx/5xx mix, auth storms, idempotency conflicts |
| **Database** | Latency, errors, connection saturation, lock waits, storage |
| **Event Bus** | Publish failures, consumer lag, DLQ, poison rate |
| **Workflow** | Stuck instances, transition errors, Approval-blocked aging |
| **Queue / Outbox / Inbox** | Pending age, failed status, duplicate rates |
| **Security** | Failed logins, lockouts, PolicyDenied spikes, privilege changes, KYC access anomalies (0E) |
| **Search** | Index lag, query errors/latency |
| **Reporting** | Failed runs, schedule misses, dashboard query latency |
| **AI** | Provider errors, circuit-open, latency SLO breaches |
| **Inventory / Financial paths** | Reserve fail rate, payment fail rate, ledger write errors |

Monitoring **detects**; Policy/Workflow/Rules **decide** business outcomes.

---

# 6. Alerting Architecture

## 6.1 Severity

| Severity | Examples |
|----------|----------|
| **Critical** | Payment processing down; outbox stalled; DLQ financial flood; data-loss risk; auth complete outage; Workflow engine unavailable |
| **Warning** | Elevated latency; consumer lag; approaching disk; SLA stage breaches rising |
| **Financial** | Payment failure spike; refund failure; commission clawback failure; duplicate payment conflict surge |
| **Inventory** | Reserve failure spike; low-stock storm; ledger write failures |
| **Workflow** | Stuck saga/order instances; transition failure spike |
| **Event** | DLQ depth/age; publish retry exhaustion |
| **Security** | Credential stuffing; PolicyDenied on KYC/admin; mass role grants |
| **Infrastructure** | Node loss; DB failover; backup failure |

## 6.2 Escalation

1. On-call platform / ops  
2. Domain owner (Sales/Inventory/Finance) for business-path alerts  
3. Security for security class  
4. Executive notify for prolonged critical customer-impact  

Alerts include `correlation_id` samples, service, company scope (no cross-tenant leakage), and runbook reference. Alert **routing** is ops config; alert **dashboards** are Reporting-presented where applicable.

---

# 7. Health Architecture

| Probe | Meaning |
|-------|---------|
| **Liveness** | Process should be restarted if failing |
| **Readiness** | Safe to receive traffic (deps reachable enough) |
| **Startup validation** | Config/secrets present; migrations/compatibility gate; feature flag service reachable |
| **Service health** | App + critical sync deps (identity store, primary DB) |
| **Dependency health** | Bus, search, payment provider, SMS—reported separately for degraded mode |
| **Degraded mode** | Non-critical features shed (AI, non-urgent notifications, heavy reports); core order/stock/payment path preferred |
| **Maintenance mode** | Controlled reject/queue of mutations; read-only where safe; banner via Settings/CMS |

Health endpoints never expose secrets or detailed internals to public callers.

---

# 8. Diagnostics

| Activity | Method |
|----------|--------|
| **Incident investigation** | Timeline via correlation_id across logs, traces, audit, events |
| **Root cause analysis** | Fault tree: edge → Policy → app → deps → bus → consumer |
| **Correlation search** | Search by correlation_id, event_id, order_id, workflow instance_id, payment idempotency key |
| **Replay diagnostics** | Inspect outbox/DLQ; validate Inbox would no-op; **financial replay only under controlled runbooks** (0D) |
| **Workflow diagnostics** | Instance history, allowed transitions, Approval blockers, time-in-stage |
| **Event diagnostics** | Producer payload version, consumer lag, retry cause, poison reason |
| **Performance diagnostics** | Trace spans, slow queries, queue delay, Rules/Workflow hotspots |

Diagnostics tooling must enforce Phase 0E access (company isolation, least privilege).

---

# 9. Operational Dashboards

*All dashboards are **Reporting Framework** presentation (Phase 0A/0C). Metrics sourced from domain/platform telemetry.*

| Dashboard | Audience | Content |
|-----------|----------|---------|
| **Executive** | Leadership | Revenue, orders, fulfillment health summary, major incidents |
| **Operations** | Ops/on-call | Golden signals, bus/outbox, error budgets, degraded flags |
| **Security** | Security/Admin | Auth failures, PolicyDenied, privilege changes, KYC access |
| **Finance** | Finance | Payments, refunds, AR signals, financial event failures |
| **Inventory** | Warehouse/ops | Stock movements, low stock, reserve failures, transfers |
| **Workflow** | Ops/Production | Stage WIP, SLA breaches, stuck instances |
| **Infrastructure** | Platform | Saturation, DB, storage, backups |
| **AI** | Platform/Product | Job volume, failures, latency, flag state |

Role-scoped via Policy (0E); Super Admin/Admin see wider scope than branch managers.

---

# 10. Performance Monitoring

| Area | Signals |
|------|---------|
| **API latency** | P95/P99 per resource class; checkout/payment separate SLOs |
| **Database latency** | Query/transaction time; pool wait |
| **Event latency** | Time in outbox → bus → consumer handle complete |
| **Workflow duration** | End-to-end stage and full instance duration |
| **Queue delays** | Outbox age; consumer lag |
| **Search performance** | Query P95; index freshness lag |
| **Report generation** | Run duration; timeout rate |
| **AI processing** | Queue wait + provider time |

**SLO posture (logical targets to finalize in implementation Settings):** e.g. core read APIs fast; payment/reserve path prioritized; async paths measured by lag SLO not user RTT.

---

# 11. Capacity Planning

| Indicator | Watch for |
|-----------|-----------|
| **Scaling** | CPU/RPS/error correlation; consumer lag under load |
| **Queue growth** | Sustained outbox/DLQ growth ⇒ scale consumers or shed load |
| **Storage growth** | DB size, WAL, backup windows |
| **Media growth** | DAM object count/bytes (product + proofs + KYC) |
| **Audit growth** | Partition/archive plan (0B) |
| **Reporting growth** | Snapshot/report artifact storage |
| **Event throughput** | Events/sec peak vs consumer capacity |
| **Database capacity** | Connections, IOPS, index bloat, multi-branch data growth |

Capacity plans must preserve `company_id` isolation and not assume single-branch sizing.

---

# 12. Incident Response

| Phase | Contract |
|-------|----------|
| **Detection** | Alerts, health fails, user reports, security signals |
| **Classification** | Severity + domain (finance, inventory, security, platform) |
| **Escalation** | Per §6.2; page on-call; involve domain owners |
| **Resolution** | Mitigate (degrade/maintenance), fix, verify with correlation traces |
| **Communication** | Internal status; customer comms via approved channels (Notifications templates—not ad-hoc from ops bypassing Policy for PII) |
| **Postmortem** | Blameless RCA; actions; update runbooks/alerts |
| **Audit trail** | Incident record + linked correlation_ids + admin actions audited |

---

# 13. Operational Compliance

| Topic | Contract |
|-------|----------|
| **Log retention** | Per class (§2.3); Settings-governed |
| **Audit retention** | Per Phase 0E financial/security requirements |
| **Monitoring / metrics retention** | Sufficient for SLO review and capacity trends; high-cardinality limited |
| **Dashboard ownership** | **Reporting** owns definitions/widgets; platform owns telemetry pipeline |
| **Incident records** | Retained for ops/compliance review; access restricted |

Observability data containing PII follows Phase 0E redaction and access rules.

---

# 14. Validation Checklist

| Check | Result |
|-------|--------|
| Phase 0A Architecture Laws preserved | **Yes** |
| Phase 0B ERD (audit, outbox, metrics/report tables) aligned | **Yes** |
| Phase 0C service boundaries (emit vs present) aligned | **Yes** |
| Phase 0D Event Bus / saga / DLQ observability aligned | **Yes** |
| Phase 0E security logging, PolicyDenied, redaction aligned | **Yes** |
| Workflow = lifecycle SSoT | **Yes** — observed, not replaced |
| Policy = runtime authorization | **Yes** — observed, not replaced |
| Rules = calculation engine | **Yes** |
| Approval = human decision engine | **Yes** |
| Reporting = presentation owner (dashboards) | **Yes** |
| DAM = file owner | **Yes** |
| Event Bus = transport only | **Yes** |
| Observability introduces no duplicate business engines | **Yes** |
| No ownership conflicts | **Yes** |

---

## Document control

Phase 0F defines how the ERP is **seen, operated, and diagnosed** in production. It does not select vendors (APM, SIEM, pager) or prescribe protocols. Implementation must emit correlatable telemetry, honor redaction and tenancy, and route presentation through Reporting without creating a second authorization, workflow, or notification engine.

---

**Architecture phase gate:** With Phase 0F complete, pre-implementation architecture pack is **0A–0F closed**. Implementation phases may begin only under the frozen laws and approved artifacts.

---

PHASE 0F ARTIFACT APPROVED
