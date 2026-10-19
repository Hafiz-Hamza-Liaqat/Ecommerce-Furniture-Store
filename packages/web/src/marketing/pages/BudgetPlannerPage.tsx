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
import {
  enqueueLead,
  getCompareIds,
  getWishlistIds,
  savePlan,
  toggleCompare,
  toggleWishlist,
} from "../cx/stores";
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
import {
  packageModeFromManual,
  shouldAutoRegeneratePackage,
} from "../cx/intelligent/planner-manual-mode";
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
import { loadProject, mergeProjectsOnLogin, setLocalOwnerId } from "../cx/projects/store";
import { useSession } from "../../state/session";
import {
  buildLineExplanations,
  findTemplateRole,
  groupVariants,
  recordCatalogGap,
  relatedProducts,
  unitPriceForSelection,
  type DesignPreferences,
} from "../cx/configurator";
import { ChangeProductDrawer } from "../cx/configurator/ui/ChangeProductDrawer";
import { DesignPrefsBar } from "../cx/configurator/ui/DesignPrefsBar";

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
  variantIds?: string[];
  explanationBullets?: string[];
};

function lineUnitPrice(line: EditableLine): number {
  return unitPriceForSelection(line.product, line.variantIds ?? []);
}

function cloneOptimized(result: OptimizationResult): EditableLine[] {
  return result.lines.map((l) => ({
    product: l.product,
    qty: l.qty,
    role: l.role,
    zone: l.zone,
    reason: l.reason,
    variantIds: [],
  }));
}

function lineTotal(lines: readonly EditableLine[]): number {
  return lines.reduce((sum, l) => sum + lineUnitPrice(l) * l.qty, 0);
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
        `<tr><td>${escapeHtml(l.zone ?? "")}</td><td>${escapeHtml(l.role)}</td><td>${escapeHtml(l.product.name)}</td><td>${l.qty}</td><td>${escapeHtml(formatPkr(lineUnitPrice(l) * l.qty))}</td></tr>`,
    )
    .join("");
  const conceptual = opts.conceptual
    .map(
      (c) =>
        `<li><strong>${escapeHtml(c.role)}</strong> (qty ${c.qty}) — ${escapeHtml(c.note)}</li>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(opts.title)}</title>
<style>
body{font-family:Georgia,serif;color:#14201a;padding:2rem;max-width:800px;margin:auto}
h1{font-size:1.5rem} table{width:100%;border-collapse:collapse;margin-top:1rem}
th,td{border:1px solid #ccc;padding:.5rem;text-align:left;font-size:.9rem}
.meta{color:#555;font-size:.9rem}
@media print{button{display:none}}
</style></head><body>
<h1>${escapeHtml(opts.title)}</h1>
<p class="meta">${escapeHtml(opts.template)} · ${escapeHtml(opts.style)} · ${opts.seats} seats · Budget ${escapeHtml(formatPkr(opts.budget))}</p>
<table><thead><tr><th>Zone</th><th>Role</th><th>Product</th><th>Qty</th><th>Line total</th></tr></thead>
<tbody>${rows}</tbody></table>
<p><strong>Package total: ${escapeHtml(formatPkr(opts.total))}</strong></p>
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
    a.download = `afh-planner-${opts.template.replace(/[^a-zA-Z0-9_-]/g, "_")}.html`;
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
  const [manualEditCount, setManualEditCount] = useState(0);
  const [designPrefs, setDesignPrefs] = useState<DesignPreferences>({});
  const [changeLineIndex, setChangeLineIndex] = useState<number | null>(null);
  const [wishRev, setWishRev] = useState(0);
  void wishRev;

  const [projectRevision, setProjectRevision] = useState(0);
  const [loadedProject, setLoadedProject] = useState<FurnishingProject | null>(null);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);
  const { user } = useSession();

  useEffect(() => {
    setLoadedProject(projectId ? getProject(projectId) : null);
  }, [projectId, projectRevision]);

  useEffect(() => {
    if (!projectIdParam) {
      setProjectLoadError(null);
      return;
    }
    setProjectLoadError(null);

    // Align local owner with session before access checks (continuity regression).
    if (user?.id) {
      mergeProjectsOnLogin(user.id, user.email ?? user.id);
    }

    let project = getProject(projectIdParam);
    if (!project) {
      const raw = loadProject(projectIdParam);
      if (raw) {
        setLocalOwnerId(raw.ownerId);
        project = getProject(projectIdParam);
      }
    }
    if (!project) {
      setProjectLoadError(
        "No project found with this ID (missing or inaccessible). Open Design Studio to continue, or start a new plan without a project link.",
      );
      setBooting(false);
      return;
    }
    const room =
      project.rooms.find((r) => r.id === roomIdParam) ??
      project.rooms.find((r) => r.id === project.activeRoomId) ??
      project.rooms[0];
    if (!room) {
      setProjectLoadError("This project has no rooms to open in the planner.");
      setBooting(false);
      return;
    }
    const restored = restorePlannerFromRoom(room);
    if (!restored) {
      setProjectLoadError("Could not restore planner state for this project.");
      setBooting(false);
      return;
    }

    // Empty new projects: seed AI lines unless the user already customized
    // (e.g. removed items and refreshed — do not bring them back).
    const customized = room.packageCustomized === true;
    let nextLines = restored.lines;
    if (nextLines.length === 0 && !customized) {
      const seedPlan = planFromBrief(restored.brief);
      const seedResult =
        seedPlan.results.find((r) => r.tier === restored.activeTier) ?? seedPlan.primaryResult;
      if (seedResult) {
        nextLines = cloneOptimized(seedResult);
      }
    }

    setProjectId(project.id);
    setProjectTitle(project.title);
    setActiveRoomId(room.id);
    setTemplateId(restored.templateId);
    setBrief(restored.brief);
    setActive(restored.activeTier);
    setLines(
      nextLines.map((l) => ({
        product: l.product,
        qty: l.qty,
        role: l.role,
        ...(l.zone ? { zone: l.zone } : {}),
        ...(l.variantIds?.length ? { variantIds: [...l.variantIds] } : {}),
      })),
    );
    setRestoredFromProject(true);
    setManualLines(customized);
    setManualEditCount(customized ? 1 : 0);
    setBooting(false);
  }, [projectIdParam, roomIdParam, user?.id, user?.email]);

  useEffect(() => {
    if (restoredFromProject) return;
    if (manualLines) return;
    setBrief(createDefaultBrief(templateId));
    setActive("recommended");
  }, [templateId, restoredFromProject, manualLines]);

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
    if (
      !shouldAutoRegeneratePackage({
        manualLines,
        restoredFromProject,
        lineCount: lines.length,
      })
    ) {
      // Critical: never leave skeleton visible after lock / restore skips regen.
      setBooting(false);
      return;
    }
    if (!result) {
      setBooting(false);
      return;
    }
    let cancelled = false;
    setBooting(true);
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setLines(cloneOptimized(result));
      setBooting(false);
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [result, manualLines, restoredFromProject, lines.length]);

  const total = lineTotal(lines);
  const { remaining, percent } = utilization(brief.budgetPkr ?? 0, total);
  const questions = discoveryQuestions(templateId);
  const style = (brief.style as PlannerStyle | undefined) ?? "modern";
  const packageMode = packageModeFromManual(manualLines);

  const tierLabel = (tier: string, name: string) => {
    if (templateId !== "jahez") return name;
    if (tier === "economy") return "Jahez Economy";
    if (tier === "recommended") return "Jahez Standard";
    return "Jahez Premium / Luxury";
  };

  /** Enter User Customized mode — blocks automatic package regeneration. */
  function markPackageCustomized(bumpChange: boolean) {
    setManualLines(true);
    if (bumpChange) {
      setManualEditCount((n) => n + 1);
    } else {
      setManualEditCount((n) => (n === 0 ? 1 : n));
    }
  }

  function linesToSnapshot(nextLines: EditableLine[]) {
    return nextLines.map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      qty: l.qty,
      role: l.role,
      ...(l.zone ? { zone: l.zone } : {}),
      unitPkr: lineUnitPrice(l),
      ...(l.variantIds?.length ? { variantIds: [...l.variantIds] } : {}),
    }));
  }

  function enrichLine(line: EditableLine): EditableLine {
    const roleDef = findTemplateRole(templateId, line.role);
    if (!roleDef) return line;
    const variantLabels = (line.variantIds ?? [])
      .map((id) => line.product.variants.find((v) => v.id === id)?.label)
      .filter((x): x is string => Boolean(x));
    const bullets = buildLineExplanations({
      product: line.product,
      role: roleDef,
      brief,
      prefs: designPrefs,
      ...(variantLabels.length ? { variantLabels } : {}),
    });
    return {
      ...line,
      ...(bullets[0] ? { reason: bullets[0] } : line.reason ? { reason: line.reason } : {}),
      explanationBullets: bullets,
    };
  }

  function applyConfiguredLine(index: number, patch: Partial<EditableLine>, bump: boolean) {
    const next = lines.map((row, idx) => {
      if (idx !== index) return row;
      return enrichLine({ ...row, ...patch });
    });
    applyPackageLines(next, bump);
  }

  function openChangeProduct(index: number) {
    const line = lines[index];
    if (!line) return;
    const roleDef = findTemplateRole(templateId, line.role);
    if (!roleDef) {
      recordCatalogGap({
        role: line.role,
        templateId,
        requiredQty: line.qty,
        availableCount: 0,
      });
    }
    setChangeLineIndex(index);
  }

  /** Persist current (or provided) lines so Remove/Qty survive refresh. */
  function persistPackageLines(
    nextLines: EditableLine[],
    versionSummary: string,
    packageCustomized: boolean,
  ): void {
    if (!projectId || !result || !pkg) return;
    const roomName = loadedProject?.rooms.find((r) => r.id === activeRoomId)?.name;
    const totalPkr = lineTotal(nextLines);
    upsertRoomSnapshot(
      projectId,
      {
        ...(activeRoomId ? { roomId: activeRoomId } : {}),
        ...(roomName ? { name: roomName } : {}),
        templateId,
        brief,
        activeTier: active,
        lines: linesToSnapshot(nextLines),
        totalPkr,
        packageName: tierLabel(pkg.tier, pkg.name),
        explanations: result.explanations,
        upgrades: result.upgrades,
        downgrades: result.downgrades,
        packageCustomized,
      },
      versionSummary,
    );
    setProjectRevision((r) => r + 1);
  }

  function applyPackageLines(nextLines: EditableLine[], bumpChange: boolean) {
    markPackageCustomized(bumpChange);
    setLines(nextLines);
    persistPackageLines(nextLines, "Package line edit", true);
  }

  /** Only exit from User Customized mode — regenerate from current AI result. */
  function resetToAiPackage() {
    if (!result) return;
    const nextLines = cloneOptimized(result);
    setManualLines(false);
    setManualEditCount(0);
    setRestoredFromProject(false);
    setBooting(true);
    setLines(nextLines);
    setBooting(false);
    persistPackageLines(nextLines, "Reset to AI package", false);
  }

  const updateFlag = (id: string, value: boolean) => {
    setBrief((b) => ({ ...b, flags: { ...b.flags, [id]: value } }));
    setRestoredFromProject(false);
    // Do not exit customized mode — only Reset to AI Package does.
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
        unitPkr: lineUnitPrice(l),
        ...(l.variantIds?.length ? { variantIds: [...l.variantIds] } : {}),
      })),
      totalPkr: total,
      packageName: tierLabel(pkg.tier, pkg.name),
      explanations: result.explanations,
      upgrades: result.upgrades,
      downgrades: result.downgrades,
      packageCustomized: manualLines,
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
    setLines(
      restored.lines.map((l) => ({
        product: l.product,
        qty: l.qty,
        role: l.role,
        ...(l.zone ? { zone: l.zone } : {}),
        ...(l.variantIds?.length ? { variantIds: [...l.variantIds] } : {}),
      })),
    );
    setRestoredFromProject(true);
    setManualLines(room.packageCustomized === true);
    setManualEditCount(room.packageCustomized ? 1 : 0);
  }

  const updateNumber = (id: string, value: number) => {
    setRestoredFromProject(false);
    // Do not exit customized mode — only Reset to AI Package does.
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
        {projectLoadError ? (
          <p className="site-form-error" role="alert">
            {projectLoadError}{" "}
            <Link to="/my-projects">Back to Design Studio</Link>
            {" · "}
            <Link
              to="/planner"
              onClick={() => {
                setProjectLoadError(null);
                setProjectId(null);
              }}
            >
              Start a new plan
            </Link>
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

      <section className="site-section cx-design-prefs-section" aria-label="Design preferences">
        <h2 className="cx-planner-section-title">Design preferences</h2>
        <p className="cx-muted">
          Soft-rank alternatives and explanations — does not rebuild your package.
        </p>
        <DesignPrefsBar prefs={designPrefs} onChange={setDesignPrefs} />
      </section>

      <section className="site-section cx-planner-result" aria-live="polite">
        <div className="cx-planner-result__head">
          <h2>{tierLabel(pkg.tier, pkg.name)}</h2>
          <p
            className={`cx-planner-mode${packageMode === "customized" ? " is-customized" : ""}`}
            role="status"
            aria-live="polite"
          >
            {packageMode === "customized" ? (
              <>
                Customized by You
                {manualEditCount > 0 ? (
                  <span className="cx-planner-mode__edits">
                    {" "}
                    · {manualEditCount} manual {manualEditCount === 1 ? "change" : "changes"}
                  </span>
                ) : null}
              </>
            ) : (
              <>AI Generated</>
            )}
          </p>
        </div>
        {packageMode === "customized" ? (
          <p className="cx-muted cx-planner-mode-hint">
            Your line edits are locked. Use Reset to AI Package to discard them and regenerate.
          </p>
        ) : null}
        <div className="cx-planner-result__tools">
          <button
            type="button"
            className="site-btn site-btn--outline"
            onClick={resetToAiPackage}
            disabled={!result || packageMode === "ai"}
          >
            Reset to AI Package
          </button>
        </div>
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
              {lines.map((l, i) => {
                const roleDef = findTemplateRole(templateId, l.role);
                const unit = lineUnitPrice(l);
                const groups = groupVariants(l.product);
                const matching = relatedProducts(l.product, "MatchingCollection").slice(0, 3);
                const bullets =
                  l.explanationBullets ??
                  (roleDef
                    ? buildLineExplanations({
                        product: l.product,
                        role: roleDef,
                        brief,
                        prefs: designPrefs,
                      })
                    : l.reason
                      ? [l.reason]
                      : []);
                return (
                  <li key={`${l.product.id}-${l.role}-${i}`} className="cx-planner-line-card">
                    <div className="cx-planner-line cx-planner-line--config">
                      <div className="cx-planner-line__main">
                        {l.zone ? <span className="cx-planner-zone">{l.zone}</span> : null}
                        <p className="cx-planner-line__role">{l.role}</p>
                        <Link to={`/products/${l.product.id}`} className="cx-planner-line__product">
                          {l.product.name}
                        </Link>
                        <p className="cx-muted cx-planner-line__meta">
                          {[l.product.collection, l.product.material, l.product.color]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {bullets.length > 0 ? (
                          <ul className="cx-planner-line__why">
                            {bullets.slice(0, 5).map((b) => (
                              <li key={b}>{b}</li>
                            ))}
                          </ul>
                        ) : null}
                        {matching.length > 0 ? (
                          <p className="cx-muted cx-planner-line__related">
                            Matching collection:{" "}
                            {matching.map((p) => p.name).join(", ")}
                          </p>
                        ) : null}
                        {groups.length > 0 ? (
                          <div className="cx-planner-variants" role="group" aria-label="Variants">
                            {groups.map((g) => (
                              <label key={g.group}>
                                {g.group}
                                <select
                                  value={
                                    l.variantIds?.find((id) =>
                                      g.variants.some((v) => v.id === id),
                                    ) ?? ""
                                  }
                                  onChange={(e) => {
                                    const selected = e.target.value;
                                    const otherGroups = (l.variantIds ?? []).filter(
                                      (id) => !g.variants.some((v) => v.id === id),
                                    );
                                    const nextIds = selected
                                      ? [...otherGroups, selected]
                                      : otherGroups;
                                    applyConfiguredLine(
                                      i,
                                      { variantIds: nextIds },
                                      false,
                                    );
                                  }}
                                >
                                  <option value="">Base</option>
                                  {g.variants.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.label}
                                      {v.priceDeltaPkr
                                        ? ` (${v.priceDeltaPkr > 0 ? "+" : ""}${formatPkr(v.priceDeltaPkr)})`
                                        : ""}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ))}
                          </div>
                        ) : null}
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
                            const next = lines.map((row, idx) =>
                              idx === i ? { ...row, qty } : row,
                            );
                            applyPackageLines(next, false);
                          }}
                        />
                      </label>
                      <span className="cx-planner-line__price">{formatPkr(unit * l.qty)}</span>
                      <div className="cx-planner-line__actions">
                        <button
                          type="button"
                          className="site-btn site-btn--outline"
                          onClick={() => openChangeProduct(i)}
                          disabled={!roleDef}
                        >
                          Change Product
                        </button>
                        <button
                          type="button"
                          className="site-btn site-btn--ghost"
                          onClick={() => {
                            const next = lines.filter((_, idx) => idx !== i);
                            applyPackageLines(next, true);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {result.conceptual.length > 0 ? (
              <div className="cx-planner-conceptual" role="note">
                <h3>No exact catalog match available</h3>
                <p className="cx-muted">
                  We can manufacture these roles or connect you with Sales — we never invent catalogue SKUs.
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
                <div className="cx-planner-conceptual__actions">
                  <button
                    type="button"
                    className="site-btn site-btn--primary"
                    onClick={() => {
                      for (const c of result.conceptual) {
                        recordCatalogGap({
                          role: c.role,
                          templateId,
                          requiredQty: c.qty,
                          availableCount: 0,
                        });
                      }
                      enqueueLead({
                        intent: "Custom manufacturing request",
                        name: user?.email ? "Studio customer" : "Planner visitor",
                        email: user?.email ?? "visitor@example.com",
                        message: `Custom manufacturing request · ${TEMPLATE_LABELS[templateId]} · ${result.conceptual.map((c) => c.role).join(", ")}`,
                        source: "planner-custom-manufacturing",
                        meta: {
                          templateId,
                          roles: result.conceptual.map((c) => c.role),
                          ...(projectId && loadedProject
                            ? buildCrmProjectMeta(loadedProject)
                            : {}),
                        },
                      });
                      setSavedMsg("Custom manufacturing request queued for Sales.");
                    }}
                  >
                    Request Custom Manufacturing
                  </button>
                  <Link to="/contact" className="site-btn site-btn--outline">
                    Request Sales Consultation
                  </Link>
                </div>
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
                    unitPkr: lineUnitPrice(l),
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
                  unitPkr: lineUnitPrice(l),
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

      {changeLineIndex != null && lines[changeLineIndex] && findTemplateRole(templateId, lines[changeLineIndex]!.role) ? (
        <ChangeProductDrawer
          open
          role={findTemplateRole(templateId, lines[changeLineIndex]!.role)!}
          currentProduct={lines[changeLineIndex]!.product}
          qty={lines[changeLineIndex]!.qty}
          prefs={designPrefs}
          onClose={() => setChangeLineIndex(null)}
          onSelect={(product) => {
            const idx = changeLineIndex;
            applyConfiguredLine(
              idx,
              {
                product,
                variantIds: [],
              },
              true,
            );
            setChangeLineIndex(null);
          }}
          onToggleWishlist={(id) => {
            toggleWishlist(id);
            setWishRev((n) => n + 1);
          }}
          onToggleCompare={(id) => {
            toggleCompare(id);
            setWishRev((n) => n + 1);
          }}
          wishlistIds={getWishlistIds()}
          compareIds={getCompareIds()}
          onRequestCustom={() => {
            const line = lines[changeLineIndex];
            if (!line) return;
            recordCatalogGap({
              role: line.role,
              templateId,
              requiredQty: line.qty,
              availableCount: 0,
            });
            enqueueLead({
              intent: "Custom manufacturing request",
              name: user?.email ? "Studio customer" : "Planner visitor",
              email: user?.email ?? "visitor@example.com",
              message: `Custom manufacturing for role ${line.role}`,
              source: "planner-custom-manufacturing",
              meta: { role: line.role, templateId, projectId },
            });
            setSavedMsg("Custom manufacturing request queued for Sales.");
            setChangeLineIndex(null);
          }}
          onRequestConsult={() => {
            setChangeLineIndex(null);
            window.location.href = "/contact";
          }}
        />
      ) : null}
    </>
  );
}
