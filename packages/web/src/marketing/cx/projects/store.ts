/**
 * RC9.4 — local persistence for furnishing projects (index + lazy full records).
 */

import type { FurnishingProject, ProjectListItem } from "./types";

const INDEX_KEY = "afh.cx.projects.index";
const PROJECT_PREFIX = "afh.cx.project.";
const OWNER_KEY = "afh.cx.projects.owner";
const SHARE_INDEX_KEY = "afh.cx.projects.share";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (cause) {
    const message =
      cause instanceof DOMException && cause.name === "QuotaExceededError"
        ? "Browser storage is full. Free space or remove old projects, then try again."
        : "Could not save project to browser storage.";
    throw new Error(message, { cause });
  }
}

function projectKey(id: string): string {
  return `${PROJECT_PREFIX}${id}`;
}

export function getLocalOwnerId(): string {
  return readJson<string>(OWNER_KEY, "guest-local");
}

export function setLocalOwnerId(ownerId: string): void {
  writeJson(OWNER_KEY, ownerId);
}

export function listProjectIndex(): ProjectListItem[] {
  return readJson<ProjectListItem[]>(INDEX_KEY, []);
}

function writeIndex(items: readonly ProjectListItem[]): void {
  writeJson(INDEX_KEY, [...items]);
}

export function upsertProjectIndex(item: ProjectListItem): void {
  const cur = listProjectIndex().filter((p) => p.id !== item.id);
  writeIndex([item, ...cur].slice(0, 200));
}

export function removeProjectIndex(id: string): void {
  writeIndex(listProjectIndex().filter((p) => p.id !== id));
}

export function loadProject(id: string): FurnishingProject | null {
  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) return null;
  return readJson<FurnishingProject | null>(projectKey(id), null);
}

export function saveProject(project: FurnishingProject): void {
  writeJson(projectKey(project.id), project);
  upsertProjectIndex(toListItem(project));
}

export function deleteProject(id: string): void {
  localStorage.removeItem(projectKey(id));
  removeProjectIndex(id);
}

export function registerShareToken(token: string, projectId: string): void {
  const map = readJson<Record<string, string>>(SHARE_INDEX_KEY, {});
  map[token] = projectId;
  writeJson(SHARE_INDEX_KEY, map);
}

export function resolveShareToken(token: string): string | null {
  if (!token || token.length < 8) return null;
  const map = readJson<Record<string, string>>(SHARE_INDEX_KEY, {});
  const id = map[token];
  return id && loadProject(id) ? id : null;
}

export function toListItem(project: FurnishingProject): ProjectListItem {
  const budget = project.rooms.reduce((s, r) => s + (r.brief.budgetPkr ?? 0), 0);
  const total = project.rooms.reduce((s, r) => s + r.totalPkr, 0);
  const latest = project.versions[project.versions.length - 1];
  const latestQuote = project.quotes.find((q) => q.isLatest);
  return {
    id: project.id,
    title: project.title,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    ownerLabel: project.ownerLabel,
    ...(project.customerName ? { customerName: project.customerName } : {}),
    templateId: project.templateId,
    budgetPkr: budget,
    totalPkr: total,
    roomCount: project.rooms.length,
    aiAssisted: project.aiAssisted,
    ...(latestQuote ? { quotationStatus: "Quoted" } : project.status === "quoted" ? { quotationStatus: "Quoted" } : {}),
    latestVersionNumber: latest?.versionNumber ?? 1,
  };
}

/** Merge guest projects into account owner on login. */
export function mergeProjectsOnLogin(accountOwnerId: string, accountLabel: string): number {
  const guestId = getLocalOwnerId();
  if (guestId === accountOwnerId) return 0;
  let merged = 0;
  for (const item of listProjectIndex()) {
    const full = loadProject(item.id);
    if (!full || full.ownerId !== guestId) continue;
    const next: FurnishingProject = {
      ...full,
      ownerId: accountOwnerId,
      ownerLabel: accountLabel,
      updatedAt: new Date().toISOString(),
    };
    saveProject(next);
    merged += 1;
  }
  setLocalOwnerId(accountOwnerId);
  return merged;
}
