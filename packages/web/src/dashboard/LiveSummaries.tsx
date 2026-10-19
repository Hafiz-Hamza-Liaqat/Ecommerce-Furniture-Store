import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../state/session";
import { ApiClientError } from "../api/types";
import { dedupeAsync } from "../api/dedupe";
import { Alert } from "../components/ui";
import { Skeleton, StatusBadge } from "../workspace/widgets";

// projects.GetProjectSummary and service.GetServiceSummary are record-scoped
// (require projectId / serviceRequestId) — company-wide calls always fail
// validation, so they are excluded here.
const LIVE_SUMMARIES = [
  { id: "procurement", label: "Procurement", queryType: "procurement.GetProcurementSummary", href: "/app/procurement" },
  { id: "inventory", label: "Inventory", queryType: "inventory.GetInventorySummary", href: "/app/inventory" },
  { id: "finance", label: "Finance", queryType: "finance.GetFinancialSummary", href: "/app/finance" },
  { id: "crm", label: "CRM", queryType: "crm.GetCrmSummary", href: "/app/crm" },
] as const;

type LiveRow = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly status: "ok" | "warn" | "danger" | "neutral";
  readonly detail: string;
};

/**
 * Executive live summaries — only modules with registered Get*Summary queries.
 * Does not fabricate metrics when the backend is unreachable.
 */
export function LiveBackendSummaries() {
  const { api, user, setLastCorrelationId } = useSession();
  const [rows, setRows] = useState<LiveRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.companyId) {
      setRows([]);
      setError("Company-scoped session required for live summaries.");
      return;
    }
    let cancelled = false;
    void (async () => {
      setError(null);
      const companyId = user.companyId!;
      const results = await Promise.all(
        LIVE_SUMMARIES.map(async (item) => {
          try {
            const res = await dedupeAsync(`exec-summary:${item.id}:${companyId}`, () =>
              api.dispatchQuery({
                queryType: item.queryType,
                payload: { companyId },
              }),
            );
            setLastCorrelationId(res.correlationId);
            const preview = JSON.stringify(res.data).slice(0, 96);
            return {
              id: item.id,
              label: item.label,
              href: item.href,
              status: "ok" as const,
              detail: preview,
            };
          } catch (err) {
            const detail =
              err instanceof ApiClientError
                ? `${err.message} (${err.code})`
                : "Summary unavailable";
            return {
              id: item.id,
              label: item.label,
              href: item.href,
              status: "warn" as const,
              detail,
            };
          }
        }),
      );
      if (!cancelled) setRows(results);
    })();
    return () => {
      cancelled = true;
    };
  }, [api, setLastCorrelationId, user?.companyId]);

  if (!user?.companyId) {
    return (
      <Alert tone="info" title="Live backend summaries">
        Sign in with a company-scoped session to load Get*Summary queries. KPI fixtures remain presentation-only where
        no company-wide sales summary exists.
      </Alert>
    );
  }

  if (!rows) return <Skeleton rows={3} />;

  return (
    <section className="ws-card">
      <header className="ws-card__head">
        <h2>Live module summaries</h2>
      </header>
      <div className="ws-card__body">
        {error ? <Alert tone="warn">{error}</Alert> : null}
        <ul className="ws-feed">
          {rows.map((r) => (
            <li key={r.id}>
              <div>
                <Link to={r.href}>
                  <strong>{r.label}</strong>
                </Link>
                <span>{r.detail}</span>
              </div>
              <StatusBadge status={r.status === "ok" ? "live" : "degraded"} tone={r.status} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
