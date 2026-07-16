import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, PageHeader } from "../components/ui";
import { EmptyState, StatusBadge, Tabs } from "../workspace/widgets";
import { useWorkspaceUi } from "../workspace/context";
import { APPROVALS_PREVIEW, ACTIVITY } from "../workspace/data";

type ApprovalItem = {
  readonly id: string;
  readonly title: string;
  readonly owner: string;
  readonly due: string;
  status: "pending" | "approved" | "rejected";
};

type WorkflowItem = {
  readonly id: string;
  readonly title: string;
  readonly module: string;
  readonly assignee: string;
  readonly status: "draft" | "in_progress" | "waiting" | "completed";
  readonly updated: string;
};

const WORKFLOW_SEED: readonly WorkflowItem[] = [
  {
    id: "wf-1",
    title: "SO-22901 fulfillment",
    module: "Sales",
    assignee: "Ops desk",
    status: "in_progress",
    updated: "34 min ago",
  },
  {
    id: "wf-2",
    title: "PO-10482 procurement",
    module: "Procurement",
    assignee: "Buyer team",
    status: "waiting",
    updated: "12 min ago",
  },
  {
    id: "wf-3",
    title: "SR-441 site visit",
    module: "Service",
    assignee: "Field tech",
    status: "in_progress",
    updated: "1 h ago",
  },
  {
    id: "wf-4",
    title: "Journal period close",
    module: "Finance",
    assignee: "Controller",
    status: "draft",
    updated: "Yesterday",
  },
];

function toneFor(status: string): "ok" | "warn" | "danger" | "neutral" {
  if (status === "approved" || status === "completed") return "ok";
  if (status === "pending" || status === "waiting" || status === "in_progress") return "warn";
  if (status === "rejected") return "danger";
  return "neutral";
}

export function WorkflowPage() {
  const [tab, setTab] = useState("active");
  const items = WORKFLOW_SEED;
  const filtered = items.filter((w) => {
    if (tab === "active") return w.status === "in_progress" || w.status === "waiting";
    if (tab === "draft") return w.status === "draft";
    if (tab === "done") return w.status === "completed";
    return true;
  });

  return (
    <div className="stack">
      <PageHeader
        title="Workflow"
        lead="Lifecycle status, history, and assignments. Transitions remain server-side — this screen displays and navigates only."
        actions={
          <Link className="btn btn--ghost" to="/app/approvals">
            Approvals queue
          </Link>
        }
      />
      <Alert tone="info" title="Engine boundary">
        Workflow rules and transitions are not executed in the browser. Use module records and Approval decisions for
        actions.
      </Alert>
      <Tabs
        tabs={[
          { id: "active", label: "Active" },
          { id: "draft", label: "Draft" },
          { id: "all", label: "All" },
          { id: "history", label: "History" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "history" ? (
        <section className="ws-card">
          <header className="ws-card__head">
            <h2>Recent activity</h2>
          </header>
          <ul className="ws-feed">
            {ACTIVITY.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong>
                <span>{a.meta}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : filtered.length === 0 ? (
        <EmptyState title="No workflow items" body="No items match this filter." />
      ) : (
        <ul className="ws-feed">
          {filtered.map((w) => (
            <li key={w.id}>
              <div>
                <strong>{w.title}</strong>
                <span>
                  {w.module} · {w.assignee} · {w.updated}
                </span>
              </div>
              <StatusBadge status={w.status.replace("_", " ")} tone={toneFor(w.status)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ApprovalsPage() {
  const { toast } = useWorkspaceUi();
  const [items, setItems] = useState<ApprovalItem[]>(() =>
    APPROVALS_PREVIEW.map((a) => ({ ...a, status: "pending" as const })),
  );
  const pending = useMemo(() => items.filter((i) => i.status === "pending"), [items]);

  function decide(id: string, status: "approved" | "rejected") {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    toast({
      tone: status === "approved" ? "ok" : "warn",
      title: status === "approved" ? "Approved" : "Rejected",
      body: "Decision recorded in UI — submit through Approval commands when wired to live queues.",
    });
  }

  return (
    <div className="stack">
      <PageHeader
        title="Approvals"
        lead="Pending decisions and history. Approval engine stays on the backend; this queue is the operator surface."
        actions={
          <Link className="btn btn--ghost" to="/app/workflow">
            Workflow
          </Link>
        }
      />
      <Alert tone="info" title={`${pending.length} pending`}>
        Decisions here update the local queue view. Production decisions must go through Approval commands — no local
        approval rules.
      </Alert>
      {items.length === 0 ? (
        <EmptyState title="No approvals" body="Queue is empty." />
      ) : (
        <ul className="ws-feed">
          {items.map((a) => (
            <li key={a.id}>
              <div>
                <strong>{a.title}</strong>
                <span>
                  {a.owner} · Due {a.due}
                </span>
              </div>
              <div className="row" style={{ gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                <StatusBadge status={a.status} tone={toneFor(a.status)} />
                {a.status === "pending" ? (
                  <>
                    <Button variant="primary" onClick={() => decide(a.id, "approved")}>
                      Approve
                    </Button>
                    <Button variant="danger" onClick={() => decide(a.id, "rejected")}>
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
