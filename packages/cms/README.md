# @afh/cms

Enterprise **CMS & Content Management Foundation** (Phase 4F).

Reusable content, navigation, taxonomy, versioning, SEO, and localization contracts. No rendering, publishing engines, or search indexing.

Depends on: `@afh/shared-kernel`

## Ownership boundaries

| Concern | Owner |
|---------|--------|
| Content lifecycle | Workflow (status is metadata only) |
| Files / media | DAM |
| Presentation / dashboards | Reporting |
| Indexing | Search |
| Delivery | Notifications |
| Authorization | Policy |

## Usage

```ts
import { createCmsFoundation } from "@afh/cms";

const cms = createCmsFoundation();
```

## Out of scope

Publishing/rendering engines, search indexing, notification delivery, Event Bus, HTTP/UI, SQL/ORM, AI content generation.
