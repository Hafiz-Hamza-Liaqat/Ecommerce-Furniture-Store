/**
 * RC9.3 — Intelligent Budget Planner & Space Planning UI.
 * Visual surface for the shared grounded planner engine (also used by the AI Consultant).
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { formatPkr, type CatalogueProduct } from "../data/catalogue";
import { utilization, type PlannerStyle } from "../cx/budget-planner";
import { enqueueLead, savePlan } from "../cx/stores";
import { saveConsultantMemory } from "../cx/consultant";
import {
  TEMPLATE_LABELS,
  createDefaultBrief,
  discoveryQuestions,
  endUseForTemplate,
  type SpaceBrief,
  type SpaceTemplateId,
} from "../cx/intelligent/space-brief";
import { planFromBrief, estimateQuantities } from "../cx/intelligent/planner";
import type { OptimizationResult } from "../cx/intelligent/optimize";
import { toPlannerStyle } from "../cx/intelligent/nlu";
import { buildPlannerHandoff, savePlannerHandoff } from "../cx/intelligent/handoff";
import {
  addRoom,
  buildCrmProjectMeta,
  createProject,
  duplicateRoom,
  getProject,
  recordQuote,
  restorePlannerFromRoom,
  setActiveRoom as setProjectActiveRoom,
  upsertRoomSnapshot,
  type FurnishingProject,
} from "../cx/projects";

const TEMPLATES: SpaceTemplateId[] = [
  "office",
  "home",
  "jahez",
  "hotel",
  "restaurant",
  "cafe",
  "school",
  "university",
  "hospital",
  "clinic",
  "coworking",
  "retail",
  "government",
];

type EditableLine = {
  product: CatalogueProduct;
  qty: number;
  role: string;
  zone?: string;
  reason?: string;
};

function cloneOptimized(result: OptimizationResult): EditableLine[] {
  return result.lines.map((l) => ({
    product: l.product,
    qty: l.qty,
    role: l.role,
    zone: l.zone,
    reason: l.reason,
  }));
}

function lineTotal(lines: readonly EditableLine[]): number {
  return lines.reduce((sum, l) => sum + l.product.pricePkr * l.qty, 0);
}

function buildQuoteQuery(lines: readonly EditableLine[], total: number, projectId?: string | null): string {
  const ids = lines.map((l) => `${l.product.id}:${l.qty}`).join(",");
  const params = new URLSearchParams({
    from: "planner",
    lines: ids,
    total: String(total),
  });
  if (projectId) params.set("projectId", projectId);
  return `/quote?${params.toString()}`;
}

function downloadPlannerPdf(opts: {
  title: string;
  budget: number;
  template: string;
  style: string;
  seats: number;
  lines: readonly EditableLine[];
  conceptual: OptimizationResult["conceptual"];
  total: number;
}) {
  const rows = opts.lines
    .map(
      (l) =>
        `<tr><td>${l.zone ?? ""}</td><td>${l.role}</td><td>${l.product.name}</td><td>${l.qty}</td><td>${formatPkr(l.product.pricePkr * l.qty)}</td></tr>`,
    )
    .join("");
  const conceptual = opts.conceptual
    .map((c) => `<li><strong>${c.role}</strong> (qty ${c.qty}) — ${c.note}</li>`)
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${opts.title}</title>
<style>
body{font-family:Georgia,serif;color:#14201a;padding:2rem;max-width:800px;margin:auto}
h1{font-size:1.5rem} table{width:100%;border-collapse:collapse;margin-top:1rem}
th,td{border:1px solid #ccc;padding:.5rem;text-align:left;font-size:.9rem}
.meta{color:#555;font-size:.9rem}
@media print{button{display:none}}
</style></head><body>
<h1>${opts.title}</h1>
<p class="meta">${opts.template} · ${opts.style} · ${opts.seats} seats · Budget ${formatPkr(opts.budget)}</p>
<table><thead><tr><th>Zone</th><th>Role</th><th>Product</th><th>Qty</th><th>Line total</th></tr></thead>
<tbody>${rows}</tbody></table>
<p><strong>Package total: ${formatPkr(opts.total)}</strong></p>
${conceptual ? `<h2>Conceptual (not catalogue SKUs)</h2><ul>${conceptual}</ul>` : ""}
<p class="meta">AFH presentation estimate — Sales quotation remains authoritative. All listed products are catalogue-grounded.</p>
<button onclick="window.print()">Print / Save as PDF</button>
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `afh-planner-${opts.template}.html`;
    a.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function briefSeats(brief: SpaceBrief): number {
  return brief.seats ?? brief.employeeCount ?? brief.hotelRooms ?? brief.classrooms ?? 1;
}

export function BudgetPlannerPage() {
  const [params] = useSearchParams();
  const projectIdParam = params.get("projectId");
  const roomIdParam = params.get("roomId");
  const initialTemplate = (params.get("template") as SpaceTemplateId) || "office";
  const [templateId, setTemplateId] = useState<SpaceTemplateId>(
    TEMPLATES.includes(initialTemplate) ? initialTemplate : "office",
  );
  const [brief, setBrief] = useState<SpaceBrief>(() =>
    createDefaultBrief(TEMPLATES.includes(initialTemplate) ? initialTemplate : "office"),
  );
  const [active, setActive] = useState<"economy" | "recommended" | "premium">("recommended");
  const [savedMsg, setSavedMsg] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [booting, setBooting] = useState(true);
  const [showDiscovery, setShowDiscovery] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(projectIdParam);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(roomIdParam);
  const [projectTitle, setProjectTitle] = useState("");
  const [restoredFromProject, setRestoredFromProject] = useState(false);
  const [manualLines, setManualLines] = useState(false);

  const [projectRevision, setProjectRevision] = useState(0);
  const [loadedProject, setLoadedProject] = useState<FurnishingProject | null>(null);

  useEffect(() => {
    setLoadedProject(projectId ? getProject(projectId) : null);
  }, [projectId, projectRevision]);

  useEffect(() => {
    if (!projectIdParam) return;
    const project = getProject(projectIdParam);
    if (!project) return;
    const room =
      project.rooms.find((r) => r.id === roomIdParam) ??
      project.rooms.find((r) => r.id === project.activeRoomId) ??
      project.rooms[0];
    if (!room) return;
    const restored = restorePlannerFromRoom(room);
    if (!restored) return;
    setProjectId(project.id);
    setProjectTitle(project.title);
    setActiveRoomId(room.id);
    setTemplateId(restored.templateId);
    setBrief(restored.brief);
    setActive(restored.activeTier);
    setLines(restored.lines);
    setRestoredFromProject(true);
    setManualLines(restored.lines.length > 0);
    setBooting(false);
  }, [projectIdParam, roomIdParam]);

  useEffect(() => {
    if (restoredFromProject) return;
    setBrief(createDefaultBrief(templateId));
    setActive("recommended");
    setManualLines(false);
  }, [templateId, restoredFromProject]);

  const plan = useMemo(() => planFromBrief(brief), [brief]);
  const qtyPreview = useMemo(() => estimateQuantities(brief), [brief]);
  /** Presentation-only grouping — same estimateQuantities data, no logic change. */
  const qtyByZone = useMemo(() => {
    const map = new Map<string, { role: string; qty: number }[]>();
    for (const q of qtyPreview) {
      const items = map.get(q.zone) ?? [];
      items.push({ role: q.role, qty: q.qty });
      map.set(q.zone, items);
    }
    return [...map.entries()].map(([zone, items]) => ({ zone, items }));
  }, [qtyPreview]);
  const result = plan.results.find((r) => r.tier === active) ?? plan.primaryResult;
  const pkg = plan.packages.find((p) => p.tier === active) ?? plan.primary;

  useEffect(() => {
    if (manualLines || restoredFromProject) return;
    setBooting(true);
    const t = window.setTimeout(() => {
      setLines(cloneOptimized(result));
      setBooting(false);
    }, 220);
    return () => window.clearTimeout(t);
  }, [result, manualLines, restoredFromProject]);

  const total = lineTotal(lines);
  const { remaining, percent } = utilization(brief.budgetPkr ?? 0, total);
  const questions = discoveryQuestions(templateId);
  const style = (brief.style as PlannerStyle | undefined) ?? "modern";

  const tierLabel = (tier: string, name: string) => {
    if (templateId !== "jahez") return name;
    if (tier === "economy") return "Jahez Economy";
    if (tier === "recommended") return "Jahez Standard";
    return "Jahez Premium / Luxury";
  };

  const updateFlag = (id: string, value: boolean) => {
    setBrief((b) => ({ ...b, flags: { ...b.flags, [id]: value } }));
    setRestoredFromProject(false);
    setManualLines(false);
  };

  function persistCurrentProject(versionSummary = "Planner save"): string | null {
    const roomName = loadedProject?.rooms.find((r) => r.id === activeRoomId)?.name;
    const snapshot = {
      ...(activeRoomId ? { roomId: activeRoomId } : {}),
      ...(roomName ? { name: roomName } : {}),
      templateId,
      brief,
      activeTier: active,
      lines: lines.map((l) => ({
        productId: l.product.id,
        name: l.product.name,
        qty: l.qty,
        role: l.role,
        ...(l.zone ? { zone: l.zone } : {}),
        unitPkr: l.product.pricePkr,
      })),
      totalPkr: total,
      packageName: tierLabel(pkg.tier, pkg.name),
      explanations: result.explanations,
      upgrades: result.upgrades,
      downgrades: result.downgrades,
    };
    if (projectId) {
      upsertRoomSnapshot(projectId, snapshot, versionSummary);
      setProjectRevision((r) => r + 1);
      return projectId;
    }
    const created = createProject({
      title: projectTitle || `${TEMPLATE_LABELS[templateId]} plan`,
      templateId,
      room: {
        name: TEMPLATE_LABELS[templateId],
        templateId,
        brief,
        activeTier: active,
        lines: snapshot.lines,
        totalPkr: total,
        explanations: result.explanations,
        upgrades: result.upgrades,
        downgrades: result.downgrades,
        packageName: snapshot.packageName,
        notes: [],
      },
    });
    setProjectId(created.id);
    setProjectTitle(created.title);
    setActiveRoomId(created.activeRoomId);
    setProjectRevision((r) => r + 1);
    return created.id;
  }

  function switchRoom(roomId: string) {
    if (!projectId) return;
    persistCurrentProject("Room switch autosave");
    const project = getProject(projectId);
    const room = project?.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const restored = restorePlannerFromRoom(room);
    if (!restored) return;
    setProjectActiveRoom(projectId, roomId);
    setActiveRoomId(roomId);
    setTemplateId(restored.templateId);
    setBrief(restored.brief);
    setActive(restored.activeTier);
    setLines(restored.lines);
    setRestoredFromProject(true);
    setManualLines(restored.lines.length > 0);
  }

  const updateNumber = (id: string, value: number) => {
    setRestoredFromProject(false);
    setManualLines(false);
    setBrief((b) => {
      switch (id) {
        case "budgetPkr":
          return { ...b, budgetPkr: value };
        case "employeeCount":
          return { ...b, employeeCount: value, seats: value };
        case "seats":
          return { ...b, seats: value };
        case "managers":
          return { ...b, managers: value };
        case "executiveCabins":
          return { ...b, executiveCabins: value };
        case "bedrooms":
          return { ...b, bedrooms: value };
        case "hotelRooms":
          return { ...b, hotelRooms: value, seats: value };
        case "classrooms":
          return { ...b, classrooms: value };
        case "doctorRooms":
          return { ...b, doctorRooms: value };
        case "meetingRooms":
          return { ...b, meetingRooms: value };
        default:
          return b;
      }
    });
  };

  return (
    <>
      <Seo
        title="Intelligent furniture budget planner"
        description="AI-guided space planning and budget-aware furnishing packages grounded in the AFH catalogue."
        path="/planner"
      />
      <header className="site-page-hero">
        <Breadcrumbs items={[{ label: "Budget planner" }]} />
        <p className="site-eyebrow">Space planning</p>
        <h1>Intelligent budget planner</h1>
        <p>
          Guided requirement discovery, industry templates (including Pakistan Jahez), automatic
          quantities, and budget-optimised packages — sharing the same grounded engine as the AI
          Furniture Consultant.
        </p>
        {projectId ? (
          <p className="cx-muted" role="status">
            Project: <strong>{projectTitle || loadedProject?.title}</strong> ·{" "}
            <Link to={`/my-projects`}>My Projects</Link>
          </p>
        ) : null}
      </header>

      {loadedProject && loadedProject.rooms.length > 0 ? (
        <section className="site-section cx-planner-rooms" aria-label="Project rooms">
          <h2 className="cx-planner-section-title">Rooms</h2>
          <div className="cx-planner-room-tabs" role="tablist">
            {[...loadedProject.rooms]
              .sort((a, b) => a.order - b.order)
              .map((room) => (
                <button
                  key={room.id}
                  type="button"
                  role="tab"
                  aria-selected={room.id === activeRoomId}
                  className={room.id === activeRoomId ? "is-active" : ""}
                  onClick={() => switchRoom(room.id)}
                >
                  {room.name}
                </button>
              ))}
          </div>
          <div className="site-hero__actions">
            <button
              type="button"
              className="site-btn site-btn--ghost"
              onClick={() => {
                if (!projectId) return;
                const next = addRoom(projectId, `Room ${(loadedProject?.rooms.length ?? 0) + 1}`);
                if (next) switchRoom(next.activeRoomId);
              }}
            >
              Add room
            </button>
            {activeRoomId ? (
              <button
                type="button"
                className="site-btn site-btn--ghost"
                onClick={() => {
                  if (!projectId || !activeRoomId) return;
                  const next = duplicateRoom(projectId, activeRoomId);
                  if (next) switchRoom(next.activeRoomId);
                }}
              >
                Duplicate room
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="site-section cx-planner-templates" aria-label="Industry templates">
        <h2 className="cx-planner-section-title">1. Choose a programme</h2>
        <div className="cx-planner-template-grid" role="list">
          {TEMPLATES.map((id) => (
            <button
              key={id}
              type="button"
              role="listitem"
              className={`cx-planner-template${templateId === id ? " is-active" : ""}`}
              onClick={() => setTemplateId(id)}
            >
              {TEMPLATE_LABELS[id]}
            </button>
          ))}
        </div>
      </section>

      <section className="site-section cx-planner-discovery">
        <div className="cx-planner-discovery__head">
          <h2 className="cx-planner-section-title">2. Requirement discovery</h2>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            onClick={() => setShowDiscovery((v) => !v)}
            aria-expanded={showDiscovery}
          >
            {showDiscovery ? "Hide questions" : "Show questions"}
          </button>
        </div>
        {showDiscovery ? (
          <form className="site-form cx-planner-form" onSubmit={(e) => e.preventDefault()}>
            {questions.map((q) => {
              if (q.kind === "boolean") {
                return (
                  <label key={q.id} className="cx-planner-check">
                    <input
                      type="checkbox"
                      checked={Boolean(brief.flags[q.id])}
                      onChange={(e) => updateFlag(q.id, e.target.checked)}
                    />
                    {q.label}
                  </label>
                );
              }
              if (q.kind === "choice" && q.id === "style") {
                return (
                  <label key={q.id}>
                    {q.label}
                    <select
                      value={brief.style ?? "modern"}
                      onChange={(e) => {
                        const nextStyle = e.target.value as NonNullable<SpaceBrief["style"]>;
                        setBrief((b) => ({
                          ...b,
                          style: nextStyle,
                        }));
                      }}
                    >
                      {(q.choices ?? ["modern"]).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }
              if (q.kind === "number") {
                const value =
                  q.id === "budgetPkr"
                    ? (brief.budgetPkr ?? 0)
                    : q.id === "employeeCount"
                      ? (brief.employeeCount ?? brief.seats ?? 0)
                      : q.id === "seats"
                        ? (brief.seats ?? 0)
                        : q.id === "managers"
                          ? (brief.managers ?? 0)
                          : q.id === "executiveCabins"
                            ? (brief.executiveCabins ?? 0)
                            : q.id === "bedrooms"
                              ? (brief.bedrooms ?? 0)
                              : q.id === "hotelRooms"
                                ? (brief.hotelRooms ?? 0)
                                : q.id === "classrooms"
                                  ? (brief.classrooms ?? 0)
                                  : q.id === "doctorRooms"
                                    ? (brief.doctorRooms ?? 0)
                                    : q.id === "meetingRooms"
                                      ? (brief.meetingRooms ?? 0)
                                      : 0;
                return (
                  <label key={q.id}>
                    {q.label}
                    <input
                      type="number"
                      min={q.id === "budgetPkr" ? 50_000 : 0}
                      step={q.id === "budgetPkr" ? 50_000 : 1}
                      value={value}
                      onChange={(e) => updateNumber(q.id, Number(e.target.value) || 0)}
                    />
                  </label>
                );
              }
              return null;
            })}
          </form>
        ) : null}
      </section>

      <section className="site-section cx-planner-qty-section" aria-label="Quantity estimates">
        <h2 className="cx-planner-section-title">3. Estimated quantities</h2>
        {qtyByZone.length === 0 ? (
          <p className="cx-muted" role="status">
            No quantity estimates for this brief yet — adjust programme flags above.
          </p>
        ) : (
          <div className="cx-planner-qty-panel">
            {qtyByZone.map(({ zone, items }) => (
              <details key={zone} className="cx-planner-qty-card" open>
                <summary className="cx-planner-qty-card__head">
                  <span className="cx-planner-qty-card__title">{zone}</span>
                  <span className="cx-planner-qty-card__count" aria-hidden="true">
                    {items.length}
                  </span>
                </summary>
                <ul className="cx-planner-qty-card__list">
                  {items.map((item) => (
                    <li key={`${zone}-${item.role}`} className="cx-planner-qty-card__row">
                      <span className="cx-planner-qty-card__role">{item.role}</span>
                      <span className="cx-planner-qty-badge" aria-label={`Quantity ${item.qty}`}>
                        ×{item.qty}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </section>

      <div className="site-section cx-package-tabs" role="tablist" aria-label="Package tiers">
        {plan.packages.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.tier === active}
            className={p.tier === active ? "is-active" : ""}
            onClick={() => setActive(p.tier)}
          >
            {tierLabel(p.tier, p.name)}
          </button>
        ))}
      </div>

      <section className="site-section cx-planner-result" aria-live="polite">
        <h2>{tierLabel(pkg.tier, pkg.name)}</h2>
        {booting ? (
          <div className="cx-skeleton-planner" aria-label="Loading package">
            <div className="cx-skeleton-card__line" />
            <div className="cx-skeleton-card__line" />
            <div className="cx-skeleton-card__line cx-skeleton-card__line--short" />
          </div>
        ) : (
          <>
            <p className="site-product__price">{formatPkr(total)}</p>
            <p>
              Budget utilization <strong>{percent}%</strong> · Remaining{" "}
              <strong>{formatPkr(remaining)}</strong>
            </p>
            <div className="cx-util-bar" aria-hidden="true">
              <span style={{ width: `${Math.min(100, percent)}%` }} />
            </div>

            {result.explanations.length > 0 ? (
              <details className="cx-planner-explain">
                <summary>Why these recommendations</summary>
                <ul>
                  {result.explanations.slice(0, 8).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            {result.upgrades.length > 0 || result.downgrades.length > 0 ? (
              <div className="cx-planner-tips">
                {result.upgrades.length > 0 ? (
                  <div>
                    <h3>Upgrade suggestions</h3>
                    <ul>
                      {result.upgrades.map((u) => (
                        <li key={u}>{u}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {result.downgrades.length > 0 ? (
                  <div>
                    <h3>Budget substitutions</h3>
                    <ul>
                      {result.downgrades.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <ul className="cx-planner-lines">
              {lines.map((l, i) => (
                <li key={`${l.product.id}-${l.role}-${i}`}>
                  <div className="cx-planner-line">
                    <div>
                      {l.zone ? <span className="cx-planner-zone">{l.zone}</span> : null}
                      <Link to={`/products/${l.product.id}`}>
                        {l.role}: {l.product.name}
                      </Link>
                      {l.reason ? <p className="cx-muted cx-planner-reason">{l.reason}</p> : null}
                    </div>
                    <label className="cx-planner-qty">
                      Qty
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={l.qty}
                        onChange={(e) => {
                          const qty = Math.max(1, Math.min(999, Number(e.target.value) || 1));
                          setLines((prev) =>
                            prev.map((row, idx) => (idx === i ? { ...row, qty } : row)),
                          );
                        }}
                      />
                    </label>
                    <span>{formatPkr(l.product.pricePkr * l.qty)}</span>
                    <button
                      type="button"
                      className="site-btn site-btn--ghost"
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {result.conceptual.length > 0 ? (
              <div className="cx-planner-conceptual" role="note">
                <h3>Conceptual recommendations</h3>
                <p className="cx-muted">
                  These are not presented as available AFH catalogue products:
                </p>
                <ul>
                  {result.conceptual.map((c) => (
                    <li key={`${c.role}-${c.note}`}>
                      <strong>
                        {c.zone} · {c.role}
                      </strong>{" "}
                      ×{c.qty} — {c.note}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {lines.length === 0 ? (
              <p className="cx-muted" role="status">
                No grounded catalogue lines for this brief — adjust template flags or budget.
              </p>
            ) : null}
          </>
        )}

        <div className="site-hero__actions">
          <button
            type="button"
            className="site-btn site-btn--ghost"
            disabled={lines.length === 0}
            onClick={() => {
              const id = persistCurrentProject("Saved furnishing project");
              savePlan({
                budgetPkr: brief.budgetPkr ?? 0,
                endUse: endUseForTemplate(templateId),
                style: toPlannerStyle(brief.style),
                seats: briefSeats(brief),
                packageId: pkg.id,
                lineIds: lines.map((l) => l.product.id),
                totalPkr: total,
              });
              setSavedMsg(
                id
                  ? `Project saved — resume anytime from My Projects.`
                  : "Plan saved in this browser.",
              );
            }}
          >
            Save project
          </button>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            disabled={lines.length === 0}
            onClick={() =>
              downloadPlannerPdf({
                title: tierLabel(pkg.tier, pkg.name),
                budget: brief.budgetPkr ?? 0,
                template: TEMPLATE_LABELS[templateId],
                style: String(brief.style ?? style),
                seats: briefSeats(brief),
                lines,
                conceptual: result.conceptual,
                total,
              })
            }
          >
            Export PDF
          </button>
          <Link
            to={lines.length ? buildQuoteQuery(lines, total, projectId) : "/quote"}
            className="site-btn site-btn--primary"
            aria-disabled={lines.length === 0}
            onClick={(e) => {
              if (lines.length === 0) {
                e.preventDefault();
                return;
              }
              const id = persistCurrentProject("Quotation requested");
              if (id) {
                recordQuote(id, {
                  label: tierLabel(pkg.tier, pkg.name),
                  lines: lines.map((l) => ({
                    productId: l.product.id,
                    name: l.product.name,
                    qty: l.qty,
                    unitPkr: l.product.pricePkr,
                  })),
                  totalPkr: total,
                });
              }
            }}
          >
            Convert to quotation
          </Link>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            disabled={lines.length === 0}
            onClick={() => {
              const id = persistCurrentProject("CRM lead");
              const project = id ? getProject(id) : null;
              enqueueLead({
                intent: "Intelligent budget planner inquiry",
                name: "Planner visitor",
                email: "visitor@example.com",
                message: `${tierLabel(pkg.tier, pkg.name)} · ${TEMPLATE_LABELS[templateId]} · seats ${briefSeats(brief)} · budget ${brief.budgetPkr} · total ${total}`,
                source: "budget-planner",
                meta: {
                  packageId: pkg.id,
                  templateId,
                  lineIds: lines.map((l) => l.product.id),
                  quantities: lines.map((l) => ({ id: l.product.id, qty: l.qty, role: l.role })),
                  budget: brief.budgetPkr,
                  total,
                  recommendationSummary: result.explanations.slice(0, 10).join("\n"),
                  upgradeSuggestions: [...result.upgrades],
                  budgetOptimizationNotes: [...result.downgrades],
                  plannerRationale: result.explanations.slice(0, 12),
                  conceptualNotes: result.conceptual.map(
                    (c) => `${c.zone} · ${c.role} ×${c.qty}: ${c.note}`,
                  ),
                  style: brief.style,
                  seats: briefSeats(brief),
                  packageName: tierLabel(pkg.tier, pkg.name),
                  ...(project ? buildCrmProjectMeta(project) : {}),
                },
              });
              setSavedMsg(
                "CRM lead draft queued (local + ready for crm.CreateLead when authenticated).",
              );
            }}
          >
            Create CRM lead
          </button>
          <Link
            to={`/consultant?from=planner&template=${templateId}${projectId ? `&projectId=${projectId}` : ""}`}
            className="site-btn site-btn--ghost"
            onClick={() => {
              const id = persistCurrentProject("Handoff to AI Consultant");
              const handoff = buildPlannerHandoff({
                templateId,
                brief,
                packageName: tierLabel(pkg.tier, pkg.name),
                packageTier: pkg.tier,
                totalPkr: total,
                lines: lines.map((l) => ({
                  productId: l.product.id,
                  name: l.product.name,
                  qty: l.qty,
                  role: l.role,
                  ...(l.zone ? { zone: l.zone } : {}),
                  unitPkr: l.product.pricePkr,
                })),
                explanations: result.explanations,
                upgrades: result.upgrades,
                downgrades: result.downgrades,
              });
              savePlannerHandoff(handoff);
              saveConsultantMemory(handoff.memory);
              if (id) setProjectId(id);
            }}
          >
            Continue in AI Consultant
          </Link>
        </div>
        {savedMsg ? (
          <p className="site-form-success" role="status">
            {savedMsg}
          </p>
        ) : null}
      </section>
    </>
  );
}
