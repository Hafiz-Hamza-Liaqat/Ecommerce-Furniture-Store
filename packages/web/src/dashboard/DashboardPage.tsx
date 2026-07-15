import {
  ActivityFeed,
  ChartCard,
  DashboardGrid,
  SummaryWidget,
} from "../dashboard/framework";
import { PageHeader } from "../components/ui";

export function DashboardPage() {
  return (
    <DashboardGrid>
      <PageHeader
        title="Operations overview"
        lead="Presentation dashboard. Metrics and reports are loaded from backend Reporting APIs — no client-side calculation engine."
      />
      <div className="grid-cards">
        <SummaryWidget label="Open orders" value="—" hint="From Reporting query" />
        <SummaryWidget label="Pending approvals" value="—" hint="From Approval queue" />
        <SummaryWidget label="Stock alerts" value="—" hint="From Inventory query" />
        <SummaryWidget label="Service SLAs" value="—" hint="From Service query" />
      </div>
      <div className="module-workspace__grid">
        <ChartCard
          title="Throughput"
          caption="Chart rendered from Reporting snapshots"
        />
        <ActivityFeed
          items={[
            {
              id: "1",
              title: "Awaiting backend activity feed",
              meta: "Notifications / audit stream via API",
            },
            {
              id: "2",
              title: "Policy decisions stay server-side",
              meta: "UI never authorizes",
            },
          ]}
        />
      </div>
    </DashboardGrid>
  );
}
