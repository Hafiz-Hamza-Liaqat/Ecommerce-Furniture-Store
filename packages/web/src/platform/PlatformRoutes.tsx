import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Alert, Button, TextField, PageHeader } from "../components/ui";
import { EmptyState, ErrorState, Skeleton, StatusBadge, Tabs } from "../workspace/widgets";
import { useSession } from "../state/session";
import { useWorkspaceUi } from "../workspace/context";
import {
  MODULE_ACCESS,
  PLANS,
  PRODUCT_TOURS,
  RELEASE_NOTES,
  SUCCESS_LINKS,
  planById,
} from "./catalog";
import {
  billingProviderAction,
  probeHealthPath,
  probeHealthReady,
  queueStatusRows,
  secretsStatusRows,
} from "./adapters";
import { LimitBar, PlatformSubnav, SectionCard } from "./PlatformShell";
import { MobileReadinessBar } from "./MobileReadiness";
import {
  clearDemo,
  loadAudit,
  loadBackups,
  loadDeploymentHistory,
  loadDemo,
  loadFeatureRequests,
  loadInvoices,
  loadLicenses,
  loadMetrics,
  loadPaymentMethods,
  loadReleaseMeta,
  loadSubscription,
  loadTickets,
  pushAudit,
  resetDemo,
  saveBackups,
  saveInvoices,
  savePaymentMethods,
  saveSubscription,
  saveTickets,
} from "./store";
import type { HealthProbeResult, PlanId, SubscriptionState } from "./types";
import { JobsModulePage } from "../modules/pages";

const SUBNAV = [
  { to: "/app/platform", label: "Overview" },
  { to: "/app/platform/subscription", label: "Subscription" },
  { to: "/app/platform/billing", label: "Billing" },
  { to: "/app/platform/licenses", label: "Licenses" },
  { to: "/app/platform/success", label: "Success" },
  { to: "/app/platform/deployment", label: "Deployment" },
  { to: "/app/platform/monitoring", label: "Monitoring" },
  { to: "/app/platform/jobs", label: "Background jobs" },
  { to: "/app/platform/backups", label: "Backups" },
  { to: "/app/platform/audit", label: "Audit" },
  { to: "/app/platform/releases", label: "Releases" },
  { to: "/app/platform/demo", label: "Demo" },
] as const;

function toneFor(status: string): "ok" | "warn" | "danger" | "neutral" {
  if (["paid", "success", "validated", "active", "ok", "trialing", "renewing"].includes(status)) return "ok";
  if (["open", "running", "pending", "past_due", "warn"].includes(status)) return "warn";
  if (["failed", "void", "canceled", "danger"].includes(status)) return "danger";
  return "neutral";
}

function PlatformOverview() {
  const sub = loadSubscription();
  const plan = planById(sub.planId);
  const release = loadReleaseMeta();
  return (
    <div className="stack plt-page">
      <MobileReadinessBar />
      <PageHeader
        title="SaaS operations center"
        lead="Subscriptions, billing, licenses, deployment, monitoring, backups, audit, releases, and demo mode."
        actions={
          <div className="row" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
            <Link className="btn btn--ghost" to="/onboarding">
              Onboarding
            </Link>
            <Link className="btn btn--ghost" to="/admin/platform">
              Admin
            </Link>
            <Link className="btn btn--primary" to="/portal">
              Customer portal
            </Link>
          </div>
        }
      />
      <PlatformSubnav items={SUBNAV} />
      <div className="plt-kpi-grid">
        <div className="plt-kpi">
          <span>Plan</span>
          <strong>{plan?.label ?? sub.planId}</strong>
        </div>
        <div className="plt-kpi">
          <span>Status</span>
          <strong>{sub.status}</strong>
        </div>
        <div className="plt-kpi">
          <span>Version</span>
          <strong>{release.version}</strong>
        </div>
        <div className="plt-kpi">
          <span>Environment</span>
          <strong>{release.environment}</strong>
        </div>
      </div>
      <Alert tone="ok" title="Architecture frozen">
        Presentation-only SaaS operations. Runtime, CQRS, SQL, workflow, rules, policy, and approval packs are unchanged.
      </Alert>
      <div className="plt-grid">
        {SUBNAV.filter((s) => s.to !== "/app/platform").map((s) => (
          <Link key={s.to} to={s.to} className="plt-tile">
            <strong>{s.label}</strong>
            <span>Open {s.label.toLowerCase()} center</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SubscriptionPage() {
  const { toast } = useWorkspaceUi();
  const [sub, setSub] = useState(loadSubscription);

  function applyPlan(planId: PlanId, status: SubscriptionState["status"]) {
    const plan = planById(planId)!;
    const next: SubscriptionState = {
      ...sub,
      planId,
      status,
      seatsLimit: plan.seats,
      aiLimit: plan.aiCredits,
      storageLimitGb: plan.storageGb,
      apiLimit: plan.apiQuota,
      renewsAt: status === "canceled" ? null : Date.now() + 30 * 86400000,
    };
    setSub(next);
    saveSubscription(next);
    toast({ tone: "ok", title: `Plan ${status}`, body: `${plan.label} applied (presentation)` });
  }

  return (
    <div className="stack plt-page">
      <PageHeader title="Subscription management" lead="Trial, Free, Professional, Enterprise — upgrade, downgrade, cancel, renew." />
      <PlatformSubnav items={SUBNAV} />
      <SectionCard title="Current subscription">
        <p>
          <StatusBadge status={sub.status} tone={toneFor(sub.status)} /> {planById(sub.planId)?.label}
          {sub.renewsAt ? ` · renews ${new Date(sub.renewsAt).toLocaleDateString()}` : " · not renewing"}
        </p>
        <div className="stack" style={{ gap: "0.6rem", marginTop: "0.75rem" }}>
          {loadLicenses(sub).map((l) => (
            <LimitBar key={l.id} label={l.label} used={l.used} limit={l.limit} unit={l.unit} />
          ))}
        </div>
      </SectionCard>
      <div className="plt-grid">
        {PLANS.map((p) => (
          <article key={p.id} className={`plt-plan ${sub.planId === p.id ? "is-current" : ""}`}>
            <header>
              <h3>{p.label}</h3>
              <strong>{p.monthlyPrice}</strong>
            </header>
            <p>{p.description}</p>
            <div className="row" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => applyPlan(p.id, p.id === "trial" ? "trialing" : "active")}>
                {sub.planId === p.id ? "Renew" : "Select"}
              </Button>
              {sub.planId === p.id ? (
                <Button variant="danger" onClick={() => applyPlan(p.id, "canceled")}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function BillingPage() {
  const { toast } = useWorkspaceUi();
  const [invoices, setInvoices] = useState(loadInvoices);
  const [methods, setMethods] = useState(loadPaymentMethods);
  const [tab, setTab] = useState("invoices");

  return (
    <div className="stack plt-page">
      <PageHeader
        title="Billing portal"
        lead="Invoices, payments, methods, history, receipts, tax invoices, credits, and discounts — payment providers reused."
      />
      <PlatformSubnav items={SUBNAV} />
      <Tabs
        tabs={[
          { id: "invoices", label: "Invoices" },
          { id: "methods", label: "Payment methods" },
          { id: "history", label: "History" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "invoices" ? (
        <SectionCard
          title="Invoices & tax invoices"
          actions={
            <Button
              variant="primary"
              onClick={() => {
                const ref = billingProviderAction("stripe", "pay");
                pushAudit("billing", `Payment link ${ref.ref}`);
                toast({ tone: "ok", title: "Payment link queued", body: ref.ref });
              }}
            >
              Pay open (Stripe)
            </Button>
          }
        >
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Tax</th>
                  <th>Issued</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.number}</td>
                    <td>{inv.amount}</td>
                    <td>
                      <StatusBadge status={inv.status} tone={toneFor(inv.status)} />
                    </td>
                    <td>{inv.taxInvoice ? "Yes" : "—"}</td>
                    <td>{new Date(inv.issuedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}
      {tab === "methods" ? (
        <SectionCard
          title="Payment methods"
          actions={
            <Button
              variant="ghost"
              onClick={() => {
                const next = [
                  {
                    id: `pm-${Date.now()}`,
                    brand: "Mastercard",
                    last4: String(Math.floor(1000 + Math.random() * 9000)),
                    exp: "12/29",
                    primary: false,
                  },
                  ...methods,
                ];
                setMethods(next);
                savePaymentMethods(next);
                pushAudit("billing", "Payment method added (UI)");
              }}
            >
              Add method
            </Button>
          }
        >
          <ul className="plt-list">
            {methods.map((m) => (
              <li key={m.id}>
                <div>
                  <strong>
                    {m.brand} ···· {m.last4}
                  </strong>
                  <span>Exp {m.exp}</span>
                </div>
                <StatusBadge status={m.primary ? "Primary" : "Backup"} tone={m.primary ? "ok" : "neutral"} />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
      {tab === "history" ? (
        <SectionCard
          title="Billing history, receipts, credits & discounts"
          actions={
            <Button
              variant="ghost"
              onClick={() => {
                const ref = billingProviderAction("paypal", "verify-webhook");
                toast({ tone: "info", title: "Webhook verify", body: ref.ref });
              }}
            >
              Verify PayPal webhook
            </Button>
          }
        >
          <EmptyState
            title="Receipts & credits"
            body="Credits and discount lines appear alongside invoices. Refund hooks use the payments provider abstraction."
          />
          <Button
            variant="ghost"
            onClick={() => {
              const list = invoices.map((i) =>
                i.status === "open" ? { ...i, status: "paid" as const } : i,
              );
              setInvoices(list);
              saveInvoices(list);
              pushAudit("billing", "Marked open invoices paid (UI)");
              toast({ tone: "ok", title: "Receipts refreshed" });
            }}
          >
            Mark open as paid
          </Button>
        </SectionCard>
      ) : null}
    </div>
  );
}

function LicensesPage() {
  const licenses = loadLicenses();
  return (
    <div className="stack plt-page">
      <PageHeader title="License management" lead="Seats, AI credits, storage, API quotas, and module access." />
      <PlatformSubnav items={SUBNAV} />
      <SectionCard title="Entitlements">
        <div className="stack" style={{ gap: "0.75rem" }}>
          {licenses.map((l) => (
            <LimitBar key={l.id} label={l.label} used={l.used} limit={l.limit} unit={l.unit} />
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Module access">
        <ul className="plt-caps">
          {MODULE_ACCESS.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

function SuccessPage() {
  const { toast } = useWorkspaceUi();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState(loadTickets);
  const [subject, setSubject] = useState("");
  const features = loadFeatureRequests();

  const tourRoutes: Record<string, string> = {
    exec: "/app",
    sales: "/app/sales",
    ai: "/app/ai",
    integrations: "/app/integrations",
  };

  return (
    <div className="stack plt-page">
      <PageHeader
        title="Customer success center"
        lead="Product tours, documentation, videos, support tickets, feature requests, release notes, changelog, community."
      />
      <PlatformSubnav items={SUBNAV} />
      <SectionCard title="Product tours">
        <ul className="plt-list">
          {PRODUCT_TOURS.map((t) => (
            <li key={t.id}>
              <div>
                <strong>{t.title}</strong>
                <span>{t.minutes} min</span>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  const href = tourRoutes[t.id] ?? "/app";
                  toast({ tone: "ok", title: "Tour started", body: t.title });
                  void navigate(href);
                }}
              >
                Start
              </Button>
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Documentation & community">
        <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          {SUCCESS_LINKS.map((l) =>
            l.href.startsWith("http") ? (
              <a key={l.id} className="btn btn--ghost" href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ) : (
              <Link key={l.id} className="btn btn--ghost" to={l.href}>
                {l.label}
              </Link>
            ),
          )}
        </div>
      </SectionCard>
      <SectionCard title="Support tickets">
        <div className="plt-form-grid">
          <TextField
            id="tk-subject"
            label="New ticket subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Button
            variant="primary"
            onClick={() => {
              if (!subject.trim()) return;
              const next = [
                {
                  id: `tk-${Date.now()}`,
                  subject: subject.trim(),
                  status: "open" as const,
                  createdAt: Date.now(),
                },
                ...tickets,
              ];
              setTickets(next);
              saveTickets(next);
              setSubject("");
              pushAudit("user", `Support ticket opened: ${subject.trim()}`);
              toast({ tone: "ok", title: "Ticket created" });
            }}
          >
            Submit ticket
          </Button>
        </div>
        <ul className="plt-list" style={{ marginTop: "0.75rem" }}>
          {tickets.map((t) => (
            <li key={t.id}>
              <div>
                <strong>{t.subject}</strong>
                <span>{new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
              <StatusBadge status={t.status} tone={toneFor(t.status)} />
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Feature requests">
        <ul className="plt-list">
          {features.map((f) => (
            <li key={f.id}>
              <div>
                <strong>{f.title}</strong>
                <span>
                  {f.votes} votes · {f.status}
                </span>
              </div>
              <StatusBadge status={f.status} tone={f.status === "shipped" ? "ok" : "neutral"} />
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Release notes & changelog">
        <ul className="plt-notes">
          {RELEASE_NOTES.map((n) => (
            <li key={n.version}>
              <strong>
                {n.version} — {n.title}
              </strong>
              <ul>
                {n.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

function DeploymentPage() {
  const { api } = useSession();
  const [probes, setProbes] = useState<HealthProbeResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const release = loadReleaseMeta();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      setProbes(null);
      try {
        const results = await Promise.all([
          probeHealthReady(api),
          probeHealthPath("", "/health/live", "Live"),
          probeHealthPath("", "/health/startup", "Startup"),
          probeHealthPath("", "/health/version", "Version"),
        ]);
        if (!cancelled) setProbes(results);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Probe failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  async function runProbes() {
    setError(null);
    setProbes(null);
    try {
      const results = await Promise.all([
        probeHealthReady(api),
        probeHealthPath("", "/health/live", "Live"),
        probeHealthPath("", "/health/startup", "Startup"),
        probeHealthPath("", "/health/version", "Version"),
      ]);
      setProbes(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Probe failed");
    }
  }

  return (
    <div className="stack plt-page">
      <PageHeader
        title="Production deployment"
        lead="Environment, version, build, health, migrations, secrets, integrations, queues, database — health APIs reused."
        actions={
          <Button variant="ghost" onClick={() => void runProbes()}>
            Refresh probes
          </Button>
        }
      />
      <PlatformSubnav items={SUBNAV} />
      <div className="plt-kpi-grid">
        <div className="plt-kpi">
          <span>Environment</span>
          <strong>{release.environment}</strong>
        </div>
        <div className="plt-kpi">
          <span>Version</span>
          <strong>{release.version}</strong>
        </div>
        <div className="plt-kpi">
          <span>Build</span>
          <strong>{release.build}</strong>
        </div>
        <div className="plt-kpi">
          <span>Migration</span>
          <strong>{release.migrationVersion}</strong>
        </div>
      </div>
      {error ? <ErrorState body={error} onRetry={() => void runProbes()} /> : null}
      {!probes && !error ? <Skeleton rows={4} /> : null}
      {probes ? (
        <SectionCard title="Health probes">
          <ul className="plt-list">
            {probes.map((p) => (
              <li key={p.label}>
                <div>
                  <strong>{p.label}</strong>
                  <span>
                    {p.detail} · {p.latencyMs}ms
                  </span>
                </div>
                <StatusBadge status={p.ok ? "healthy" : "down"} tone={p.ok ? "ok" : "danger"} />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
      <SectionCard title="Secrets status">
        <ul className="plt-list">
          {secretsStatusRows().map((s) => (
            <li key={s.name}>
              <div>
                <strong>{s.name}</strong>
                <span>{s.status}</span>
              </div>
              <StatusBadge status="ok" tone="ok" />
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Queue & database status">
        <ul className="plt-list">
          {queueStatusRows().map((q) => (
            <li key={q.name}>
              <div>
                <strong>{q.name}</strong>
                <span>Depth {q.depth}</span>
              </div>
              <StatusBadge status={q.status} tone={toneFor(q.status)} />
            </li>
          ))}
        </ul>
        <p className="plt-muted" style={{ marginTop: "0.75rem" }}>
          Database status is inferred from readiness probes — no SQL schema changes.
        </p>
        <Link className="btn btn--ghost" to="/app/integrations/health">
          Integration status
        </Link>
      </SectionCard>
    </div>
  );
}

function MonitoringPage() {
  const metrics = loadMetrics();
  return (
    <div className="stack plt-page">
      <PageHeader
        title="Monitoring center"
        lead="CPU, memory, requests, errors, queue depth, broker, SQL, AI, integrations, API, storage — presentation only."
      />
      <PlatformSubnav items={SUBNAV} />
      <div className="plt-kpi-grid plt-kpi-grid--dense">
        {metrics.map((m) => (
          <div key={m.id} className={`plt-kpi plt-kpi--${m.tone}`}>
            <span>{m.label}</span>
            <strong>{m.value}</strong>
            <em>{m.hint}</em>
          </div>
        ))}
      </div>
      <Alert tone="info" title="Observability contracts">
        Values are operational fixtures for UX. Live health remains via /health/* probes on the Deployment page.
      </Alert>
    </div>
  );
}

function BackupsPage() {
  const { toast } = useWorkspaceUi();
  const [jobs, setJobs] = useState(loadBackups);

  function manualBackup() {
    const job = {
      id: `bk-${Date.now()}`,
      createdAt: Date.now(),
      status: "running" as const,
      sizeHint: "…",
      retentionDays: 30,
      note: "Manual backup request",
    };
    const next = [job, ...jobs];
    setJobs(next);
    saveBackups(next);
    pushAudit("config", "Manual backup requested");
    window.setTimeout(() => {
      const done = loadBackups().map((j) =>
        j.id === job.id
          ? { id: j.id, createdAt: j.createdAt, status: "validated" as const, sizeHint: "2.5 GB", retentionDays: j.retentionDays, note: "Manual backup" }
          : j,
      );
      setJobs(done);
      saveBackups(done);
      toast({ tone: "ok", title: "Backup validated (UI)" });
    }, 900);
  }

  return (
    <div className="stack plt-page">
      <PageHeader
        title="Backup management"
        lead="Backup history, manual backup, restore requests, validation, retention — backup contracts reused."
        actions={
          <Button variant="primary" onClick={manualBackup}>
            Manual backup
          </Button>
        }
      />
      <PlatformSubnav items={SUBNAV} />
      <SectionCard title="History">
        <ul className="plt-list">
          {jobs.map((j) => (
            <li key={j.id}>
              <div>
                <strong>{new Date(j.createdAt).toLocaleString()}</strong>
                <span>
                  {j.sizeHint} · retain {j.retentionDays}d{j.note ? ` · ${j.note}` : ""}
                </span>
              </div>
              <div className="row" style={{ gap: "0.35rem" }}>
                <StatusBadge status={j.status} tone={toneFor(j.status)} />
                <Button
                  variant="ghost"
                  onClick={() => {
                    pushAudit("config", `Restore requested for ${j.id}`);
                    toast({ tone: "warn", title: "Restore requested", body: "Ops review required — no runtime restore executed." });
                  }}
                >
                  Request restore
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

function AuditPage() {
  const [filter, setFilter] = useState("all");
  const events = loadAudit().filter((e) => filter === "all" || e.category === filter);
  const cats = ["all", "login", "security", "ai", "api", "integration", "billing", "user", "config"];

  return (
    <div className="stack plt-page">
      <PageHeader
        title="Audit center"
        lead="Login history, security events, AI usage, API usage, integration events, billing events, user actions."
      />
      <PlatformSubnav items={SUBNAV} />
      <div className="plt-subnav" role="tablist" aria-label="Audit filters">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            className={filter === c ? "is-active" : undefined}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <SectionCard title="Enterprise audit trail">
        <ul className="plt-list">
          {events.map((e) => (
            <li key={e.id}>
              <div>
                <strong>{e.summary}</strong>
                <span>
                  {e.actor} · {e.category} · {new Date(e.at).toLocaleString()}
                </span>
              </div>
              <StatusBadge status={e.category} tone="neutral" />
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

function ReleasesPage() {
  const release = loadReleaseMeta();
  const history = loadDeploymentHistory();
  return (
    <div className="stack plt-page">
      <PageHeader title="Release center" lead="Current version, build metadata, migration version, deployment & rollback history, release notes." />
      <PlatformSubnav items={SUBNAV} />
      <div className="plt-kpi-grid">
        <div className="plt-kpi">
          <span>Current</span>
          <strong>{release.version}</strong>
        </div>
        <div className="plt-kpi">
          <span>Build</span>
          <strong>{release.build}</strong>
        </div>
        <div className="plt-kpi">
          <span>Migration</span>
          <strong>{release.migrationVersion}</strong>
        </div>
        <div className="plt-kpi">
          <span>Deployed</span>
          <strong>{new Date(release.deployedAt).toLocaleString()}</strong>
        </div>
      </div>
      <SectionCard title="Deployment history">
        <ul className="plt-list">
          {history.map((h) => (
            <li key={h.id}>
              <div>
                <strong>
                  {h.action} {h.version}
                </strong>
                <span>
                  {h.by} · {new Date(h.at).toLocaleString()}
                </span>
              </div>
              <StatusBadge status={h.result} tone={toneFor(h.result)} />
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Release notes">
        <ul className="plt-notes">
          {RELEASE_NOTES.map((n) => (
            <li key={n.version}>
              <strong>
                {n.version} — {n.title}
              </strong>
              <ul>
                {n.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

function DemoPage() {
  const { toast } = useWorkspaceUi();
  const [demo, setDemo] = useState(loadDemo);

  return (
    <div className="stack plt-page">
      <PageHeader title="Demo mode" lead="Seed company, demo records, guided tour, reset — no production data." />
      <PlatformSubnav items={SUBNAV} />
      <SectionCard title="Demo workspace">
        <p>
          Status:{" "}
          <StatusBadge status={demo.active ? "active" : "idle"} tone={demo.active ? "ok" : "neutral"} />
          {demo.seededAt ? ` · seeded ${new Date(demo.seededAt).toLocaleString()}` : ""}
        </p>
        <p className="plt-muted">Company: {demo.companyName}</p>
        <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
          <Button
            variant="primary"
            onClick={() => {
              setDemo(resetDemo());
              toast({ tone: "ok", title: "Demo seeded", body: "Guided tour available from Success center." });
            }}
          >
            Seed demo
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setDemo(clearDemo());
              toast({ tone: "info", title: "Demo reset" });
            }}
          >
            Reset demo
          </Button>
          <Link className="btn btn--ghost" to="/app/platform/success">
            Guided tour
          </Link>
          <Link className="btn btn--ghost" to="/onboarding">
            Onboarding wizard
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}

export function PlatformRoutes() {
  return (
    <Routes>
      <Route index element={<PlatformOverview />} />
      <Route path="subscription" element={<SubscriptionPage />} />
      <Route path="billing" element={<BillingPage />} />
      <Route path="licenses" element={<LicensesPage />} />
      <Route path="success" element={<SuccessPage />} />
      <Route path="deployment" element={<DeploymentPage />} />
      <Route path="monitoring" element={<MonitoringPage />} />
      <Route path="jobs/*" element={<JobsModulePage />} />
      <Route path="backups" element={<BackupsPage />} />
      <Route path="audit" element={<AuditPage />} />
      <Route path="releases" element={<ReleasesPage />} />
      <Route path="demo" element={<DemoPage />} />
      <Route path="*" element={<Navigate to="/app/platform" replace />} />
    </Routes>
  );
}
