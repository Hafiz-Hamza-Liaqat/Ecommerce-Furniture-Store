# Architecture Decision Register (ADR Index)

**Rule:** New architectural change requires a new ADR. Status values: Accepted | Deferred | Rejected | Superseded.

Canonical business decision IDs D01–D36 originated in Phase 0A Decision Register. Integration/security/ops decisions from 0B–0F are included below.

---

## Register

| Decision ID | Decision | Status | Reason | Impact | Dependencies |
|-------------|----------|--------|--------|--------|--------------|
| D01 | v1 = single operating company; schema multi-company-ready via `company_id` | Accepted | SaaS readiness without multi-tenant ops in v1 | All tenant tables | 0A, 0B |
| D02 | Tenancy = shared DB + `company_id` + Policy row filters | Accepted | Simpler v1 ops | Isolation model | D01, 0E |
| D03 | Multi-branch / multi-location from day one | Accepted | Two showrooms today; N later | Branch/Location model | 0B |
| D04 | Workflow Engine = SSoT for business status; entity status = projection | Accepted | Avoid dual lifecycle models | All long-running entities | 0A Law |
| D05 | Governance roles SA/Admin/Moderator/Editor in canonical role set | Accepted | CMS and ops governance | RBAC seeds | 0A, 0E |
| D06 | Shop/Wholesaler = Organization types + PriceList tiers | Accepted | Avoid permission engine explosion | Org model | 0A, 0B |
| D07 | Payment gateway provider selection | Deferred | Extensible payment model | Payment provider config | 0B, 0C |
| D08 | Online card MVP vs bank/advance-first | Deferred | Feature flag `online_payments` | Checkout path | D07 |
| D09 | Google AdSense | Deferred | Flag off by default | Ads module optional | 0B CMS |
| D10 | Custom in-platform ads via SA/Admin/Moderator | Accepted | House promotions | AdCampaign entities | 0B, 0E |
| D11 | Loyalty program launch timing | Deferred | Model allowed; flag off | Loyalty tables | 0B |
| D12 | Procurement entities in domain model; build phased | Accepted | Manufacturing needs materials | PR/PO/GRN | 0B, 0C |
| D13 | Full statutory GL in-app | Deferred | Management accounting in v1 | Finance depth | 0B |
| D14 | Public CMS pages capability | Accepted | Exact IA in UI phase | CMS | 0B |
| D15 | Mobile-first: Delivery + Installation first | Accepted | Field operations | Work order UX | 0C |
| D16 | AI modules reserved behind flags | Accepted | Architecture now, build later | AI stubs | 0B, 0C |
| D17 | Versioned internal API; public portal later | Accepted | Stable contracts | `/api/v1` logical | 0C |
| D18 | Commission formulas | Deferred | Rules Engine owns values later | Commission ledger | Rules |
| D19 | Multi-partner attribution rules | Deferred | Extensible attribution | attributions | Rules |
| D20 | Advance payment percentage | Deferred | Configurable via Rules/Settings | Order WF | Rules |
| D21 | Default warranty periods by category | Deferred | Rules/Settings | Warranty | Rules |
| D22 | Default language (v1 primary locale) | Deferred | locale field supported | i18n | Settings |
| D23 | Default currency (v1) | Deferred | currency_code supported | Pricing | Settings |
| D24 | Labor costing hourly vs flat | Deferred | CostSheet lines support either | Costing | 0B |
| D25 | Help Center CMS vs tickets | Deferred | CMS Help capability approved | Support | CMS |
| D26 | Offline field photo upload in v1 | Deferred | Online upload required | Mobile | DAM |
| D27 | Required launch PDF checklist | Deferred | Generation path locked | Documents | Reporting+DAM |
| D28 | Exact footer link inventory | Deferred | Finalize in UI IA | CMS/nav | D14 |
| D29 | Recommendation seeding manual vs history | Deferred | ProductRelation supports both | Recommendations | Commerce |
| D30 | In-app expense entry | Deferred | Optional later | Finance | D13 |
| D31 | MFA mandate timing for SA/Admin | Deferred | Architecture supports MFA | Auth | 0E |
| D32 | Marketplace / franchise modules | Rejected | Out of Phase 0A scope; flags reserved off | — | Flags |
| D33 | Hard-coded single-tenant queries | Rejected | Breaks D01 | — | D01 |
| D34 | Parallel domain status state machines | Rejected | Violates Workflow SSoT | — | D04 |
| D35 | Runtime authz via ad-hoc checks bypassing Policy | Rejected | Violates Policy law | — | 0A, 0E |
| D36 | Separate RBAC roles for Carpenter/Painter/Polisher | Rejected | Employee + Team model | Teams | 0A |
| D37 | Modular monolith first; extract later | Accepted | Delivery speed with boundaries | Deploy shape | 0A |
| D38 | Outbox in producer TX; Inbox for consumers | Accepted | Reliable integration | 0B tables, 0D | 0D |
| D39 | Sagas orchestrate cross-aggregate; Workflow owns stage | Accepted | Clear separation | 0D | D04 |
| D40 | Document generation = Reporting + Templates + DAM | Accepted | No separate doc engine | 0A patch | 0A |
| D41 | Domain metrics vs Reporting presentation split | Accepted | Avoid duplicate export stacks | 0A, 0F | 0A |
| D42 | Notifications = Event Bus consumers + Settings templates | Accepted | No domain→channel bypass | 0A, 0D | 0A |
| D43 | Zero Trust + Policy on every command/query | Accepted | Enterprise security | 0E | 0A |
| D44 | Observability does not create business engines | Accepted | Keep kernel purity | 0F | 0A |
| [D45](./ADR-D45-record-authorization-load-before-authorize.md) | Record-level authorization via load-before-authorize; persisted owner/org/branch feed Policy; fail-closed on unresolved context | Accepted | RC5.5 record security without spoofable payload scope data | Handler authorize() for record-targeting CQRS | D02, D35, D43, RC5.5 |
| [D46](./ADR-D46-policy-filtered-list-results.md) | Query/list results Policy-filtered per row; collection gate uses principal scope hints; bounded in-process evaluation; fail-closed | Accepted | RC5.7 list filtering without a second authorization authority | Collection-bearing query handlers | D02, D35, D43, D45, RC5.7 |

---

## Related

- [Phase 0A Decision Register (full narrative)](../00-foundation/phase-0a-enterprise-architecture-laws.md#section-b--decision-register-expanded)
- [Master Index](../README.md)
- [Freeze](../00-foundation/ARCHITECTURE-FREEZE.md)
