import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { PageHeader, Button, Alert } from "../components/ui";
import { Tabs, Toolbar, EmptyState, StatusBadge, Skeleton } from "../workspace/widgets";
import { useSession } from "../state/session";
import { useWorkspaceUi } from "../workspace/context";
import {
  CATEGORY_LABELS,
  INTEGRATION_PROVIDERS,
  API_KEY_SCOPES,
  WEBHOOK_EVENT_TYPES,
  getProviderDef,
  providersByCategory,
} from "./catalog";
import {
  buildHealthRows,
  connectProvider,
  disconnectProvider,
  loadApiKeys,
  loadAudit,
  loadConnections,
  loadSyncJobs,
  loadWebhookEvents,
  loadWebhooks,
  providerLabel,
  pushAudit,
  saveApiKeys,
  saveSyncJobs,
  saveWebhookEvents,
  saveWebhooks,
  setConnectionEnabled,
} from "./store";
import { emailSendPreview, getAdapter, messageSendPreview } from "./adapters";
import type {
  ApiKeyRecord,
  ConnectedIntegration,
  IntegrationCategory,
  SyncJob,
  WebhookEndpoint,
} from "./types";
import { LocationMap } from "../workspace/charts";
import { MAP_POINTS } from "../workspace/data";

function toneForStatus(status: string): "ok" | "warn" | "danger" | "neutral" {
  if (status === "connected" || status === "delivered" || status === "success") return "ok";
  if (status === "degraded" || status === "retrying" || status === "configuring") return "warn";
  if (status === "error" || status === "failed" || status === "revoked") return "danger";
  return "neutral";
}

function IntegrationsSubnav() {
  return (
    <nav className="int-subnav" aria-label="Integrations">
      {(
        [
          ["/app/integrations", "Marketplace"],
          ["/app/integrations/health", "Health"],
          ["/app/integrations/webhooks", "Webhooks"],
          ["/app/integrations/api-keys", "API keys"],
          ["/app/integrations/sync", "Sync center"],
          ["/app/integrations/audit", "Audit"],
          ["/app/integrations/email", "Email"],
          ["/app/integrations/messaging", "SMS / WhatsApp / Push"],
          ["/app/integrations/storage", "Storage"],
          ["/app/integrations/maps", "Maps"],
          ["/app/integrations/calendar", "Calendar"],
          ["/app/integrations/payments", "Payments"],
          ["/app/integrations/shipping", "Shipping"],
          ["/app/integrations/sso", "SSO"],
        ] as const
      ).map(([to, label]) => (
        <Link key={to} to={to}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

function MarketplacePage() {
  const [category, setCategory] = useState<string>("all");
  const [connections, setConnections] = useState(loadConnections);
  const [q, setQ] = useState("");
  const { toast } = useWorkspaceUi();
  const cats = ["all", ...Object.keys(CATEGORY_LABELS)];

  const list = INTEGRATION_PROVIDERS.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (q && !`${p.label} ${p.vendor} ${p.description}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  function connectedFor(providerId: string): ConnectedIntegration | undefined {
    return connections.find((c) => c.providerId === providerId && c.enabled);
  }

  return (
    <div className="stack int-page">
      <PageHeader
        title="Integration Marketplace"
        lead="Connect email, SMS, WhatsApp, storage, maps, payments, shipping, calendar, SSO, and AI providers behind abstractions — no domain redesign."
        actions={
          <Toolbar>
            <Link className="btn btn--ghost" to="/app/integrations/health">Health</Link>
            <Link className="btn btn--primary" to="/app/settings/ai">AI providers</Link>
          </Toolbar>
        }
      />
      <IntegrationsSubnav />
      <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <input
          className="field__input"
          style={{ maxWidth: 280 }}
          placeholder="Search providers…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="p5-seg" role="group" aria-label="Category">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              className={category === c ? "is-active" : undefined}
              onClick={() => setCategory(c)}
            >
              {c === "all" ? "All" : CATEGORY_LABELS[c] ?? c}
            </button>
          ))}
        </div>
      </div>
      <div className="int-grid">
        {list.map((p) => {
          const conn = connectedFor(p.id);
          return (
            <article key={p.id} className="int-card">
              <header>
                <StatusBadge
                  status={conn ? conn.status : "disconnected"}
                  tone={toneForStatus(conn?.status ?? "disconnected")}
                />
                <strong>{p.label}</strong>
                <span className="p5-muted">{p.vendor} · {CATEGORY_LABELS[p.category]}</span>
              </header>
              <p>{p.description}</p>
              <ul className="int-caps">
                {p.capabilities.slice(0, 5).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <div className="row" style={{ flexWrap: "wrap", gap: "0.35rem" }}>
                {conn ? (
                  <>
                    <Link className="btn btn--ghost" to={`/app/integrations/configure/${p.id}`}>
                      Configure
                    </Link>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => {
                        setConnections(setConnectionEnabled(conn.id, !conn.enabled));
                        toast({ tone: "info", title: conn.enabled ? "Disabled" : "Enabled" });
                      }}
                    >
                      {conn.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => {
                        setConnections(disconnectProvider(conn.id));
                        toast({ tone: "ok", title: "Disconnected" });
                      }}
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <Link className="btn btn--primary" to={`/app/integrations/configure/${p.id}`}>
                    Connect
                  </Link>
                )}
                <a className="btn btn--ghost" href={p.docsUrl} target="_blank" rel="noreferrer">
                  Docs
                </a>
              </div>
            </article>
          );
        })}
      </div>
      {list.length === 0 ? <EmptyState title="No providers match" body="Adjust category or search." /> : null}
    </div>
  );
}

function ConfigurePage() {
  const { providerId } = useParams();
  const def = providerId ? getProviderDef(providerId) : undefined;
  const { toast } = useWorkspaceUi();
  const [label, setLabel] = useState(def?.label ?? "");
  const [settings, setSettings] = useState<Record<string, string>>({ region: "default" });
  const [probe, setProbe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!def) return <Navigate to="/app/integrations" replace />;

  async function onTest() {
    setBusy(true);
    setProbe(null);
    try {
      const adapter = getAdapter(def!.id);
      const result = await adapter?.testConnection(settings);
      setProbe(result?.message ?? "No adapter");
      toast({
        tone: result?.ok ? "ok" : "warn",
        title: "Health probe",
        body: result?.message ?? "No adapter response",
      });
    } finally {
      setBusy(false);
    }
  }

  function onConnect() {
    connectProvider(def!.id, label || def!.label, settings);
    toast({ tone: "ok", title: "Connected", body: "Credentials stay server-side via Identity / Settings contracts." });
  }

  return (
    <div className="stack int-page">
      <PageHeader
        title={`Configure ${def.label}`}
        lead={`${def.vendor} · ${def.description}`}
        actions={<Link className="btn btn--ghost" to="/app/integrations">Marketplace</Link>}
      />
      <IntegrationsSubnav />
      <Alert tone="info">
        Presentation configuration only. Secrets and provider credentials are issued/rotated via existing Identity service-account and Settings boundaries — not stored as plaintext in the browser beyond local UX drafts.
      </Alert>
      <section className="ws-card">
        <div className="ws-card__body erp-form-grid">
          <label className="field">
            <span className="field__label">Display name</span>
            <input className="field__input" value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Region / mode</span>
            <input
              className="field__input"
              value={settings.region ?? ""}
              onChange={(e) => setSettings((s) => ({ ...s, region: e.target.value }))}
            />
          </label>
          <label className="field">
            <span className="field__label">Account / from / bucket</span>
            <input
              className="field__input"
              value={settings.account ?? ""}
              onChange={(e) => setSettings((s) => ({ ...s, account: e.target.value }))}
              placeholder="noreply@… / bucket / merchant"
            />
          </label>
          <label className="field">
            <span className="field__label">API key / secret (draft)</span>
            <input
              className="field__input"
              type="password"
              value={settings.secretDraft ?? ""}
              onChange={(e) => setSettings((s) => ({ ...s, secretDraft: e.target.value }))}
              placeholder="Not persisted to domain stores from this UI"
            />
          </label>
        </div>
        <div className="ws-card__body row" style={{ gap: "0.5rem" }}>
          <Button variant="ghost" onClick={() => void onTest()} disabled={busy}>
            {busy ? "Probing…" : "Test connection"}
          </Button>
          <Button onClick={onConnect}>Connect</Button>
          <a className="btn btn--ghost" href={def.docsUrl} target="_blank" rel="noreferrer">Documentation</a>
        </div>
        {probe ? <p className="p5-muted" style={{ padding: "0 1rem 1rem" }}>{probe}</p> : null}
      </section>
      <p className="p5-muted">Capabilities: {def.capabilities.join(", ")}</p>
    </div>
  );
}

function HealthPage() {
  const [connections] = useState(loadConnections);
  const [ready, setReady] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { api } = useSession();
  const rows = useMemo(() => buildHealthRows(connections), [connections]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.healthReady();
        if (!cancelled) setReady(typeof res === "string" ? res : JSON.stringify(res));
      } catch {
        if (!cancelled) setReady("health/ready unavailable — showing integration fixtures");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <div className="stack int-page">
      <PageHeader
        title="Integration Health"
        lead="Connected services, availability, last sync, failures, retries, latency, and usage — reuses observability /health contracts."
      />
      <IntegrationsSubnav />
      {loading ? <Skeleton rows={2} /> : null}
      {ready ? <Alert tone="info">Platform ready probe: {ready.slice(0, 180)}</Alert> : null}
      <div className="ws-table-wrap ws-card">
        <table className="ws-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th>Availability</th>
              <th>Last sync</th>
              <th>Failures</th>
              <th>Retries</th>
              <th>Latency</th>
              <th>Usage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.providerId}>
                <td>{r.label}</td>
                <td><StatusBadge status={r.status} tone={toneForStatus(r.status)} /></td>
                <td>{r.availability ? `${r.availability}%` : "—"}</td>
                <td>{r.lastSyncAt ? new Date(r.lastSyncAt).toLocaleString() : "—"}</td>
                <td>{r.failures}</td>
                <td>{r.retries}</td>
                <td>{r.latencyMs ? `${r.latencyMs} ms` : "—"}</td>
                <td>{r.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WebhooksPage() {
  const [tab, setTab] = useState("endpoints");
  const [endpoints, setEndpoints] = useState(loadWebhooks);
  const [events, setEvents] = useState(loadWebhookEvents);
  const { toast } = useWorkspaceUi();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [direction, setDirection] = useState<"incoming" | "outgoing">("outgoing");

  function addEndpoint() {
    if (!name.trim() || !url.trim()) return;
    const next: WebhookEndpoint = {
      id: `wh-${Date.now()}`,
      name: name.trim(),
      direction,
      url: url.trim(),
      secretHint: `••••${Math.random().toString(36).slice(2, 6)}`,
      events: ["order.created"],
      enabled: true,
      createdAt: Date.now(),
    };
    const list = [next, ...endpoints];
    setEndpoints(list);
    saveWebhooks(list);
    pushAudit("webhook", `Registered ${direction} webhook ${next.name}`);
    setName("");
    setUrl("");
    toast({ tone: "ok", title: "Webhook registered (local draft)" });
  }

  function replay(id: string) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const replayed = {
      ...ev,
      id: `we-${Date.now()}`,
      status: "pending" as const,
      at: Date.now(),
    };
    const next = [replayed, ...events];
    setEvents(next);
    saveWebhookEvents(next);
    pushAudit("webhook", `Replay ${ev.event}`);
    toast({ tone: "info", title: "Replay queued (UI)" });
  }

  return (
    <div className="stack int-page">
      <PageHeader
        title="Webhook Center"
        lead="Incoming and outgoing webhooks with retry, history, signatures, replay, and monitoring — presentation over documented security patterns."
      />
      <IntegrationsSubnav />
      <Tabs
        tabs={[
          { id: "endpoints", label: "Endpoints" },
          { id: "history", label: "History" },
          { id: "events", label: "Event types" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "endpoints" ? (
        <>
          <section className="ws-card">
            <div className="ws-card__body erp-form-grid">
              <label className="field">
                <span className="field__label">Name</span>
                <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">URL</span>
                <input className="field__input" value={url} onChange={(e) => setUrl(e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Direction</span>
                <select className="field__input" value={direction} onChange={(e) => setDirection(e.target.value as "incoming" | "outgoing")}>
                  <option value="incoming">Incoming</option>
                  <option value="outgoing">Outgoing</option>
                </select>
              </label>
            </div>
            <div className="ws-card__body">
              <Button onClick={addEndpoint}>Add endpoint</Button>
            </div>
          </section>
          <ul className="int-list">
            {endpoints.map((e) => (
              <li key={e.id}>
                <div>
                  <strong>{e.name}</strong>
                  <span>{e.direction} · {e.url}</span>
                  <span className="p5-muted">Secret {e.secretHint} · {e.events.join(", ")}</span>
                </div>
                <StatusBadge status={e.enabled ? "enabled" : "disabled"} tone={e.enabled ? "ok" : "neutral"} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {tab === "history" ? (
        <div className="ws-table-wrap ws-card">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Direction</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Signature</th>
                <th>When</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.event}</td>
                  <td>{e.direction}</td>
                  <td><StatusBadge status={e.status} tone={toneForStatus(e.status)} /></td>
                  <td>{e.latencyMs} ms</td>
                  <td>{e.signatureValid == null ? "—" : e.signatureValid ? "valid" : "invalid"}</td>
                  <td>{new Date(e.at).toLocaleString()}</td>
                  <td>
                    <button type="button" className="btn btn--ghost" onClick={() => replay(e.id)}>Replay</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {tab === "events" ? (
        <ul className="int-caps int-caps--wrap">
          {WEBHOOK_EVENT_TYPES.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ApiKeysPage() {
  const [keys, setKeys] = useState(loadApiKeys);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read:catalog"]);
  const { toast } = useWorkspaceUi();

  function createKey() {
    if (!name.trim()) return;
    const next: ApiKeyRecord = {
      id: `key-${Date.now()}`,
      name: name.trim(),
      prefix: `afh_live_${Math.random().toString(36).slice(2, 6)}`,
      scopes,
      createdAt: Date.now(),
      expiresAt: Date.now() + 90 * 86400000,
      lastUsedAt: null,
      revoked: false,
      usageCount: 0,
    };
    const list = [next, ...keys];
    setKeys(list);
    saveApiKeys(list);
    pushAudit("api-key", `Created API key ${next.name}`);
    setName("");
    toast({
      tone: "ok",
      title: "API key draft created",
      body: "Aligns with service-account credential rotation patterns — secret shown once in real Identity flows.",
    });
  }

  function rotate(id: string) {
    const src = keys.find((k) => k.id === id);
    if (!src) return;
    const rotated: ApiKeyRecord = {
      ...src,
      id: `key-${Date.now()}`,
      prefix: `afh_live_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      rotatedFrom: src.id,
      usageCount: 0,
      lastUsedAt: null,
      revoked: false,
    };
    const list = [rotated, ...keys.map((k) => (k.id === id ? { ...k, revoked: true } : k))];
    setKeys(list);
    saveApiKeys(list);
    pushAudit("rotate", `Rotated API key ${src.name}`);
    toast({ tone: "ok", title: "Key rotated (presentation)" });
  }

  return (
    <div className="stack int-page">
      <PageHeader
        title="API Keys"
        lead="Enterprise API management — keys, rotation, expiration, scopes, usage tracking. Backed conceptually by Identity service-account credentials."
      />
      <IntegrationsSubnav />
      <section className="ws-card">
        <div className="ws-card__body erp-form-grid">
          <label className="field">
            <span className="field__label">Name</span>
            <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Scopes</span>
            <select
              className="field__input"
              multiple
              value={scopes}
              onChange={(e) =>
                setScopes(Array.from(e.target.selectedOptions).map((o) => o.value))
              }
              size={4}
            >
              {API_KEY_SCOPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="ws-card__body">
          <Button onClick={createKey}>Create key</Button>
        </div>
      </section>
      <div className="ws-table-wrap ws-card">
        <table className="ws-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Scopes</th>
              <th>Expires</th>
              <th>Usage</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td><code>{k.prefix}…</code></td>
                <td>{k.scopes.join(", ")}</td>
                <td>{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "Never"}</td>
                <td>{k.usageCount}</td>
                <td>
                  <StatusBadge
                    status={k.revoked ? "revoked" : "active"}
                    tone={k.revoked ? "danger" : "ok"}
                  />
                </td>
                <td>
                  {!k.revoked ? (
                    <button type="button" className="btn btn--ghost" onClick={() => rotate(k.id)}>
                      Rotate
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SyncCenterPage() {
  const [jobs, setJobs] = useState(loadSyncJobs);
  const { toast } = useWorkspaceUi();

  function runSync(id: string) {
    const next = jobs.map((j) =>
      j.id === id
        ? {
            ...j,
            status: "running" as const,
          }
        : j,
    );
    setJobs(next);
    saveSyncJobs(next);
    window.setTimeout(() => {
      const cleaned: SyncJob[] = loadSyncJobs().map((j) => {
        if (j.id !== id) return j;
        return {
          id: j.id,
          name: j.name,
          providerId: j.providerId,
          status: "success",
          lastSyncAt: Date.now(),
          nextHint: j.nextHint,
        };
      });
      setJobs(cleaned);
      saveSyncJobs(cleaned);
      pushAudit("sync", `Manual sync ${id}`);
      toast({ tone: "ok", title: "Sync completed (UI)", body: "No background scheduler redesign." });
    }, 900);
  }

  function retryFailed(id: string) {
    runSync(id);
  }

  return (
    <div className="stack int-page">
      <PageHeader
        title="Synchronization Center"
        lead="Sync jobs, queue presentation, last sync, manual sync, failures, and retry — no scheduler redesign."
      />
      <IntegrationsSubnav />
      <ul className="int-list">
        {jobs.map((j) => (
          <li key={j.id}>
            <div>
              <strong>{j.name}</strong>
              <span>{providerLabel(j.providerId)} · {j.nextHint}</span>
              <span className="p5-muted">
                Last: {j.lastSyncAt ? new Date(j.lastSyncAt).toLocaleString() : "Never"}
                {j.failureReason ? ` · ${j.failureReason}` : ""}
              </span>
            </div>
            <div className="row">
              <StatusBadge status={j.status} tone={toneForStatus(j.status)} />
              <button type="button" className="btn btn--ghost" onClick={() => runSync(j.id)}>
                Sync now
              </button>
              {j.status === "failed" ? (
                <button type="button" className="btn btn--primary" onClick={() => retryFailed(j.id)}>
                  Retry
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuditPage() {
  const events = loadAudit();
  return (
    <div className="stack int-page">
      <PageHeader
        title="Integration Audit"
        lead="Integration events, API usage, webhook history, credential rotation, and configuration changes — presentation aligned to existing audit infrastructure."
      />
      <IntegrationsSubnav />
      <ul className="int-list">
        {events.map((e) => (
          <li key={e.id}>
            <div>
              <strong>{e.summary}</strong>
              <span>{e.kind} · {e.actor} · {new Date(e.at).toLocaleString()}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryWorkbench({
  category,
  title,
  lead,
  extra,
}: {
  readonly category: IntegrationCategory;
  readonly title: string;
  readonly lead: string;
  readonly extra?: ReactNode;
}) {
  const providers = providersByCategory(category);
  const { toast } = useWorkspaceUi();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("AFH notification");

  return (
    <div className="stack int-page">
      <PageHeader title={title} lead={lead} />
      <IntegrationsSubnav />
      <div className="int-grid">
        {providers.map((p) => (
          <article key={p.id} className="int-card">
            <header>
              <strong>{p.label}</strong>
              <span className="p5-muted">{p.vendor}</span>
            </header>
            <p>{p.description}</p>
            <Link className="btn btn--primary" to={`/app/integrations/configure/${p.id}`}>
              Connect / configure
            </Link>
          </article>
        ))}
      </div>
      {category === "email" || category === "sms" || category === "whatsapp" || category === "push" ? (
        <section className="ws-card">
          <header className="ws-card__head"><h2>Send preview (queued UI)</h2></header>
          <div className="ws-card__body erp-form-grid">
            <label className="field">
              <span className="field__label">To</span>
              <input className="field__input" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            {category === "email" ? (
              <label className="field">
                <span className="field__label">Subject</span>
                <input className="field__input" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </label>
            ) : null}
          </div>
          <div className="ws-card__body">
            <Button
              onClick={() => {
                void (async () => {
                  const providerId = providers[0]?.id;
                  if (!providerId || !to.trim()) return;
                  const res =
                    category === "email"
                      ? await emailSendPreview(providerId, { to, subject })
                      : await messageSendPreview(providerId, to, subject);
                  toast({
                    tone: res.queued ? "ok" : "warn",
                    title: res.queued ? "Queued via provider abstraction" : "Queue failed",
                    body: res.providerRef,
                  });
                })();
              }}
            >
              Queue send
            </Button>
          </div>
        </section>
      ) : null}
      {extra}
    </div>
  );
}

function MapsPage() {
  return (
    <CategoryWorkbench
      category="maps"
      title="Maps & Location"
      lead="Google Maps, Mapbox, OpenStreetMap — warehouses, branches, customers, routes, geocoding."
      extra={
        <section className="ws-card">
          <header className="ws-card__head"><h2>Network visualization</h2></header>
          <div className="ws-card__body">
            <LocationMap points={MAP_POINTS} label="Locations" />
          </div>
        </section>
      }
    />
  );
}

export function IntegrationsRoutes() {
  return (
    <Routes>
      <Route index element={<MarketplacePage />} />
      <Route path="configure/:providerId" element={<ConfigurePage />} />
      <Route path="health" element={<HealthPage />} />
      <Route path="webhooks" element={<WebhooksPage />} />
      <Route path="api-keys" element={<ApiKeysPage />} />
      <Route path="sync" element={<SyncCenterPage />} />
      <Route path="audit" element={<AuditPage />} />
      <Route
        path="email"
        element={
          <CategoryWorkbench
            category="email"
            title="Email Integration"
            lead="SMTP, Microsoft 365, Gmail, SendGrid, Mailgun, Amazon SES — send, templates, queue, delivery, attachments, tracking, retry."
          />
        }
      />
      <Route
        path="messaging"
        element={
          <CategoryWorkbench
            category="sms"
            title="SMS, WhatsApp & Push"
            lead="Twilio, Vonage, MessageBird, WhatsApp Cloud, Web Push, FCM — OTP, alerts, campaigns, templates."
            extra={
              <div className="int-grid">
                {providersByCategory("whatsapp").concat(providersByCategory("push")).map((p) => (
                  <article key={p.id} className="int-card">
                    <header><strong>{p.label}</strong><span className="p5-muted">{p.vendor}</span></header>
                    <p>{p.description}</p>
                    <Link className="btn btn--ghost" to={`/app/integrations/configure/${p.id}`}>Configure</Link>
                  </article>
                ))}
              </div>
            }
          />
        }
      />
      <Route
        path="storage"
        element={
          <CategoryWorkbench
            category="storage"
            title="Cloud Storage"
            lead="AWS S3, Azure Blob, GCS, Cloudflare R2 — upload, download, versioning, signed URLs (DAM upload seam)."
          />
        }
      />
      <Route path="maps" element={<MapsPage />} />
      <Route
        path="calendar"
        element={
          <CategoryWorkbench
            category="calendar"
            title="Calendar Integration"
            lead="Google Calendar and Microsoft Outlook — appointments, meetings, service visits, milestones, leave."
          />
        }
      />
      <Route
        path="payments"
        element={
          <CategoryWorkbench
            category="payments"
            title="Payment Providers"
            lead="Stripe and PayPal — invoice payment, links, refund hooks, webhook verification. Regional gateways deferred."
          />
        }
      />
      <Route
        path="shipping"
        element={
          <CategoryWorkbench
            category="shipping"
            title="Shipping Providers"
            lead="Shipment creation, tracking, labels, delivery status — multi-carrier placeholder adapters."
          />
        }
      />
      <Route
        path="sso"
        element={
          <CategoryWorkbench
            category="sso"
            title="Authentication Providers (SSO)"
            lead="Google, Microsoft, GitHub, SAML, OpenID Connect — reuse existing identity system boundaries."
          />
        }
      />
      <Route path="*" element={<Navigate to="/app/integrations" replace />} />
    </Routes>
  );
}
