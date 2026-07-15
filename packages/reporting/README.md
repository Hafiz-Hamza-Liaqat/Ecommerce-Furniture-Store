# @afh/reporting

Enterprise **Reporting Foundation** (Phase 3F).

Presentation-owner contracts for reports, dashboards, snapshots, and export requests. Domains emit metrics; Reporting owns presentation (Phase 0A).

Depends on: `@afh/shared-kernel`

## Usage

```ts
import { createReportingFoundation } from "@afh/reporting";

const reporting = createReportingFoundation();
```

## Out of scope

Charts, PDF/Excel generation, BI tools, SQL, workers, HTTP/UI, Event Bus publishers.
