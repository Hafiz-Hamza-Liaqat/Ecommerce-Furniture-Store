# @afh/crm-application

Enterprise **CRM Application Services** (Phase 6G).

Seventh executable business module on the Phase 5B application runtime. Orchestrates `@afh/crm` repositories through the shared pipeline — without HTTP or SQL.

Lead scoring, qualification, conversion policy, customer segmentation, and campaign evaluation remain in the **Rules Engine** — handlers only request evaluation.

## Composition

```ts
const crm = createCrmApplication({
  leads, contacts, accounts, activities, communications, campaigns,
  outbox: infrastructure.persistence.outboxStore,
  audit,
  handlers, // optional shared registry
});

const app = createApplicationRuntime({ ..., handlers: crm.handlers });
```

## Commands

Create/Update/Qualify/Convert Lead · Create/Update Contact · Create/Update Account · Log Activity · Record Communication · Create/Update Campaign

## Queries

Lead, Contact, Account, Activity, Communication, Campaign, CRM Summary

## Ownership

| Concern | Owner |
|---------|-------|
| Authorization | Policy only |
| Lifecycle | Workflow |
| Scoring / qualification / segmentation / campaign | Rules Engine |
| Event publish | Outbox only |

## Out of scope

HTTP, SQL/ORM, UI, marketing automation, campaign execution engines, lead scoring engines, Event Bus changes.
