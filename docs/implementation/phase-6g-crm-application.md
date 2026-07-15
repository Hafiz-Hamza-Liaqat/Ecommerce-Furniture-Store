# Phase 6G — CRM Application Services

**Status:** Implemented  
**Package:** `@afh/crm-application`  
**Depends on:** Phase 4C CRM, Phase 5B Application Runtime, Phase 6A–6F pattern  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Seventh executable business application module. CRM command and query handlers register into the Phase 5B `HandlerRegistry` and orchestrate:

- CRM repository interfaces (`@afh/crm`)
- Policy authorization (sole path via pipeline)
- Workflow lifecycle for leads and campaigns
- Rules evaluation for lead scoring, qualification, conversion, segmentation, and campaign evaluation (no inline engines)
- Approval submission for configured qualify/convert gates
- Outbox persistence of domain events where contracts exist
- Security audit on every mutation

No HTTP, SQL, UI, marketing automation, campaign execution engines, or Event Bus changes.

## Package path

`packages/crm-application`

## Composition

```ts
const crmApp = createCrmApplication({
  leads, contacts, accounts, activities, communications, campaigns,
  outbox, audit, handlers,
});
```

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Policy = sole authorization | Every handler provides `authorize()` |
| Workflow = lifecycle SSoT | Lead/campaign create start workflow; transitions for qualify/convert |
| Rules = evaluation engine | Scoring/qualification/conversion/segmentation/campaign via RulesEngine |
| Approval = human decisions | Optional qualify/convert gates; no decide logic |
| Outbox = sole publish path | Events enqueued to OutboxStore |
| Pattern parity with 6A–6F | Same composition and pipeline |

## Events used (existing foundation contracts)

| Command | Event |
|---------|-------|
| CreateLead | `crm.lead.created` |
| CreateContact | `crm.contact.created` |
| ConvertLead (with opportunityId) | `crm.opportunity.linked` |
| LogActivity | `crm.activity.logged` |
| CreateCampaign | `crm.campaign.created` |
| Update Lead/Contact/Account/Campaign, Qualify Lead, Record Communication, Convert without opportunity | Audit only (or no additional foundation event) |

## Explicit non-goals

SQL/ORM, HTTP/REST/GraphQL, controllers, UI, marketing automation, campaign execution engines, lead scoring engines, Event Bus/Workflow/Rules/Policy/Approval engine changes, reporting, search, notifications.

## Related

- [Phase 4C CRM](./phase-4c-crm.md)
- [Phase 6F Service Application](./phase-6f-service-application.md)
- [Phase 5B Application Runtime](./phase-5b-application-runtime.md)
