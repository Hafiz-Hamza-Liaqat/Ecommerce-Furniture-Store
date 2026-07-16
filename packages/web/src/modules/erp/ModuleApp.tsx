import { useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Alert, Button, PageHeader } from "../../components/ui";
import { FormShell } from "../../forms/FormShell";
import { useSession } from "../../state/session";
import { ApiClientError } from "../../api/types";
import {
  Accordion,
  Drawer,
  EmptyState,
  FilterBar,
  KanbanPreview,
  Skeleton,
  StatusBadge,
  Tabs,
  Toolbar,
  Timeline,
} from "../../workspace/widgets";
import { LineChart, BarChart } from "../../workspace/charts";
import { useWorkspaceUi } from "../../workspace/context";
import { SERIES } from "../../workspace/data";
import type { EntityDef, ModuleDefinition, RecordRow } from "./types";
import { addCollab, getCollab, loadLocalRecords, saveLocalRecord } from "./store";

const PAGE_SIZE = 8;

export function ModuleApp({ module }: { readonly module: ModuleDefinition }) {
  return (
    <div className="erp-module">
      <ModuleNav module={module} />
      <Routes>
        <Route index element={<ModuleDashboard module={module} />} />
        <Route path="pipeline" element={<KanbanPage module={module} />} />
        <Route path=":entityKey" element={<EntityListPage module={module} />} />
        <Route path=":entityKey/new" element={<EntityFormPage module={module} mode="create" />} />
        <Route path=":entityKey/:recordId" element={<EntityDetailPage module={module} />} />
        <Route path=":entityKey/:recordId/edit" element={<EntityFormPage module={module} mode="edit" />} />
        <Route path="*" element={<Navigate to={module.basePath} replace />} />
      </Routes>
    </div>
  );
}

function ModuleNav({ module }: { readonly module: ModuleDefinition }) {
  return (
    <nav className="erp-subnav" aria-label={`${module.title} sections`}>
      {module.nav.map((item) => (
        <NavLink
          key={`${item.to}-${item.label}`}
          to={item.to ? `${module.basePath}/${item.to}` : module.basePath}
          end={!item.to}
          className={({ isActive }) => `erp-subnav__link${isActive ? " is-active" : ""}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function useEntity(module: ModuleDefinition, key: string | undefined): EntityDef | null {
  return useMemo(
    () => module.entities.find((e) => e.key === key) ?? null,
    [module, key],
  );
}

function mergeRecords(module: ModuleDefinition, entity: EntityDef): RecordRow[] {
  const local = loadLocalRecords(module.id, entity.key) as RecordRow[];
  const byId = new Map<string, RecordRow>();
  for (const r of entity.records) byId.set(r.id, r);
  for (const r of local) byId.set(r.id, r);
  return [...byId.values()];
}

function ModuleDashboard({ module }: { readonly module: ModuleDefinition }) {
  const { api, user, setLastCorrelationId } = useSession();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!module.summaryQueryType || !user?.companyId || !module.buildSummaryPayload) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.dispatchQuery({
          queryType: module.summaryQueryType!,
          payload: module.buildSummaryPayload!(user.companyId!),
        });
        if (cancelled) return;
        setLastCorrelationId(res.correlationId);
        setSummary(JSON.stringify(res.data, null, 2));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          setLastCorrelationId(err.correlationId);
          setError(`${err.message} (${err.code})`);
        } else {
          setError("Summary query unavailable — showing presentation KPIs.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, module, setLastCorrelationId, user?.companyId]);

  return (
    <div className="stack">
      <PageHeader
        title={module.title}
        lead={module.lead}
        actions={
          <Toolbar>
            <Link className="btn btn--primary" to={`${module.basePath}/${module.entities[0]?.key}/new`}>
              Quick create
            </Link>
          </Toolbar>
        }
      />
      {error ? <Alert tone="warn">{error}</Alert> : null}
      {loading ? <Skeleton rows={2} /> : null}
      <div className="erp-kpi-grid">
        {module.kpis.map((k) => (
          <Link
            key={k.label}
            className="ws-stat"
            to={k.href ? `${module.basePath}/${k.href}` : module.basePath}
          >
            <div className="ws-stat__label">{k.label}</div>
            <div className="ws-stat__value">{k.value}</div>
            {typeof k.trend === "number" ? (
              <div className="ws-stat__foot">
                <span className={`ws-trend ${k.trend >= 0 ? "ws-trend--up" : "ws-trend--down"}`}>
                  {k.trend > 0 ? "+" : ""}
                  {k.trend}%
                </span>
              </div>
            ) : null}
          </Link>
        ))}
      </div>
      <div className="erp-dash-grid">
        <section className="ws-card">
          <header className="ws-card__head">
            <h2>Trend</h2>
          </header>
          <div className="ws-card__body">
            <LineChart values={SERIES.revenue} labels={SERIES.months} label={`${module.title} trend`} />
          </div>
        </section>
        <section className="ws-card">
          <header className="ws-card__head">
            <h2>Volume</h2>
          </header>
          <div className="ws-card__body">
            <BarChart
              values={SERIES.production.slice(-6)}
              labels={SERIES.months.slice(-6)}
              label={`${module.title} volume`}
            />
          </div>
        </section>
        <section className="ws-card">
          <header className="ws-card__head">
            <h2>Module areas</h2>
          </header>
          <ul className="ws-feed">
            {module.entities.slice(0, 8).map((ent) => (
              <li key={ent.key}>
                <Link to={`${module.basePath}/${ent.key}`}>
                  <strong>{ent.plural}</strong>
                </Link>
                <span>{ent.records.length} records · {ent.description}</span>
              </li>
            ))}
          </ul>
        </section>
        {summary ? (
          <section className="ws-card">
            <header className="ws-card__head">
              <h2>Live summary</h2>
            </header>
            <pre className="erp-pre">{summary}</pre>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function KanbanPage({ module }: { readonly module: ModuleDefinition }) {
  const entity = module.entities.find((e) => e.kanban) ?? module.entities[0]!;
  const records = mergeRecords(module, entity);
  const columns = ["Draft", "Open", "In progress", "Approved", "Closed"].map((column) => ({
    column,
    cards: records.filter((r) => r.status === column).map((r) => r.title).slice(0, 4),
  }));
  return (
    <div className="stack">
      <PageHeader title="Kanban pipeline" lead={`${entity.plural} by status — presentation board.`} />
      <KanbanPreview columns={columns} />
      <Link className="btn btn--ghost" to={`${module.basePath}/${entity.key}`}>
        Open list
      </Link>
    </div>
  );
}

function EntityListPage({ module }: { readonly module: ModuleDefinition }) {
  const { entityKey } = useParams();
  const entity = useEntity(module, entityKey);
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const page = Number(params.get("page") || "1");
  const q = params.get("q") || "";
  const { toast } = useWorkspaceUi();

  if (!entity) {
    return <EmptyState title="Unknown area" body="This module section is not defined." />;
  }

  const all = mergeRecords(module, entity);
  const filtered = all.filter((r) => {
    if (q) {
      const hay = `${r.title} ${r.status} ${JSON.stringify(r.meta)}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    for (const f of entity.filters) {
      const val = params.get(f.key);
      if (!val) continue;
      const hay = `${r.status} ${JSON.stringify(r.meta)} ${(r.tags ?? []).join(" ")}`.toLowerCase();
      if (!hay.includes(val.toLowerCase())) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = String(sortKey === "title" ? a.title : sortKey === "status" ? a.status : a.meta[sortKey] ?? a.amount ?? "");
    const bv = String(sortKey === "title" ? b.title : sortKey === "status" ? b.status : b.meta[sortKey] ?? b.amount ?? "");
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const slice = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const drawerRecord = drawerId ? all.find((r) => r.id === drawerId) : null;

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setParams(next);
  }

  return (
    <div className="stack">
      <PageHeader
        title={entity.plural}
        lead={entity.description}
        actions={
          <Toolbar>
            <Link className="btn btn--primary" to={`${module.basePath}/${entity.key}/new`}>
              Create
            </Link>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => toast({ tone: "ok", title: "Export queued", body: "CSV export UI — file generation stays server-side." })}
            >
              Export
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => toast({ tone: "info", title: "Import", body: "Import wizard UI — parsing/validation remain backend-owned." })}
            >
              Import
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => window.print()}
            >
              Print
            </button>
          </Toolbar>
        }
      />

      <FilterBar>
        <label className="erp-filter">
          <span>Search</span>
          <input
            value={q}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder={`Search ${entity.plural.toLowerCase()}…`}
          />
        </label>
        {entity.filters.map((f) => (
          <label key={f.key} className="erp-filter">
            <span>{f.label}</span>
            {f.options ? (
              <select
                value={params.get(f.key) || ""}
                onChange={(e) => setFilter(f.key, e.target.value)}
              >
                <option value="">All</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={params.get(f.key) || ""}
                onChange={(e) => setFilter(f.key, e.target.value)}
              />
            )}
          </label>
        ))}
      </FilterBar>

      {selected.size > 0 ? (
        <div className="erp-bulk">
          <span>{selected.size} selected</span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              toast({ tone: "ok", title: "Bulk action recorded", body: "No domain mutation until backend bulk commands exist." });
              setSelected(new Set());
            }}
          >
            Bulk update status
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      ) : null}

      {slice.length === 0 ? (
        <EmptyState
          title={`No ${entity.plural.toLowerCase()}`}
          body="Adjust filters or create a record. API-created rows appear after successful commands."
          action={
            <Link className="btn btn--primary" to={`${module.basePath}/${entity.key}/new`}>
              Create {entity.label.toLowerCase()}
            </Link>
          }
        />
      ) : (
        <div className="ws-table-wrap ws-card">
          <table className="ws-table erp-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Select</span>
                </th>
                {entity.columns.map((c) => (
                  <th key={c.key} scope="col">
                    <button
                      type="button"
                      className="erp-sort"
                      onClick={() => {
                        if (sortKey === c.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        else {
                          setSortKey(c.key);
                          setSortDir("asc");
                        }
                      }}
                    >
                      {c.label}
                      {sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(r.id);
                          else next.delete(r.id);
                          return next;
                        });
                      }}
                      aria-label={`Select ${r.title}`}
                    />
                  </td>
                  {entity.columns.map((c) => (
                    <td key={c.key}>
                      {c.key === "title" ? (
                        <Link to={`${module.basePath}/${entity.key}/${r.id}`}>{r.title}</Link>
                      ) : c.key === "status" ? (
                        <StatusBadge status={r.status} tone={toneForStatus(r.status)} />
                      ) : c.key === "amount" ? (
                        r.amount ?? "—"
                      ) : (
                        String(r.meta[c.key] ?? "—")
                      )}
                    </td>
                  ))}
                  <td>
                    <Toolbar>
                      <button type="button" className="ws-icon-btn" onClick={() => setDrawerId(r.id)}>
                        Quick
                      </button>
                      <Link className="ws-icon-btn" to={`${module.basePath}/${entity.key}/${r.id}/edit`}>
                        Edit
                      </Link>
                    </Toolbar>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="erp-pager row">
        <Button
          variant="ghost"
          disabled={page <= 1}
          onClick={() => {
            const next = new URLSearchParams(params);
            next.set("page", String(page - 1));
            setParams(next);
          }}
        >
          Previous
        </Button>
        <span>
          Page {page} / {pages} · {sorted.length} records
        </span>
        <Button
          variant="ghost"
          disabled={page >= pages}
          onClick={() => {
            const next = new URLSearchParams(params);
            next.set("page", String(page + 1));
            setParams(next);
          }}
        >
          Next
        </Button>
      </div>

      <Drawer
        open={Boolean(drawerRecord)}
        title={drawerRecord?.title ?? "Quick edit"}
        onClose={() => setDrawerId(null)}
      >
        {drawerRecord ? (
          <div className="stack">
            <StatusBadge status={drawerRecord.status} tone={toneForStatus(drawerRecord.status)} />
            <p>{drawerRecord.description}</p>
            <dl className="erp-dl">
              {Object.entries(drawerRecord.meta).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <Link
              className="btn btn--primary"
              to={`${module.basePath}/${entity.key}/${drawerRecord.id}`}
              onClick={() => setDrawerId(null)}
            >
              Open detail
            </Link>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

function EntityDetailPage({ module }: { readonly module: ModuleDefinition }) {
  const { entityKey, recordId } = useParams();
  const entity = useEntity(module, entityKey);
  const { api, user, setLastCorrelationId } = useSession();
  const { toast } = useWorkspaceUi();
  const [tab, setTab] = useState("overview");
  const [apiRow, setApiRow] = useState<RecordRow | null>(null);
  const [apiRaw, setApiRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [, setTick] = useState(0);

  const localRow = useMemo(() => {
    if (!entity || !recordId) return null;
    return mergeRecords(module, entity).find((r) => r.id === recordId) ?? null;
  }, [entity, module, recordId]);

  useEffect(() => {
    if (!entity?.api?.getQueryType || !entity.api.buildGetPayload || !recordId || !user?.companyId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.dispatchQuery({
          queryType: entity.api!.getQueryType!,
          payload: entity.api!.buildGetPayload!(user.companyId!, recordId),
        });
        if (cancelled) return;
        setLastCorrelationId(res.correlationId);
        setApiRaw(JSON.stringify(res.data, null, 2));
        const mapped = entity.api!.mapEntity?.(res.data) ?? null;
        setApiRow(mapped);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          setLastCorrelationId(err.correlationId);
          setError(`${err.message} (${err.code})`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, entity, recordId, setLastCorrelationId, user?.companyId]);

  if (!entity || !recordId) {
    return <EmptyState title="Not found" body="Record or entity missing." />;
  }

  const row = apiRow ?? localRow;
  if (!row) {
    return (
      <EmptyState
        title="Record not in local catalogue"
        body="Try Lookup via API create flow, or return to the list. If an API get succeeds, detail will populate."
        action={<Link className="btn btn--ghost" to={`${module.basePath}/${entity.key}`}>Back to list</Link>}
      />
    );
  }

  const collab = getCollab(module.id, entity.key, recordId);

  return (
    <div className="stack">
      <PageHeader
        title={row.title}
        lead={`${entity.label} · ${row.id}`}
        actions={
          <Toolbar>
            <Link className="btn btn--ghost" to={`${module.basePath}/${entity.key}`}>
              Back
            </Link>
            <Link className="btn btn--primary" to={`${module.basePath}/${entity.key}/${recordId}/edit`}>
              Edit
            </Link>
            <button type="button" className="btn btn--ghost" onClick={() => window.print()}>
              Print
            </button>
          </Toolbar>
        }
      />
      <StatusBadge status={row.status} tone={toneForStatus(row.status)} />
      {loading ? <Skeleton rows={2} /> : null}
      {error ? <Alert tone="warn">{`${error} — showing catalogue/local data.`}</Alert> : null}

      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "activity", label: "Activity" },
          { id: "notes", label: "Notes" },
          { id: "comments", label: "Comments" },
          { id: "attachments", label: "Attachments" },
          { id: "timeline", label: "Timeline" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" ? (
        <section className="ws-card">
          <div className="ws-card__body stack">
            <p>{row.description}</p>
            {row.amount ? <p><strong>Amount:</strong> {row.amount}</p> : null}
            <dl className="erp-dl">
              {Object.entries(row.meta).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {row.tags?.length ? (
              <div className="row">
                {row.tags.map((t) => (
                  <StatusBadge key={t} status={t} tone="neutral" />
                ))}
              </div>
            ) : null}
            {apiRaw ? (
              <Accordion
                items={[{ id: "raw", title: "API payload", body: apiRaw }]}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "activity" || tab === "timeline" ? (
        <section className="ws-card">
          <div className="ws-card__body">
            <Timeline
              items={[
                { id: "1", time: "09:10", title: "Record opened", place: module.title },
                { id: "2", time: "11:40", title: "Status reviewed", place: row.status },
                { id: "3", time: "15:05", title: "Note added", place: "Collaboration" },
              ]}
            />
          </div>
        </section>
      ) : null}

      {tab === "notes" ? (
        <CollabPanel
          items={collab.notes}
          value={note}
          onChange={setNote}
          onAdd={() => {
            if (!note.trim()) return;
            addCollab(module.id, entity.key, recordId, "notes", note.trim());
            setNote("");
            setTick((x) => x + 1);
            toast({ tone: "ok", title: "Note saved" });
          }}
          placeholder="Add a note…"
        />
      ) : null}

      {tab === "comments" ? (
        <CollabPanel
          items={collab.comments}
          value={comment}
          onChange={setComment}
          onAdd={() => {
            if (!comment.trim()) return;
            addCollab(module.id, entity.key, recordId, "comments", comment.trim());
            setComment("");
            setTick((x) => x + 1);
            toast({ tone: "ok", title: "Comment added" });
          }}
          placeholder="Add a comment…"
        />
      ) : null}

      {tab === "attachments" ? (
        <section className="ws-card">
          <div className="ws-card__body stack">
            <ul className="ws-feed">
              {collab.attachments.map((a, i) => (
                <li key={`${a}-${i}`}>
                  <strong>{a}</strong>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => {
                addCollab(module.id, entity.key, recordId, "attachments", `Attachment-${Date.now()}.pdf`);
                setTick((x) => x + 1);
                toast({ tone: "ok", title: "Attachment registered", body: "Binary upload remains on DAM / upload API." });
              }}
            >
              Register attachment
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CollabPanel({
  items,
  value,
  onChange,
  onAdd,
  placeholder,
}: {
  readonly items: string[];
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly onAdd: () => void;
  readonly placeholder: string;
}) {
  return (
    <section className="ws-card">
      <div className="ws-card__body stack">
        <ul className="ws-feed">
          {items.map((n, i) => (
            <li key={`${n}-${i}`}>
              <strong>{n}</strong>
            </li>
          ))}
          {items.length === 0 ? <li><span>Nothing yet.</span></li> : null}
        </ul>
        <textarea
          className="field__input"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <Button onClick={onAdd}>Save</Button>
      </div>
    </section>
  );
}

function EntityFormPage({
  module,
  mode,
}: {
  readonly module: ModuleDefinition;
  readonly mode: "create" | "edit";
}) {
  const { entityKey, recordId } = useParams();
  const entity = useEntity(module, entityKey);
  const navigate = useNavigate();
  const { api, user, setLastCorrelationId } = useSession();
  const { toast } = useWorkspaceUi();
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entity) return;
    const existing = recordId
      ? mergeRecords(module, entity).find((r) => r.id === recordId)
      : null;
    const init: Record<string, string> = {};
    for (const f of entity.fields) {
      if (f.name === "title" && existing) init[f.name] = existing.title;
      else if (existing?.meta[f.name] != null) init[f.name] = String(existing.meta[f.name]);
      else init[f.name] = "";
    }
    setValues(init);
  }, [entity, module, recordId]);

  if (!entity) {
    return <EmptyState title="Unknown entity" body="Cannot open form." />;
  }

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      if (entity!.api?.createCommandType && entity!.api.buildCreatePayload && mode === "create") {
        if (!user?.companyId) {
          setError("Signed-in user is missing companyId — required for API commands.");
          return;
        }
        const payload = entity!.api.buildCreatePayload(user.companyId, values);
        const res = await api.dispatchCommand({
          commandType: entity!.api.createCommandType,
          payload,
          idempotencyKey: crypto.randomUUID(),
        });
        setLastCorrelationId(res.correlationId);
        const id =
          entity!.api.extractCreateId?.(res.data) ??
          `local-${Date.now()}`;
        const mapped =
          entity!.api.mapEntity?.(res.data) ??
          ({
            id,
            title: values.title || values.name || values.number || id,
            status: "Open",
            meta: { ...values },
            source: "api" as const,
          } satisfies RecordRow);
        saveLocalRecord(module.id, entity!.key, mapped);
        toast({ tone: "ok", title: `${entity!.label} created`, body: id });
        navigate(`${module.basePath}/${entity!.key}/${mapped.id}`);
        return;
      }

      const id = recordId ?? `${entity!.key.slice(0, 3).toUpperCase()}-${Date.now()}`;
      const row: RecordRow = {
        id,
        title: values.title || values.name || values.number || `${entity!.label} ${id}`,
        status: mode === "create" ? "Draft" : "Open",
        meta: { ...values },
        description: values.notes || values.memo || entity!.description,
        source: "local",
      };
      saveLocalRecord(module.id, entity!.key, row);
      toast({
        tone: "ok",
        title: mode === "create" ? "Record saved locally" : "Record updated",
        body: entity!.api?.createCommandType
          ? "Fill required API fields to dispatch the live command."
          : "Presentation record stored in this browser.",
      });
      navigate(`${module.basePath}/${entity!.key}/${id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setLastCorrelationId(err.correlationId);
        setError(`${err.message} (${err.code})`);
      } else {
        setError("Save failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title={`${mode === "create" ? "Create" : "Edit"} ${entity.label.toLowerCase()}`}
        lead={
          entity.api?.createCommandType
            ? `Dispatches ${entity.api.createCommandType} when creating with a company-scoped session.`
            : "Presentation form — persisted locally until a matching API command exists."
        }
      />
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <section className="ws-card">
        <div className="ws-card__body">
          <FormShell
            submitLabel={mode === "create" ? "Create" : "Save"}
            submitting={submitting}
            onSubmit={onSubmit}
            footer={
              <Link className="btn btn--ghost" to={`${module.basePath}/${entity.key}`}>
                Cancel
              </Link>
            }
          >
            <div className="erp-form-grid">
              {entity.fields.map((f) => (
                <label key={f.name} className="field">
                  <span className="field__label">
                    {f.label}
                    {f.required ? " *" : ""}
                  </span>
                  {f.type === "textarea" ? (
                    <textarea
                      className="field__input"
                      required={f.required}
                      value={values[f.name] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      rows={3}
                    />
                  ) : f.type === "select" ? (
                    <select
                      className="field__input"
                      required={f.required}
                      value={values[f.name] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="field__input"
                      type={f.type === "number" || f.type === "currency" ? "number" : f.type === "date" ? "date" : "text"}
                      required={f.required}
                      placeholder={f.placeholder}
                      value={values[f.name] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    />
                  )}
                </label>
              ))}
            </div>
          </FormShell>
        </div>
      </section>
    </div>
  );
}

function toneForStatus(status: string): "ok" | "warn" | "danger" | "neutral" {
  const s = status.toLowerCase();
  if (["approved", "issued", "paid", "won", "active", "healthy", "pass"].some((x) => s.includes(x))) return "ok";
  if (["hold", "low", "conditional", "draft", "open"].some((x) => s.includes(x))) return "warn";
  if (["cancel", "void", "fail", "dead", "out"].some((x) => s.includes(x))) return "danger";
  return "neutral";
}
