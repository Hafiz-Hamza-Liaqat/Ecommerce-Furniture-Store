/**
 * RC9.4 — Furnishing project service (persistence + collaboration + versions).
 * Reuses RC9.3 planner/consultant data shapes — no duplicate recommendation logic.
 */

import type { ConsultantMemory } from "../intelligent/types";
import type { SpaceBrief, SpaceTemplateId } from "../intelligent/space-brief";
import { TEMPLATE_LABELS, createDefaultBrief } from "../intelligent/space-brief";
import type { PlannerHandoffLine } from "../intelligent/handoff";
import type { ConsultantMessage } from "../stores";
import { pushNotification } from "../../nav/notifications";
import {
  deleteProject,
  getLocalOwnerId,
  listProjectIndex,
  loadProject,
  registerShareToken,
  resolveShareToken,
  saveProject,
  setLocalOwnerId,
  toListItem,
} from "./store";
import type {
  CollaboratorPermission,
  FurnishingProject,
  ProjectCollaborator,
  ProjectListItem,
  ProjectListQuery,
  ProjectNote,
  ProjectQuote,
  ProjectRoom,
  ProjectShareLink,
  ProjectStatus,
  ProjectVersion,
  ProjectVersionDiff,
  SharePermission,
} from "./types";

function now(): string {
  return new Date().toISOString();
}

function uid(): string {
  return crypto.randomUUID();
}

function shareToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

function roomTotal(lines: readonly PlannerHandoffLine[]): number {
  return lines.reduce((s, l) => s + l.unitPkr * l.qty, 0);
}

function projectTotals(project: FurnishingProject): { budget: number; total: number } {
  return {
    budget: project.rooms.reduce((s, r) => s + (r.brief.budgetPkr ?? 0), 0),
    total: project.rooms.reduce((s, r) => s + r.totalPkr, 0),
  };
}

function diffVersions(prev: ProjectVersion | undefined, next: ProjectVersion): ProjectVersionDiff {
  const prevIds = new Set(
    (prev?.rooms ?? []).flatMap((r) => r.lines.map((l) => l.productId)),
  );
  const nextIds = new Set(next.rooms.flatMap((r) => r.lines.map((l) => l.productId)));
  const added = [...nextIds].filter((id) => !prevIds.has(id));
  const removed = [...prevIds].filter((id) => !nextIds.has(id));
  const budgetDelta = next.totalBudgetPkr - (prev?.totalBudgetPkr ?? 0);
  const roomChanges: string[] = [];
  if ((prev?.rooms.length ?? 0) !== next.rooms.length) {
    roomChanges.push(`Rooms: ${prev?.rooms.length ?? 0} → ${next.rooms.length}`);
  }
  return {
    budgetDeltaPkr: budgetDelta,
    productsAdded: added,
    productsRemoved: removed,
    roomChanges,
    ...(next.summary ? { aiSummary: next.summary } : {}),
  };
}

function snapshotVersion(project: FurnishingProject, label: string, summary: string): ProjectVersion {
  const totals = projectTotals(project);
  const prev = project.versions[project.versions.length - 1];
  const versionNumber = (prev?.versionNumber ?? 0) + 1;
  const version: ProjectVersion = {
    id: uid(),
    versionNumber,
    label,
    summary,
    createdAt: now(),
    rooms: [...project.rooms],
    consultantMemory: { ...project.consultantMemory },
    consultantMessages: [...project.consultantMessages].slice(-40),
    status: project.status,
    notes: [...project.notes],
    totalBudgetPkr: totals.budget,
    totalPackagePkr: totals.total,
    diff: diffVersions(prev, {
      id: "",
      versionNumber,
      label,
      summary,
      createdAt: now(),
      rooms: project.rooms,
      consultantMemory: project.consultantMemory,
      consultantMessages: project.consultantMessages,
      status: project.status,
      notes: project.notes,
      totalBudgetPkr: totals.budget,
      totalPackagePkr: totals.total,
    }),
  };
  return version;
}

export type OwnerContext = {
  readonly ownerId?: string;
  readonly ownerLabel?: string;
  readonly customerName?: string;
};

export function createProject(input: {
  title: string;
  templateId: SpaceTemplateId;
  owner?: OwnerContext;
  status?: ProjectStatus;
  room?: Omit<ProjectRoom, "id" | "order">;
  /** Optional free-text summary (stored on project; does not change schema shape). */
  description?: string;
  location?: string;
  /** Optional budget applied to the seed room brief when no room brief is supplied. */
  budgetPkr?: number;
}): FurnishingProject {
  const ownerId = input.owner?.ownerId ?? getLocalOwnerId();
  const ownerLabel = input.owner?.ownerLabel ?? "You";
  // Keep local actor aligned with the project owner so getProject/listProjects
  // succeed after create + navigation (RC10.1 blocker fix).
  setLocalOwnerId(ownerId);

  const baseBrief = input.room?.brief ?? createDefaultBrief(input.templateId);
  const brief =
    input.room?.brief == null && input.budgetPkr != null && Number.isFinite(input.budgetPkr)
      ? { ...baseBrief, budgetPkr: Math.max(0, Math.round(input.budgetPkr)) }
      : baseBrief;
  const lines = input.room?.lines ?? [];
  const room: ProjectRoom = {
    id: uid(),
    name: input.room?.name ?? TEMPLATE_LABELS[input.templateId] ?? "Main space",
    order: 0,
    templateId: input.templateId,
    brief,
    activeTier: input.room?.activeTier ?? "recommended",
    lines,
    totalPkr: input.room?.totalPkr ?? roomTotal(lines),
    explanations: input.room?.explanations ?? [],
    upgrades: input.room?.upgrades ?? [],
    downgrades: input.room?.downgrades ?? [],
    packageName: input.room?.packageName ?? "Recommended package",
    notes: input.room?.notes ?? [],
  };
  const created = now();
  const description = input.description?.trim();
  const location = input.location?.trim();
  const seedNotes: ProjectNote[] = [];
  if (location) {
    seedNotes.push({
      id: uid(),
      text: `Location: ${location}`,
      createdAt: created,
      authorId: ownerId,
      authorLabel: ownerLabel,
    });
  }
  const project: FurnishingProject = {
    id: uid(),
    title: input.title.trim(),
    status: input.status ?? "planning",
    createdAt: created,
    updatedAt: created,
    ownerId,
    ownerLabel,
    ...(input.owner?.customerName ? { customerName: input.owner.customerName } : {}),
    templateId: input.templateId,
    rooms: [room],
    activeRoomId: room.id,
    consultantMemory: {
      spaceTemplateId: input.templateId,
      endUse: brief.endUse,
      ...(brief.budgetPkr != null ? { budgetPkr: brief.budgetPkr } : {}),
      ...(brief.style ? { style: brief.style } : {}),
      spaceFlags: { ...brief.flags },
    },
    consultantMessages: [],
    quotes: [],
    notes: seedNotes,
    collaborators: [
      {
        id: ownerId,
        email: input.owner?.customerName ?? "",
        name: ownerLabel,
        role: "Owner",
        permission: "owner",
        invitedAt: created,
      },
    ],
    shareLinks: [],
    versions: [],
    latestVersionId: "",
    aiAssisted: false,
    ...(description ? { plannerSummary: description } : {}),
  };
  const v = snapshotVersion(project, "Version 1", "Initial project");
  const withVersion: FurnishingProject = {
    ...project,
    versions: [v],
    latestVersionId: v.id,
    updatedAt: now(),
  };
  saveProject(withVersion);
  return withVersion;
}

export function getProject(id: string, actorId?: string): FurnishingProject | null {
  const project = loadProject(id);
  if (!project) return null;
  const actor = actorId ?? getLocalOwnerId();
  if (!canAccessProject(project, actor, "view")) return null;
  return project;
}

export function listProjects(query: ProjectListQuery = {}): ProjectListItem[] {
  let items = listProjectIndex();
  const owner = getLocalOwnerId();
  items = items.filter((p) => {
    const full = loadProject(p.id);
    return full ? canAccessProject(full, owner, "view") : true;
  });
  if (query.status && query.status !== "all") {
    items = items.filter((p) => p.status === query.status);
  }
  if (query.search?.trim()) {
    const q = query.search.trim().toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.customerName?.toLowerCase().includes(q) ?? false) ||
        TEMPLATE_LABELS[p.templateId].toLowerCase().includes(q),
    );
  }
  if (query.customer?.trim()) {
    const c = query.customer.trim().toLowerCase();
    items = items.filter((p) => p.customerName?.toLowerCase().includes(c));
  }
  const sort = query.sort ?? "updated";
  items = [...items].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "budget") return b.budgetPkr - a.budgetPkr;
    if (sort === "created") return b.createdAt.localeCompare(a.createdAt);
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  return items;
}

export function canAccessProject(
  project: FurnishingProject,
  actorId: string,
  need: CollaboratorPermission | SharePermission,
): boolean {
  if (project.ownerId === actorId) return true;
  const collab = project.collaborators.find((c) => c.id === actorId || c.email === actorId);
  if (collab) {
    const order: CollaboratorPermission[] = ["view", "comment", "suggest", "edit", "owner"];
    const needIdx = order.indexOf(need as CollaboratorPermission);
    const haveIdx = order.indexOf(collab.permission);
    return haveIdx >= needIdx;
  }
  return false;
}

export function persistProject(
  project: FurnishingProject,
  versionLabel?: string,
  versionSummary?: string,
): FurnishingProject {
  let next = { ...project, updatedAt: now() };
  if (versionLabel) {
    const v = snapshotVersion(next, versionLabel, versionSummary ?? versionLabel);
    next = {
      ...next,
      versions: [...next.versions, v].slice(-50),
      latestVersionId: v.id,
    };
  }
  saveProject(next);
  return next;
}

export function setProjectStatus(id: string, status: ProjectStatus): FurnishingProject | null {
  const project = getProject(id);
  if (!project) return null;
  return persistProject({ ...project, status }, `Status → ${status}`, `Project status changed to ${status}`);
}

export function upsertRoomSnapshot(
  projectId: string,
  snapshot: {
    roomId?: string;
    name?: string;
    templateId: SpaceTemplateId;
    brief: SpaceBrief;
    activeTier: "economy" | "recommended" | "premium";
    lines: readonly PlannerHandoffLine[];
    totalPkr: number;
    packageName: string;
    explanations?: readonly string[];
    upgrades?: readonly string[];
    downgrades?: readonly string[];
    /** Persist user package edits so Remove survives refresh. */
    packageCustomized?: boolean;
  },
  versionSummary = "Planner save",
): FurnishingProject | null {
  const project = getProject(projectId);
  if (!project || !canAccessProject(project, getLocalOwnerId(), "edit")) return null;

  const rooms = [...project.rooms];
  const existingIdx = snapshot.roomId ? rooms.findIndex((r) => r.id === snapshot.roomId) : -1;
  const existing = existingIdx >= 0 ? rooms[existingIdx] : undefined;
  const packageCustomized =
    snapshot.packageCustomized ?? existing?.packageCustomized ?? false;
  const room: ProjectRoom = {
    id: snapshot.roomId ?? uid(),
    name: snapshot.name ?? existing?.name ?? "Room",
    order: existingIdx >= 0 ? existing!.order : rooms.length,
    templateId: snapshot.templateId,
    brief: snapshot.brief,
    activeTier: snapshot.activeTier,
    lines: [...snapshot.lines],
    totalPkr: snapshot.totalPkr,
    explanations: [...(snapshot.explanations ?? [])],
    upgrades: [...(snapshot.upgrades ?? [])],
    downgrades: [...(snapshot.downgrades ?? [])],
    packageName: snapshot.packageName,
    notes: existingIdx >= 0 ? [...existing!.notes] : [],
    ...(packageCustomized ? { packageCustomized: true } : {}),
  };
  if (existingIdx >= 0) rooms[existingIdx] = room;
  else rooms.push(room);

  const memory: ConsultantMemory = {
    ...project.consultantMemory,
    spaceTemplateId: snapshot.templateId,
    endUse: snapshot.brief.endUse,
    ...(snapshot.brief.budgetPkr != null ? { budgetPkr: snapshot.brief.budgetPkr } : {}),
    ...(snapshot.brief.style ? { style: snapshot.brief.style } : {}),
    spaceFlags: { ...snapshot.brief.flags },
    selectedProductIds: snapshot.lines.map((l) => l.productId),
  };

  return persistProject(
    {
      ...project,
      rooms,
      activeRoomId: room.id,
      consultantMemory: memory,
      templateId: snapshot.templateId,
      status: project.status === "draft" ? "planning" : project.status,
      ...(snapshot.explanations?.length
        ? { plannerSummary: snapshot.explanations.slice(0, 5).join("\n") }
        : {}),
    },
    versionSummary,
    versionSummary,
  );
}

export function syncConsultantState(
  projectId: string,
  memory: ConsultantMemory,
  messages: readonly ConsultantMessage[],
): FurnishingProject | null {
  const project = getProject(projectId);
  if (!project || !canAccessProject(project, getLocalOwnerId(), "edit")) return null;
  const aiSummary = messages.filter((m) => m.role === "assistant").slice(-1)[0]?.text?.slice(0, 500);
  return persistProject(
    {
      ...project,
      consultantMemory: memory,
      consultantMessages: [...messages].slice(-40),
      aiAssisted: true,
      ...(aiSummary ? { aiSummary } : {}),
    },
    undefined,
    undefined,
  );
}

export function addProjectNote(projectId: string, text: string, author?: OwnerContext): FurnishingProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  const note: ProjectNote = {
    id: uid(),
    text: text.trim(),
    createdAt: now(),
    authorId: author?.ownerId ?? getLocalOwnerId(),
    authorLabel: author?.ownerLabel ?? "You",
  };
  if (!note.text) return project;
  return persistProject(
    { ...project, notes: [note, ...project.notes].slice(0, 100) },
    "Note added",
    note.text.slice(0, 120),
  );
}

export function addRoom(
  projectId: string,
  name: string,
  templateId?: SpaceTemplateId,
): FurnishingProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  const tid = templateId ?? project.templateId;
  const brief = createDefaultBrief(tid);
  const room: ProjectRoom = {
    id: uid(),
    name,
    order: project.rooms.length,
    templateId: tid,
    brief,
    activeTier: "recommended",
    lines: [],
    totalPkr: 0,
    explanations: [],
    upgrades: [],
    downgrades: [],
    packageName: "Recommended package",
    notes: [],
  };
  return persistProject(
    { ...project, rooms: [...project.rooms, room], activeRoomId: room.id },
    `Room added: ${name}`,
    `Added room ${name}`,
  );
}

export function duplicateRoom(projectId: string, roomId: string): FurnishingProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  const src = project.rooms.find((r) => r.id === roomId);
  if (!src) return null;
  const copy: ProjectRoom = {
    ...src,
    id: uid(),
    name: `${src.name} (copy)`,
    order: project.rooms.length,
    brief: { ...src.brief, flags: { ...src.brief.flags } },
    lines: src.lines.map((l) => ({ ...l })),
    notes: [...src.notes],
  };
  return persistProject(
    { ...project, rooms: [...project.rooms, copy], activeRoomId: copy.id },
    `Duplicated ${src.name}`,
    `Duplicated room ${src.name}`,
  );
}

export function renameRoom(projectId: string, roomId: string, name: string): FurnishingProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  const rooms = project.rooms.map((r) => (r.id === roomId ? { ...r, name } : r));
  return persistProject({ ...project, rooms }, `Renamed room`, `Renamed to ${name}`);
}

export function deleteRoom(projectId: string, roomId: string): FurnishingProject | null {
  const project = getProject(projectId);
  if (!project || project.rooms.length <= 1) return null;
  const rooms = project.rooms.filter((r) => r.id !== roomId);
  const activeRoomId = project.activeRoomId === roomId ? rooms[0]!.id : project.activeRoomId;
  return persistProject(
    { ...project, rooms, activeRoomId },
    "Room removed",
    `Removed room ${roomId}`,
  );
}

export function reorderRooms(projectId: string, roomIds: readonly string[]): FurnishingProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  const map = new Map(project.rooms.map((r) => [r.id, r]));
  const rooms = roomIds
    .map((id, order) => {
      const r = map.get(id);
      return r ? { ...r, order } : null;
    })
    .filter((r): r is ProjectRoom => r != null);
  if (rooms.length !== project.rooms.length) return null;
  return persistProject({ ...project, rooms }, "Rooms reordered", "Room order updated");
}

export function setActiveRoom(projectId: string, roomId: string): FurnishingProject | null {
  const project = getProject(projectId);
  if (!project || !project.rooms.some((r) => r.id === roomId)) return null;
  return persistProject({ ...project, activeRoomId: roomId });
}

export function restoreVersion(projectId: string, versionId: string): FurnishingProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  const version = project.versions.find((v) => v.id === versionId);
  if (!version) return null;
  return persistProject(
    {
      ...project,
      rooms: version.rooms.map((r) => ({
        ...r,
        brief: { ...r.brief, flags: { ...r.brief.flags } },
        lines: r.lines.map((l) => ({ ...l })),
      })),
      consultantMemory: { ...version.consultantMemory },
      consultantMessages: [...version.consultantMessages],
      status: version.status,
      notes: [...version.notes],
      activeRoomId: version.rooms[0]?.id ?? project.activeRoomId,
    },
    `Restored ${version.label}`,
    `Restored version ${version.versionNumber}`,
  );
}

export function compareProjectVersions(
  projectId: string,
  aId: string,
  bId: string,
): ProjectVersionDiff | null {
  const project = getProject(projectId);
  if (!project) return null;
  const a = project.versions.find((v) => v.id === aId);
  const b = project.versions.find((v) => v.id === bId);
  if (!a || !b) return null;
  return diffVersions(a, b);
}

export function inviteCollaborator(
  projectId: string,
  input: { email: string; name: string; role: string; permission: CollaboratorPermission },
): FurnishingProject | null {
  const project = getProject(projectId);
  if (!project || project.ownerId !== getLocalOwnerId()) return null;
  const collab: ProjectCollaborator = {
    id: uid(),
    email: input.email.trim(),
    name: input.name.trim() || input.email,
    role: input.role,
    permission: input.permission,
    invitedAt: now(),
  };
  return persistProject(
    { ...project, collaborators: [...project.collaborators, collab] },
    "Collaborator invited",
    `Invited ${collab.email} (${collab.permission})`,
  );
}

export function createShareLink(
  projectId: string,
  permission: SharePermission,
  label?: string,
): { project: FurnishingProject; url: string } | null {
  const project = getProject(projectId);
  if (!project || project.ownerId !== getLocalOwnerId()) return null;
  const token = shareToken();
  const link: ProjectShareLink = {
    id: uid(),
    token,
    permission,
    createdAt: now(),
    label: label ?? `${permission} link`,
  };
  registerShareToken(token, projectId);
  const next = persistProject(
    { ...project, shareLinks: [link, ...project.shareLinks].slice(0, 20) },
    "Share link created",
    `Share link (${permission})`,
  );
  pushNotification({
    category: "project_shared",
    title: "Share link created",
    body: `“${next.title}” is ready to share (${permission}).`,
    href: `/my-projects?focus=${encodeURIComponent(next.id)}`,
  });
  return { project: next, url: `/my-projects?share=${token}` };
}

export function openSharedProject(token: string): FurnishingProject | null {
  const id = resolveShareToken(token);
  if (!id) return null;
  return loadProject(id);
}

export function recordQuote(
  projectId: string,
  quote: Omit<ProjectQuote, "id" | "createdAt" | "isLatest">,
): FurnishingProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  const entry: ProjectQuote = {
    ...quote,
    id: uid(),
    createdAt: now(),
    isLatest: true,
  };
  const quotes = project.quotes.map((q) => ({ ...q, isLatest: false }));
  const next = persistProject(
    {
      ...project,
      quotes: [entry, ...quotes].slice(0, 30),
      status: project.status === "planning" || project.status === "draft" ? "quoted" : project.status,
    },
    entry.label,
    `Quotation ${entry.label}`,
  );
  if (next) {
    pushNotification({
      category: "quotation_ready",
      title: "Quotation ready",
      body: `“${next.title}” — ${entry.label} (${entry.totalPkr.toLocaleString("en-PK")} PKR).`,
      href: `/planner?projectId=${encodeURIComponent(next.id)}`,
    });
  }
  return next;
}

export function buildCrmProjectMeta(project: FurnishingProject): Record<string, unknown> {
  const totals = projectTotals(project);
  const latest = project.versions[project.versions.length - 1];
  const latestQuote = project.quotes.find((q) => q.isLatest);
  return {
    projectId: project.id,
    projectTitle: project.title,
    projectStatus: project.status,
    latestVersionId: project.latestVersionId,
    latestVersionNumber: latest?.versionNumber,
    plannerSummary: project.plannerSummary,
    aiSummary: project.aiSummary,
    budgetPkr: totals.budget,
    totalPkr: totals.total,
    quotationId: latestQuote?.id,
    quotationTotal: latestQuote?.totalPkr,
    rooms: project.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      templateId: r.templateId,
      lineCount: r.lines.length,
      totalPkr: r.totalPkr,
    })),
    customerNotes: project.notes.slice(0, 10).map((n) => n.text),
    aiAssisted: project.aiAssisted,
  };
}

export function welcomeBackMessage(project: FurnishingProject): string {
  const updated = new Date(project.updatedAt);
  const days = Math.floor((Date.now() - updated.getTime()) / 86_400_000);
  const when =
    days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  const room = project.rooms.find((r) => r.id === project.activeRoomId);
  return `Welcome back. Your ${project.title} project was last updated ${when}. Would you like to continue improving ${room?.name ?? "the active room"} or review the quotation?`;
}

/** Clone a project locally (new id). Does not alter the source project. */
export function duplicateProject(
  id: string,
  actorId?: string,
): FurnishingProject | null {
  const source = getProject(id, actorId);
  if (!source) return null;
  const ownerId = actorId ?? getLocalOwnerId();
  const firstRoom = source.rooms[0];
  const clone = createProject({
    title: `${source.title} (copy)`,
    templateId: source.templateId,
    owner: {
      ownerId,
      ownerLabel: source.ownerLabel,
      ...(source.customerName ? { customerName: source.customerName } : {}),
    },
    status: "planning",
    ...(firstRoom
      ? {
          room: {
            name: firstRoom.name,
            templateId: firstRoom.templateId,
            brief: firstRoom.brief,
            activeTier: firstRoom.activeTier,
            lines: firstRoom.lines,
            totalPkr: firstRoom.totalPkr,
            explanations: firstRoom.explanations,
            upgrades: firstRoom.upgrades,
            downgrades: firstRoom.downgrades,
            packageName: firstRoom.packageName,
            notes: firstRoom.notes,
          },
        }
      : {}),
  });
  if (source.rooms.length <= 1) return clone;
  let next = clone;
  for (const room of source.rooms.slice(1)) {
    const added = addRoom(next.id, room.name, room.templateId);
    if (!added) break;
    next = added;
    const active = next.rooms[next.rooms.length - 1];
    if (!active) break;
    const snapped = upsertRoomSnapshot(next.id, {
      roomId: active.id,
      name: room.name,
      templateId: room.templateId,
      brief: room.brief,
      activeTier: room.activeTier,
      lines: room.lines,
      totalPkr: room.totalPkr,
      packageName: room.packageName,
      explanations: room.explanations,
      upgrades: room.upgrades,
      downgrades: room.downgrades,
    });
    if (snapped) next = snapped;
  }
  return next;
}

export function removeProject(id: string): boolean {
  const project = getProject(id);
  if (!project || project.ownerId !== getLocalOwnerId()) return false;
  deleteProject(id);
  return true;
}

export { toListItem };
