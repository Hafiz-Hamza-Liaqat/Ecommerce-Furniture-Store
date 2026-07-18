/**
 * Workflow & Approvals operator surfaces (RC6.3).
 * Presentation-only: loads via RC6.2 CQRS; Policy Engine remains sole authz.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClientError } from "../api/types";
import { Alert, Button, PageHeader } from "../components/ui";
import { useSession } from "../state/session";
import { useWorkspaceUi } from "../workspace/context";
import { EmptyState, Skeleton, StatusBadge, Tabs } from "../workspace/widgets";

type WorkflowDefinitionRow = {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly entityType: string;
  readonly version: number;
  readonly isActive: boolean;
};

type WorkflowInstanceRow = {
  readonly id: string;
  readonly workflowDefinitionId: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly statusProjection: string;
  readonly instanceStatus: "running" | "completed" | "cancelled";
  readonly startedAt: string;
  readonly stageEnteredAt: string;
  readonly completedAt: string | null;
};

type WorkflowTransitionRow = {
  readonly id: string;
  readonly code: string;
  readonly fromStageId: string;
  readonly toStageId: string;
  readonly requiresApprovalType: string | null;
};

type WorkflowTaskRow = {
  readonly id: string;
  readonly stageId: string;
  readonly teamId: string | null;
  readonly userId: string | null;
  readonly assignedAt: string;
};

type ApprovalRequestRow = {
  readonly id: string;
  readonly type: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly status:
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected"
    | "changes_requested";
  readonly submittedByUserId: string;
  readonly reviewerUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly decisionReason: string | null;
};

function toneFor(status: string): "ok" | "warn" | "danger" | "neutral" {
  if (
    status === "approved" ||
    status === "completed" ||
    status === "active"
  ) {
    return "ok";
  }
  if (
    status === "pending" ||
    status === "submitted" ||
    status === "under_review" ||
    status === "running" ||
    status === "waiting" ||
    status === "in_progress"
  ) {
    return "warn";
  }
  if (status === "rejected" || status === "cancelled") return "danger";
  return "neutral";
}

function formatApiError(err: unknown): { message: string; forbidden: boolean } {
  if (err instanceof ApiClientError) {
    const forbidden =
      err.status === 403 ||
      err.category === "authorization" ||
      err.code.includes("forbidden") ||
      err.code.includes("denied");
    return {
      forbidden,
      message: forbidden
        ? `Forbidden by Policy (${err.code}) — backend remains sole authorization authority.`
        : `${err.message} (${err.code})`,
    };
  }
  return { message: "Request failed", forbidden: false };
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function isOpenApproval(status: ApprovalRequestRow["status"]): boolean {
  return status === "submitted" || status === "under_review";
}

export function WorkflowPage() {
  const { api, user, setLastCorrelationId } = useSession();
  const [tab, setTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [listsUnavailable, setListsUnavailable] = useState(false);
  const [definitions, setDefinitions] = useState<readonly WorkflowDefinitionRow[]>(
    [],
  );
  const [instances, setInstances] = useState<readonly WorkflowInstanceRow[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    null,
  );
  const [transitions, setTransitions] = useState<readonly WorkflowTransitionRow[]>(
    [],
  );
  const [tasks, setTasks] = useState<readonly WorkflowTaskRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const companyId = user?.companyId ?? null;
  const definitionById = useMemo(() => {
    const map = new Map<string, WorkflowDefinitionRow>();
    for (const d of definitions) map.set(d.id, d);
    return map;
  }, [definitions]);

  const loadLists = useCallback(async () => {
    if (!companyId) {
      setDefinitions([]);
      setInstances([]);
      setLoading(false);
      setError("Company-scoped session required for workflow operator queries.");
      setForbidden(false);
      setListsUnavailable(true);
      return;
    }
    setLoading(true);
    setError(null);
    setForbidden(false);
    setListsUnavailable(false);

    const errors: string[] = [];
    let anyForbidden = false;

    const [defsOutcome, instOutcome] = await Promise.all([
      api
        .dispatchQuery<readonly WorkflowDefinitionRow[]>({
          queryType: "workflow.ListDefinitions",
          payload: { companyId, activeOnly: false },
        })
        .then((res) => ({ ok: true as const, res }))
        .catch((err: unknown) => ({ ok: false as const, err })),
      api
        .dispatchQuery<readonly WorkflowInstanceRow[]>({
          queryType: "workflow.ListInstances",
          payload: { companyId },
        })
        .then((res) => ({ ok: true as const, res }))
        .catch((err: unknown) => ({ ok: false as const, err })),
    ]);

    if (defsOutcome.ok) {
      setLastCorrelationId(defsOutcome.res.correlationId);
      setDefinitions(defsOutcome.res.data ?? []);
    } else {
      const formatted = formatApiError(defsOutcome.err);
      if (defsOutcome.err instanceof ApiClientError) {
        setLastCorrelationId(defsOutcome.err.correlationId);
      }
      anyForbidden ||= formatted.forbidden;
      errors.push(`Definitions: ${formatted.message}`);
      setDefinitions([]);
    }

    if (instOutcome.ok) {
      setLastCorrelationId(instOutcome.res.correlationId);
      setInstances(instOutcome.res.data ?? []);
    } else {
      const formatted = formatApiError(instOutcome.err);
      if (instOutcome.err instanceof ApiClientError) {
        setLastCorrelationId(instOutcome.err.correlationId);
      }
      anyForbidden ||= formatted.forbidden;
      errors.push(`Instances: ${formatted.message}`);
      setInstances([]);
    }

    setForbidden(anyForbidden);
    setListsUnavailable(!defsOutcome.ok && !instOutcome.ok);
    setError(errors.length > 0 ? errors.join(" ") : null);
    setLoading(false);
  }, [api, companyId, setLastCorrelationId]);

  useEffect(() => {
    void loadLists();
  }, [loadLists, reloadToken]);
  useEffect(() => {
    if (!companyId || !selectedInstanceId) {
      setTransitions([]);
      setTasks([]);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const [trRes, taskRes] = await Promise.all([
          api.dispatchQuery<readonly WorkflowTransitionRow[]>({
            queryType: "workflow.ListAvailableTransitions",
            payload: { companyId, instanceId: selectedInstanceId },
          }),
          api.dispatchQuery<readonly WorkflowTaskRow[]>({
            queryType: "workflow.ListTasks",
            payload: { companyId, instanceId: selectedInstanceId },
          }),
        ]);
        if (cancelled) return;
        setLastCorrelationId(taskRes.correlationId);
        setTransitions(trRes.data ?? []);
        setTasks(taskRes.data ?? []);
      } catch (err) {
        if (cancelled) return;
        const formatted = formatApiError(err);
        if (err instanceof ApiClientError) {
          setLastCorrelationId(err.correlationId);
        }
        setDetailError(formatted.message);
        setTransitions([]);
        setTasks([]);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, companyId, selectedInstanceId, setLastCorrelationId]);

  const filteredInstances = useMemo(() => {
    if (tab === "active") {
      return instances.filter((i) => i.instanceStatus === "running");
    }
    if (tab === "history") {
      return instances.filter(
        (i) =>
          i.instanceStatus === "completed" || i.instanceStatus === "cancelled",
      );
    }
    if (tab === "all") return instances;
    return instances;
  }, [instances, tab]);

  const selectedInstance = useMemo(
    () => instances.find((i) => i.id === selectedInstanceId) ?? null,
    [instances, selectedInstanceId],
  );

  function renderInstanceList(rows: readonly WorkflowInstanceRow[]) {
    if (rows.length === 0) {
      return (
        <EmptyState
          title="No workflow instances"
          body="No instances match this filter. Definitions are seeded at startup; instances appear when modules start workflows."
        />
      );
    }
    return (
      <ul className="ws-feed">
        {rows.map((w) => {
          const def = definitionById.get(w.workflowDefinitionId);
          const selected = w.id === selectedInstanceId;
          return (
            <li key={w.id}>
              <div>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    font: "inherit",
                    cursor: "pointer",
                    color: "inherit",
                  }}
                  onClick={() =>
                    setSelectedInstanceId((prev) =>
                      prev === w.id ? null : w.id,
                    )
                  }
                  aria-pressed={selected}
                >
                  <strong>
                    {def?.name ?? w.workflowDefinitionId} · {w.subjectType}{" "}
                    {w.subjectId}
                  </strong>
                </button>
                <span>
                  {w.statusProjection} · {w.instanceStatus} · entered{" "}
                  {formatWhen(w.stageEnteredAt)}
                  {selected ? " · selected" : ""}
                </span>
              </div>
              <StatusBadge
                status={w.instanceStatus.replace("_", " ")}
                tone={toneFor(w.instanceStatus)}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  const showContent = !loading && !listsUnavailable;

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
        Workflow rules and transitions are not executed in the browser. Use module
        records and Approval decisions for actions.
      </Alert>

      {!companyId ? (
        <Alert tone="info" title="Company required">
          Sign in with a company-scoped session to load workflow operator queries.
        </Alert>
      ) : null}

      {loading ? <Skeleton rows={4} /> : null}

      {!loading && error ? (
        <Alert
          tone={forbidden ? "danger" : "warn"}
          title={
            listsUnavailable
              ? forbidden
                ? "Unauthorized"
                : "Unable to load"
              : "Partial load"
          }
        >
          {error}
          <div style={{ marginTop: "0.5rem" }}>
            <Button variant="ghost" onClick={() => setReloadToken((n) => n + 1)}>
              Retry
            </Button>
          </div>
        </Alert>
      ) : null}

      {showContent ? (
        <>
          <Tabs
            tabs={[
              { id: "active", label: "Active" },
              { id: "definitions", label: "Definitions" },
              { id: "all", label: "All" },
              { id: "history", label: "History" },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "definitions" ? (
            definitions.length === 0 ? (
              <EmptyState
                title="No workflow definitions"
                body="No definitions returned for this company. Platform seed definitions appear when RC6.1 seeding has run."
              />
            ) : (
              <ul className="ws-feed">
                {definitions.map((d) => (
                  <li key={d.id}>
                    <div>
                      <strong>
                        {d.name} ({d.code})
                      </strong>
                      <span>
                        {d.entityType} · v{d.version} ·{" "}
                        {d.isActive ? "active" : "inactive"}
                      </span>
                    </div>
                    <StatusBadge
                      status={d.isActive ? "active" : "inactive"}
                      tone={toneFor(d.isActive ? "active" : "draft")}
                    />
                  </li>
                ))}
              </ul>
            )
          ) : (
            renderInstanceList(filteredInstances)
          )}

          {selectedInstance ? (
            <section className="ws-card">
              <header className="ws-card__head">
                <h2>
                  Instance detail · {selectedInstance.subjectType}{" "}
                  {selectedInstance.subjectId}
                </h2>
              </header>
              <div className="ws-card__body stack">
                {detailLoading ? <Skeleton rows={2} /> : null}
                {detailError ? (
                  <Alert tone="warn" title="Detail unavailable">
                    {detailError}
                  </Alert>
                ) : null}
                {!detailLoading && !detailError ? (
                  <>
                    <div>
                      <h3>Available transitions</h3>
                      {transitions.length === 0 ? (
                        <EmptyState
                          title="No transitions"
                          body="No available transitions for the current stage (read-only)."
                        />
                      ) : (
                        <ul className="ws-feed">
                          {transitions.map((t) => (
                            <li key={t.id}>
                              <div>
                                <strong>{t.code}</strong>
                                <span>
                                  {t.fromStageId} → {t.toStageId}
                                  {t.requiresApprovalType
                                    ? ` · requires ${t.requiresApprovalType}`
                                    : ""}
                                </span>
                              </div>
                              <StatusBadge status="available" tone="neutral" />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h3>Tasks</h3>
                      {tasks.length === 0 ? (
                        <EmptyState
                          title="No tasks"
                          body="No assignments for this instance."
                        />
                      ) : (
                        <ul className="ws-feed">
                          {tasks.map((t) => (
                            <li key={t.id}>
                              <div>
                                <strong>Stage {t.stageId}</strong>
                                <span>
                                  {t.userId
                                    ? `User ${t.userId}`
                                    : t.teamId
                                      ? `Team ${t.teamId}`
                                      : "Unassigned"}{" "}
                                  · {formatWhen(t.assignedAt)}
                                </span>
                              </div>
                              <StatusBadge status="assigned" tone="warn" />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function ApprovalsPage() {
  const { api, user, setLastCorrelationId } = useSession();
  const { toast } = useWorkspaceUi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [items, setItems] = useState<readonly ApprovalRequestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const companyId = user?.companyId ?? null;
  const pending = useMemo(
    () => items.filter((i) => isOpenApproval(i.status)),
    [items],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!companyId) {
        if (cancelled) return;
        setItems([]);
        setLoading(false);
        setError("Company-scoped session required for approval operator queries.");
        setForbidden(false);
        return;
      }
      setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const res = await api.dispatchQuery<readonly ApprovalRequestRow[]>({
          queryType: "approval.ListRequests",
          payload: { companyId, openOnly: false },
        });
        if (cancelled) return;
        setLastCorrelationId(res.correlationId);
        setItems(res.data ?? []);
      } catch (err) {
        if (cancelled) return;
        const formatted = formatApiError(err);
        if (err instanceof ApiClientError) {
          setLastCorrelationId(err.correlationId);
        }
        setForbidden(formatted.forbidden);
        setError(formatted.message);
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, companyId, reloadToken, setLastCorrelationId]);

  async function claim(requestId: string) {
    if (!companyId) return;
    setBusyId(requestId);
    try {
      const res = await api.dispatchCommand<ApprovalRequestRow>({
        commandType: "approval.ClaimRequest",
        payload: { companyId, requestId },
        idempotencyKey: crypto.randomUUID(),
      });
      setLastCorrelationId(res.correlationId);
      setItems((prev) =>
        prev.map((i) => (i.id === requestId ? { ...i, ...res.data } : i)),
      );
      toast({
        tone: "ok",
        title: "Claimed",
        body: "Approval request claimed via Approval Engine.",
      });
    } catch (err) {
      const formatted = formatApiError(err);
      if (err instanceof ApiClientError) {
        setLastCorrelationId(err.correlationId);
      }
      toast({
        tone: "danger",
        title: formatted.forbidden ? "Unauthorized" : "Claim failed",
        body: formatted.message,
      });
    } finally {
      setBusyId(null);
    }
  }

  async function decide(requestId: string, decision: "approved" | "rejected") {
    if (!companyId) return;
    setBusyId(requestId);
    try {
      const res = await api.dispatchCommand<ApprovalRequestRow>({
        commandType: "approval.DecideRequest",
        payload: { companyId, requestId, decision },
        idempotencyKey: crypto.randomUUID(),
      });
      setLastCorrelationId(res.correlationId);
      setItems((prev) =>
        prev.map((i) => (i.id === requestId ? { ...i, ...res.data } : i)),
      );
      toast({
        tone: decision === "approved" ? "ok" : "warn",
        title: decision === "approved" ? "Approved" : "Rejected",
        body: "Decision recorded by Approval Engine.",
      });
    } catch (err) {
      const formatted = formatApiError(err);
      if (err instanceof ApiClientError) {
        setLastCorrelationId(err.correlationId);
      }
      toast({
        tone: "danger",
        title: formatted.forbidden ? "Unauthorized" : "Decision failed",
        body: formatted.message,
      });
    } finally {
      setBusyId(null);
    }
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

      {!companyId ? (
        <Alert tone="info" title="Company required">
          Sign in with a company-scoped session to load approval operator queries.
        </Alert>
      ) : (
        <Alert tone="info" title={`${pending.length} open`}>
          Decisions submit through Approval commands. Policy Engine remains the sole
          authorization authority — no local approval rules.
        </Alert>
      )}

      {loading ? <Skeleton rows={3} /> : null}

      {!loading && error ? (
        <Alert tone={forbidden ? "danger" : "warn"} title={forbidden ? "Unauthorized" : "Unable to load"}>
          {error}
          <div style={{ marginTop: "0.5rem" }}>
            <Button variant="ghost" onClick={() => setReloadToken((n) => n + 1)}>
              Retry
            </Button>
          </div>
        </Alert>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No approvals"
          body="Queue is empty. Open requests appear when modules submit Approval requests."
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <ul className="ws-feed">
          {items.map((a) => (
            <li key={a.id}>
              <div>
                <strong>
                  {a.type} · {a.subjectType} {a.subjectId}
                </strong>
                <span>
                  Submitted by {a.submittedByUserId}
                  {a.reviewerUserId ? ` · Reviewer ${a.reviewerUserId}` : ""} ·{" "}
                  {formatWhen(a.createdAt)}
                  {a.decisionReason ? ` · ${a.decisionReason}` : ""}
                </span>
              </div>
              <div
                className="row"
                style={{ gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}
              >
                <StatusBadge
                  status={a.status.replace("_", " ")}
                  tone={toneFor(a.status)}
                />
                {a.status === "submitted" ? (
                  <Button
                    variant="ghost"
                    disabled={busyId === a.id}
                    onClick={() => void claim(a.id)}
                  >
                    Claim
                  </Button>
                ) : null}
                {isOpenApproval(a.status) ? (
                  <>
                    <Button
                      variant="primary"
                      disabled={busyId === a.id}
                      onClick={() => void decide(a.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busyId === a.id}
                      onClick={() => void decide(a.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
