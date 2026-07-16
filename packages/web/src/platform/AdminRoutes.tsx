import { Link, Navigate, Route, Routes } from "react-router-dom";
import { PageHeader } from "../components/ui";
import { StatusBadge, EmptyState } from "../workspace/widgets";
import { PLANS } from "./catalog";
import { LimitBar, PlatformPublicShell, SectionCard } from "./PlatformShell";
import { loadTenants, usageOverview } from "./store";

function toneFor(status: string): "ok" | "warn" | "danger" | "neutral" {
  if (status === "active") return "ok";
  if (status === "provisioning") return "warn";
  if (status === "suspended") return "danger";
  return "neutral";
}

function PlatformAdminPage() {
  const tenants = loadTenants();
  const { sub, plan, licenses } = usageOverview();

  return (
    <div className="stack plt-page">
      <PageHeader
        title="SaaS administration"
        lead="Tenant management, plans, usage, billing overview, storage, AI, API, integrations, and health."
        actions={
          <Link className="btn btn--ghost" to="/app/platform">
            Ops center
          </Link>
        }
      />

      <div className="plt-kpi-grid">
        <div className="plt-kpi">
          <span>Tenants</span>
          <strong>{tenants.length}</strong>
        </div>
        <div className="plt-kpi">
          <span>Active users</span>
          <strong>{tenants.reduce((a, t) => a + t.users, 0)}</strong>
        </div>
        <div className="plt-kpi">
          <span>Current plan</span>
          <strong>{plan?.label ?? sub.planId}</strong>
        </div>
        <div className="plt-kpi">
          <span>Billing</span>
          <strong>{plan?.monthlyPrice ?? "—"}</strong>
        </div>
      </div>

      <SectionCard title="Tenant management" lead="Companies on the AFH SaaS platform (presentation fixtures).">
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Users</th>
                <th>Storage</th>
                <th>AI</th>
                <th>API</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.planId}</td>
                  <td>
                    <StatusBadge tone={toneFor(t.status)} status={t.status} />
                  </td>
                  <td>{t.users}</td>
                  <td>{t.storageUsedGb} GB</td>
                  <td>{t.aiUsage.toLocaleString()}</td>
                  <td>{t.apiUsage.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Plans catalog">
        <div className="plt-grid">
          {PLANS.map((p) => (
            <article key={p.id} className="plt-plan">
              <header>
                <h3>{p.label}</h3>
                <strong>{p.monthlyPrice}</strong>
              </header>
              <p>{p.description}</p>
              <ul>
                <li>Seats: {p.seats === "unlimited" ? "∞" : p.seats}</li>
                <li>AI: {p.aiCredits === "unlimited" ? "∞" : p.aiCredits}</li>
                <li>Storage: {p.storageGb === "unlimited" ? "∞" : `${p.storageGb} GB`}</li>
              </ul>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Usage & limits" lead="Seats, AI credits, storage, API quotas for the signed-in tenant view.">
        <div className="stack" style={{ gap: "0.75rem" }}>
          {licenses.map((l) => (
            <LimitBar key={l.id} label={l.label} used={l.used} limit={l.limit} unit={l.unit} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Health overview"
        lead="Reuse readiness probes from the deployment center."
        actions={
          <Link className="btn btn--ghost" to="/app/platform/deployment">
            Open deployment
          </Link>
        }
      >
        <EmptyState title="Operational health" body="Live probes run inside /app/platform/deployment and monitoring." />
      </SectionCard>

      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        <Link className="btn btn--primary" to="/app/platform/billing">
          Billing portal
        </Link>
        <Link className="btn btn--ghost" to="/app/platform/subscription">
          Subscriptions
        </Link>
        <Link className="btn btn--ghost" to="/app/integrations">
          Integrations
        </Link>
      </div>
    </div>
  );
}

export function AdminRoutes() {
  return (
    <Routes>
      <Route
        element={
          <PlatformPublicShell
            brand="AFH Platform Admin"
            homeTo="/admin/platform"
            nav={[
              { to: "/admin/platform", label: "Overview" },
              { to: "/app/platform/billing", label: "Billing" },
              { to: "/app/platform/monitoring", label: "Monitoring" },
              { to: "/onboarding", label: "Onboarding" },
            ]}
          />
        }
      >
        <Route index element={<PlatformAdminPage />} />
        <Route path="*" element={<Navigate to="/admin/platform" replace />} />
      </Route>
    </Routes>
  );
}
