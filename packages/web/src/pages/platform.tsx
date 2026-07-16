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
