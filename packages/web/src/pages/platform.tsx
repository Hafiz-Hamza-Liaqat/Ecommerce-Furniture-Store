import { EmptyState, PageHeader } from "../components/ui";

export function WorkflowPage() {
  return (
    <div className="stack">
      <PageHeader
        title="Workflow"
        lead="Display status, history, assignments from backend Workflow. The engine remains server-side."
      />
      <EmptyState
        title="Lifecycle views"
        body="Bind this screen to Workflow status/history queries when exposed. UI never transitions aggregates locally."
      />
    </div>
  );
}

export function ApprovalsPage() {
  return (
    <div className="stack">
      <PageHeader
        title="Approvals"
        lead="Approval queues and decision submission. Approval engine stays on the backend."
      />
      <EmptyState
        title="Pending decisions"
        body="Load queues via Approval queries and submit decisions through commands — no local approval rules."
      />
    </div>
  );
}

export function SearchPage() {
  return (
    <div className="stack">
      <PageHeader
        title="Search"
        lead="Search results from backend Search APIs. No client indexing."
      />
      <EmptyState
        title="Enterprise search"
        body="Wire the search box to Search query endpoints. Indexing and ranking remain server-owned."
      />
    </div>
  );
}

export function ReportingPage() {
  return (
    <div className="stack">
      <PageHeader
        title="Reporting"
        lead="Render dashboards and reports provided by Reporting. No client-side reporting engine."
      />
      <EmptyState
        title="Report gallery"
        body="Embed Reporting snapshots and exports via API responses only."
      />
    </div>
  );
}

export function NotificationsPage() {
  return (
    <div className="stack">
      <PageHeader
        title="Notifications"
        lead="Inbox presentation. Delivery transport remains backend Notifications."
      />
      <EmptyState
        title="Notification center"
        body="List and mark notifications through Queries/Commands. No SMTP/SMS from the browser."
      />
    </div>
  );
}
