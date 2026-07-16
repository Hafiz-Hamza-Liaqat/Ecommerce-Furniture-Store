import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import type { EntityDef, LifecycleAction, ModuleDefinition, RecordRow } from "./types";
import { addCollab, getCollab, loadLocalRecords, saveLocalRecord } from "./store";
import { AdvancedDataTable } from "../../productivity/AdvancedTable";
import { EnterpriseCalendar } from "../../productivity/EnterpriseCalendar";
import { dedupeAsync } from "../../api/dedupe";
import {
  CollaborationComposer,
  CollaborationFeed,
  SharedLinkBar,
  parseCollabItems,
  serializeCollabItem,
  type CollabItem,
} from "../../productivity/Collaboration";
import { FileDropzone, FilePreviewPanel, type StagedFile } from "../../productivity/FileExperience";
import {
  loadPinnedRecords,
  loadWatchedRecords,
  togglePinnedRecord,
  toggleWatchedRecord,
} from "../../workspace/prefs";

const PAGE_SIZE = 8;

export function ModuleApp({ module }: { readonly module: ModuleDefinition }) {
  return (
    <div className="erp-module">
      <ModuleNav module={module} />
      <Routes>
        <Route index element={<ModuleDashboard module={module} />} />
        <Route path="pipeline" element={<KanbanPage module={module} />} />
        <Route path="gantt" element={<GanttPage module={module} />} />
        <Route path="calendar" element={<CalendarPage module={module} />} />
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
        const res = await dedupeAsync(
          `summary:${module.id}:${user.companyId}`,
          () =>
            api.dispatchQuery({
              queryType: module.summaryQueryType!,
              payload: module.buildSummaryPayload!(user.companyId!),
            }),
        );
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

function GanttPage({ module }: { readonly module: ModuleDefinition }) {
  const entity =
    module.entities.find((e) => e.key === "tasks" || e.key === "milestones" || e.key === "production-orders") ??
    module.entities[0]!;
  const records = mergeRecords(module, entity).slice(0, 8);
  return (
    <div className="stack">
      <PageHeader title="Gantt timeline" lead={`${entity.plural} timeline presentation — scheduling math stays server-side.`} />
      <section className="ws-card">
        <div className="ws-card__body erp-gantt" role="img" aria-label="Gantt timeline">
          {records.map((r, i) => (
            <div key={r.id} className="erp-gantt__row">
              <span>{r.title}</span>
              <div className="erp-gantt__track">
                <div style={{ marginLeft: `${8 + i * 6}%`, width: `${28 + (i % 4) * 10}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
      <Link className="btn btn--ghost" to={`${module.basePath}/${entity.key}`}>
        Open list
      </Link>
    </div>
  );
}

function CalendarPage({ module }: { readonly module: ModuleDefinition }) {
  const entity =
    module.entities.find((e) =>
      ["appointments", "meetings", "calendar", "milestones", "shifts"].includes(e.key),
    ) ?? module.entities[0]!;
  const records = mergeRecords(module, entity).slice(0, 12);
  const events = records.map((r, i) => ({
    id: r.id,
    title: r.title,
    day: Math.min(28, ((i * 3) % 27) + 1),
    lane: module.id,
    href: `${module.basePath}/${entity.key}/${r.id}`,
    tone: toneForStatus(r.status) as "ok" | "warn" | "danger" | "neutral",
  }));
  const { toast } = useWorkspaceUi();
  return (
    <div className="stack">
      <PageHeader
        title="Calendar"
        lead={`${module.title} calendar — unified grid with drag-and-drop UI scheduling.`}
        actions={
          <Link className="btn btn--ghost" to="/app/calendar">
            Enterprise calendar
          </Link>
        }
      />
      <EnterpriseCalendar
        title={`${module.title} schedule`}
        events={events}
        onMove={(id, day) =>
          toast({ tone: "info", title: "Rescheduled locally", body: `${id} → day ${day}` })
        }
      />
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
  const page = Number(params.get("page") || "1");
  const q = params.get("q") || "";
  const { toast } = useWorkspaceUi();
  const [localPatch, setLocalPatch] = useState<Record<string, Record<string, string>>>({});

  if (!entity) {
    return <EmptyState title="Unknown area" body="This module section is not defined." />;
  }

  const all = mergeRecords(module, entity).map((r) => {
    const patch = localPatch[r.id];
    if (!patch) return r;
    return {
      ...r,
      title: patch.title ?? r.title,
      status: patch.status ?? r.status,
      meta: { ...r.meta, ...patch },
    };
  });
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

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const drawerRecord = drawerId ? all.find((r) => r.id === drawerId) : null;

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setParams(next);
  }

  const advRows = slice.map((r) => {
    const sortValues: Record<string, string | number> = {
      title: r.title,
      status: r.status,
      amount: r.amount ?? "",
      ...Object.fromEntries(Object.entries(r.meta).map(([k, v]) => [k, v])),
    };
    const cells: Record<string, ReactNode> = {};
    for (const c of entity.columns) {
      if (c.key === "title") {
        cells[c.key] = <Link to={`${module.basePath}/${entity.key}/${r.id}`}>{r.title}</Link>;
      } else if (c.key === "status") {
        cells[c.key] = <StatusBadge status={r.status} tone={toneForStatus(r.status)} />;
      } else if (c.key === "amount") {
        cells[c.key] = r.amount ?? "—";
      } else {
        cells[c.key] = String(r.meta[c.key] ?? "—");
      }
    }
    return {
      id: r.id,
      cells,
      sortValues,
      groupValue: r.status,
    };
  });

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
        <AdvancedDataTable
          scope={`${module.id}:${entity.key}`}
          columns={entity.columns.map((c) => ({
            key: c.key,
            label: c.label,
            sortable: c.sortable !== false,
          }))}
          rows={advRows}
          selected={selected}
          onSelectedChange={setSelected}
          onInlineEdit={(id, key, value) => {
            setLocalPatch((prev) => ({
              ...prev,
              [id]: { ...(prev[id] ?? {}), [key]: value },
            }));
            toast({ tone: "ok", title: "Inline edit saved locally", body: `${key} updated for ${id}` });
          }}
          exportPresets={[
            {
              id: "run",
              label: "Run export preset",
              onRun: () =>
                toast({
                  tone: "ok",
                  title: "Export preset",
                  body: "Presentation export — generation remains server-side.",
                }),
            },
          ]}
          renderActions={(id) => (
            <Toolbar>
              <button type="button" className="ws-icon-btn" onClick={() => setDrawerId(id)}>
                Quick
              </button>
              <Link className="ws-icon-btn" to={`${module.basePath}/${entity.key}/${id}/edit`}>
                Edit
              </Link>
            </Toolbar>
          )}
        />
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
          Page {page} / {pages} · {filtered.length} records
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
  const [pinned, setPinned] = useState(() => loadPinnedRecords());
  const [watched, setWatched] = useState(() => loadWatchedRecords());
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [reactionBoost, setReactionBoost] = useState<Record<string, Record<string, number>>>({});
  const [lifecycleBusy, setLifecycleBusy] = useState<string | null>(null);
  const recordKey = `${module.id}:${entityKey}:${recordId}`;
  const isPinned = pinned.includes(recordKey);
  const isWatched = watched.includes(recordKey);

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
        const res = await dedupeAsync(
          `get:${entity.api!.getQueryType}:${user.companyId}:${recordId}`,
          () =>
            api.dispatchQuery({
              queryType: entity.api!.getQueryType!,
              payload: entity.api!.buildGetPayload!(user.companyId!, recordId),
            }),
        );
        if (cancelled) return;
        setLastCorrelationId(res.correlationId);
        setApiRaw(JSON.stringify(res.data, null, 2));
        const mapped = entity.api!.mapEntity?.(res.data) ?? null;
        setApiRow(mapped);
        if (mapped) saveLocalRecord(module.id, entity.key, mapped);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          setLastCorrelationId(err.correlationId);
          const forbidden =
            err.status === 403 ||
            err.category === "authorization" ||
            err.code.includes("forbidden") ||
            err.code.includes("denied");
          setError(
            forbidden
              ? `Forbidden by Policy (${err.code}) — backend remains sole authorization authority.`
              : `${err.message} (${err.code})`,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, entity, module.id, recordId, setLastCorrelationId, user?.companyId]);

  if (!entity || !recordId) {
    return <EmptyState title="Not found" body="Record or entity missing." />;
  }

  const entityDef = entity;
  const id = recordId;

  const row = apiRow ?? localRow;
  if (!row) {
    return (
      <EmptyState
        title="Record not in local catalogue"
        body="Try Lookup via API create flow, or return to the list. If an API get succeeds, detail will populate."
        action={<Link className="btn btn--ghost" to={`${module.basePath}/${entityDef.key}`}>Back to list</Link>}
      />
    );
  }

  const collab = getCollab(module.id, entityDef.key, id);
  const noteItems = parseCollabItems(collab.notes).map((n) => ({
    ...n,
    reactions: { ...n.reactions, ...(reactionBoost[n.id] ?? {}) },
  }));
  const commentItems = parseCollabItems(collab.comments).map((c) => ({
    ...c,
    reactions: { ...c.reactions, ...(reactionBoost[c.id] ?? {}) },
  }));
  const activityItems = [
    ...noteItems.map((n) => ({
      id: `n-${n.id}`,
      time: n.at,
      title: `Note by ${n.author}`,
      place: n.text.slice(0, 48),
    })),
    ...commentItems.map((c) => ({
      id: `c-${c.id}`,
      time: c.at,
      title: `Comment by ${c.author}`,
      place: c.text.slice(0, 48),
    })),
    ...collab.attachments.map((a, i) => ({
      id: `a-${i}`,
      time: "Earlier",
      title: "Attachment",
      place: a,
    })),
    { id: "open", time: "Session", title: "Record opened", place: module.title },
  ];

  function saveCollabItem(kind: "notes" | "comments", text: string) {
    const item: CollabItem = {
      id: `${kind}-${Date.now()}`,
      author: "You",
      text,
      at: new Date().toLocaleString(),
      reactions: {},
      shared: text.includes("@"),
    };
    addCollab(module.id, entityDef.key, id, kind, serializeCollabItem(item));
    setTick((x) => x + 1);
  }

  function reactTo(_kind: "notes" | "comments", id: string, emoji: string) {
    setReactionBoost((prev) => {
      const cur = prev[id] ?? {};
      return { ...prev, [id]: { ...cur, [emoji]: (cur[emoji] ?? 0) + 1 } };
    });
  }

  async function runLifecycle(action: LifecycleAction) {
    if (!user?.companyId || !row) {
      toast({ tone: "danger", title: "Missing companyId", body: "Session must include company scope." });
      return;
    }
    setLifecycleBusy(action.id);
    try {
      const res = await api.dispatchCommand({
        commandType: action.commandType,
        payload: action.buildPayload(user.companyId, id, row),
        idempotencyKey: crypto.randomUUID(),
      });
      setLastCorrelationId(res.correlationId);
      toast({
        tone: "ok",
        title: action.label,
        body: `${action.commandType} accepted — Workflow/Approval/Policy enforced server-side.`,
      });
      // Re-query when get is available
      if (entityDef.api?.getQueryType && entityDef.api.buildGetPayload) {
        const q = await api.dispatchQuery({
          queryType: entityDef.api.getQueryType,
          payload: entityDef.api.buildGetPayload(user.companyId, id),
        });
        setLastCorrelationId(q.correlationId);
        setApiRaw(JSON.stringify(q.data, null, 2));
        const mapped = entityDef.api.mapEntity?.(q.data) ?? null;
        setApiRow(mapped);
        if (mapped) saveLocalRecord(module.id, entityDef.key, mapped);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setLastCorrelationId(err.correlationId);
        toast({
          tone: "danger",
          title: action.label,
          body: `${err.message} (${err.code})`,
        });
      } else {
        toast({ tone: "danger", title: action.label, body: "Command failed." });
      }
    } finally {
      setLifecycleBusy(null);
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title={row.title}
        lead={`${entityDef.label} · ${row.id}`}
        actions={
          <Toolbar>
            <button
              type="button"
              className="btn btn--ghost"
              aria-pressed={isPinned}
              onClick={() => {
                setPinned(togglePinnedRecord(recordKey));
                toast({ tone: "ok", title: isPinned ? "Unpinned" : "Pinned record" });
              }}
            >
              {isPinned ? "Pinned" : "Pin"}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              aria-pressed={isWatched}
              onClick={() => {
                setWatched(toggleWatchedRecord(recordKey));
                toast({ tone: "ok", title: isWatched ? "Unfollowed" : "Watching record" });
              }}
            >
              {isWatched ? "Watching" : "Watch"}
            </button>
            <Link className="btn btn--ghost" to={`${module.basePath}/${entityDef.key}`}>
              Back
            </Link>
            <Link className="btn btn--primary" to={`${module.basePath}/${entityDef.key}/${id}/edit`}>
              Edit
            </Link>
            <button type="button" className="btn btn--ghost" onClick={() => window.print()}>
              Print
            </button>
          </Toolbar>
        }
      />
      <StatusBadge status={row.status} tone={toneForStatus(row.status)} />
      {entityDef.api?.lifecycleActions?.length ? (
        <div className="row" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
          {entityDef.api.lifecycleActions.map((action) => (
            <Button
              key={action.id}
              variant={action.tone === "danger" ? "danger" : action.tone === "ghost" ? "ghost" : "primary"}
              disabled={lifecycleBusy !== null}
              onClick={() => void runLifecycle(action)}
            >
              {lifecycleBusy === action.id ? "Working…" : action.label}
            </Button>
          ))}
        </div>
      ) : null}
      <SharedLinkBar
        path={`${module.basePath}/${entityDef.key}/${id}`}
        onCopy={() => {
          void navigator.clipboard?.writeText(
            `${window.location.origin}${module.basePath}/${entityDef.key}/${id}`,
          );
          toast({ tone: "ok", title: "Link copied" });
        }}
      />
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
            <Timeline items={activityItems} />
          </div>
        </section>
      ) : null}

      {tab === "notes" ? (
        <section className="ws-card">
          <div className="ws-card__body stack">
            <CollaborationFeed
              items={noteItems}
              onReact={(id, emoji) => reactTo("notes", id, emoji)}
              emptyLabel="No shared notes yet."
            />
            <CollaborationComposer
              value={note}
              onChange={setNote}
              placeholder="Add a shared note… use @ to mention"
              submitLabel="Save note"
              onSubmit={() => {
                if (!note.trim()) return;
                saveCollabItem("notes", note.trim());
                setNote("");
                toast({ tone: "ok", title: "Note saved" });
              }}
            />
          </div>
        </section>
      ) : null}

      {tab === "comments" ? (
        <section className="ws-card">
          <div className="ws-card__body stack">
            <CollaborationFeed
              items={commentItems}
              onReact={(id, emoji) => reactTo("comments", id, emoji)}
              emptyLabel="No comments yet."
            />
            <CollaborationComposer
              value={comment}
              onChange={setComment}
              placeholder="Rich comment… @mention colleagues"
              submitLabel="Post comment"
              onSubmit={() => {
                if (!comment.trim()) return;
                saveCollabItem("comments", comment.trim());
                setComment("");
                toast({ tone: "ok", title: "Comment added" });
              }}
            />
          </div>
        </section>
      ) : null}

      {tab === "attachments" ? (
        <section className="ws-card">
          <div className="ws-card__body stack">
            <FileDropzone
              onRegistered={(files) => {
                setStagedFiles((prev) => [...files, ...prev]);
                for (const f of files) {
                  addCollab(
                    module.id,
                    entityDef.key,
                    id,
                    "attachments",
                    `${f.name} (v${f.version})`,
                  );
                }
                setTick((x) => x + 1);
                toast({
                  tone: "ok",
                  title: "Files staged",
                  body: "Preview locally; DAM upload API remains for durable assets.",
                });
              }}
            />
            <FilePreviewPanel files={stagedFiles} />
            <ul className="ws-feed">
              {collab.attachments.map((a, i) => (
                <li key={`${a}-${i}`}>
                  <strong>{a}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
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
      if (entity!.api?.uploadAsset && mode === "create") {
        if (!user?.companyId) {
          setError("Signed-in user is missing companyId — required for DAM upload.");
          return;
        }
        const res = await api.upload({
          companyId: user.companyId,
          name: values.name || values.title || "asset",
          mimeType: values.mimeType || "application/octet-stream",
          assetType: values.assetType || "document",
        });
        setLastCorrelationId(res.correlationId);
        const id =
          entity!.api.extractCreateId?.(res.data) ??
          `asset-${Date.now()}`;
        const mapped =
          entity!.api.mapEntity?.(res.data) ??
          ({
            id,
            title: values.name || values.title || id,
            status: "Draft",
            meta: { ...values, Type: values.assetType || "document" },
            source: "api" as const,
          } satisfies RecordRow);
        saveLocalRecord(module.id, entity!.key, mapped);
        toast({ tone: "ok", title: "Asset uploaded", body: id });
        navigate(`${module.basePath}/${entity!.key}/${mapped.id}`);
        return;
      }

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

      if (
        entity!.api?.updateCommandType &&
        entity!.api.buildUpdatePayload &&
        mode === "edit" &&
        recordId
      ) {
        if (!user?.companyId) {
          setError("Signed-in user is missing companyId — required for API commands.");
          return;
        }
        const payload = entity!.api.buildUpdatePayload(user.companyId, recordId, values);
        const res = await api.dispatchCommand({
          commandType: entity!.api.updateCommandType,
          payload,
          idempotencyKey: crypto.randomUUID(),
        });
        setLastCorrelationId(res.correlationId);
        const mapped =
          entity!.api.mapEntity?.(res.data) ??
          ({
            id: recordId,
            title: values.title || values.name || values.number || recordId,
            status: "Open",
            meta: { ...values },
            source: "api" as const,
          } satisfies RecordRow);
        saveLocalRecord(module.id, entity!.key, mapped);
        toast({ tone: "ok", title: `${entity!.label} updated`, body: recordId });
        navigate(`${module.basePath}/${entity!.key}/${recordId}`);
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
        body: entity!.api?.createCommandType || entity!.api?.updateCommandType
          ? "Fill required API fields to dispatch the live command."
          : "Presentation record stored in this browser — no matching backend command.",
      });
      navigate(`${module.basePath}/${entity!.key}/${id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setLastCorrelationId(err.correlationId);
        const forbidden =
          err.status === 403 ||
          err.category === "authorization" ||
          err.code.includes("forbidden") ||
          err.code.includes("denied");
        setError(
          forbidden
            ? `Forbidden by Policy (${err.code}) — UI never authorizes.`
            : `${err.message} (${err.code})`,
        );
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
          entity.api?.updateCommandType && mode === "edit"
            ? `Dispatches ${entity.api.updateCommandType} — Policy/Workflow enforced on the server.`
            : entity.api?.createCommandType
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
