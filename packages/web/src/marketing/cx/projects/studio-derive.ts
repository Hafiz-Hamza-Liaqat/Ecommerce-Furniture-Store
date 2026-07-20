/**
 * RC10.1 — Studio presentation helpers (read-only derivation).
 * No AI imagery; no invented metrics; persistence contracts unchanged.
 */

import { getCatalogueProduct } from "../../data/catalogue";
import { getWishlistIds } from "../stores";
import { listProjectIndex, loadProject } from "./store";
import type {
  FurnishingProject,
  ProjectListItem,
  ProjectStatus,
} from "./types";

export type MoodboardTile = {
  readonly id: string;
  readonly kind: "product" | "placeholder";
  readonly src?: string;
  readonly alt: string;
};

export type StudioStat = {
  readonly id: string;
  readonly label: string;
  readonly value: number;
};

export type StudioActivityEvent = {
  readonly id: string;
  readonly at: string;
  readonly title: string;
  readonly projectId: string;
  readonly projectTitle: string;
};

export type ContinueTarget = "planner" | "consultant" | "project";

const STATUS_PROGRESS: Record<ProjectStatus, number> = {
  draft: 10,
  planning: 25,
  quoted: 45,
  pending_approval: 55,
  approved: 70,
  production: 85,
  completed: 100,
  archived: 100,
};

export function projectProgressPercent(status: ProjectStatus): number {
  return STATUS_PROGRESS[status] ?? 0;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

/** Moodboard tiles from room product lines + tasteful placeholders. */
export function deriveMoodboardTiles(
  project: FurnishingProject | null,
  max = 4,
): MoodboardTile[] {
  const tiles: MoodboardTile[] = [];
  if (project) {
    const seen = new Set<string>();
    for (const room of project.rooms) {
      for (const line of room.lines) {
        if (seen.has(line.productId)) continue;
        seen.add(line.productId);
        const product = getCatalogueProduct(line.productId);
        if (product?.image) {
          tiles.push({
            id: line.productId,
            kind: "product",
            src: product.image,
            alt: product.name,
          });
        }
        if (tiles.length >= max) return tiles;
      }
    }
  }
  const placeholders = [
    "Room preview",
    "Material swatch",
    "Inspiration",
    "Furnishing study",
  ];
  let i = 0;
  while (tiles.length < max) {
    tiles.push({
      id: `ph-${i}`,
      kind: "placeholder",
      alt: placeholders[i % placeholders.length]!,
    });
    i += 1;
  }
  return tiles;
}

/** Real aggregates only — no invented metrics. */
export function deriveStudioStats(
  items: readonly ProjectListItem[],
): readonly StudioStat[] {
  const full = items
    .map((item) => loadProject(item.id))
    .filter((p): p is FurnishingProject => p != null);

  const active = items.filter(
    (p) => p.status !== "archived" && p.status !== "completed",
  ).length;
  const savedQuotes = full.reduce((n, p) => n + p.quotes.length, 0);
  const plannerSessions = full.reduce(
    (n, p) =>
      n +
      p.versions.filter(
        (v) =>
          !/^version 1$/i.test(v.label.trim()) &&
          !/initial project/i.test(v.summary ?? ""),
      ).length,
    0,
  );
  const aiConsultations = full.reduce(
    (n, p) => n + p.consultantMessages.filter((m) => m.role === "user").length,
    0,
  );
  const shared = full.filter((p) => p.shareLinks.length > 0).length;
  const wishlist = getWishlistIds().length;

  return [
    { id: "active", label: "Active Projects", value: active },
    { id: "quotes", label: "Saved Quotes", value: savedQuotes },
    { id: "planner", label: "Planner Sessions", value: plannerSessions },
    { id: "ai", label: "AI Consultations", value: aiConsultations },
    { id: "shared", label: "Shared Projects", value: shared },
    { id: "wishlist", label: "Wishlist Items", value: wishlist },
  ];
}

function pushEvent(
  out: StudioActivityEvent[],
  event: StudioActivityEvent,
): void {
  out.push(event);
}

/** Chronological feed from real version / note / quote / share / consultant data. */
export function deriveActivityEvents(
  limit = 12,
): readonly StudioActivityEvent[] {
  const events: StudioActivityEvent[] = [];
  for (const item of listProjectIndex()) {
    const project = loadProject(item.id);
    if (!project) continue;

    pushEvent(events, {
      id: `${project.id}-created`,
      at: project.createdAt,
      title: "Project created",
      projectId: project.id,
      projectTitle: project.title,
    });

    for (const v of project.versions) {
      const label = v.label.toLowerCase();
      let title = "Version created";
      if (/planner|room|package|snapshot|save/i.test(label)) {
        title = "Planner updated";
      } else if (/quote/i.test(label)) {
        title = "Quote generated";
      } else if (/share|collaborator|invite/i.test(label)) {
        title = "Project shared";
      } else if (/status/i.test(label)) {
        title = `Status · ${v.summary ?? v.label}`;
      } else if (/note/i.test(label)) {
        title = "Notes added";
      } else if (v.versionNumber === 1) {
        title = "Project created";
      }
      pushEvent(events, {
        id: v.id,
        at: v.createdAt,
        title,
        projectId: project.id,
        projectTitle: project.title,
      });
    }

    for (const note of project.notes) {
      pushEvent(events, {
        id: note.id,
        at: note.createdAt,
        title: "Notes added",
        projectId: project.id,
        projectTitle: project.title,
      });
    }

    for (const quote of project.quotes) {
      pushEvent(events, {
        id: quote.id,
        at: quote.createdAt,
        title: "Quote generated",
        projectId: project.id,
        projectTitle: project.title,
      });
    }

    for (const share of project.shareLinks) {
      pushEvent(events, {
        id: share.id,
        at: share.createdAt,
        title: "Project shared",
        projectId: project.id,
        projectTitle: project.title,
      });
    }

    const userMsgs = project.consultantMessages.filter((m) => m.role === "user");
    if (userMsgs.length > 0) {
      const last = userMsgs[userMsgs.length - 1]!;
      pushEvent(events, {
        id: `${project.id}-ai-${last.at}`,
        at: last.at,
        title: "AI consultation",
        projectId: project.id,
        projectTitle: project.title,
      });
    }
  }

  const seen = new Set<string>();
  const deduped: StudioActivityEvent[] = [];
  for (const e of events.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  )) {
    const key = `${e.projectId}:${e.title}:${e.at.slice(0, 16)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

/**
 * Resume target from the most recent real activity on the project.
 */
export function continueTargetForProject(
  project: FurnishingProject,
): ContinueTarget {
  type Cand = { at: number; target: ContinueTarget };
  const cands: Cand[] = [];

  const lastUser = [...project.consultantMessages]
    .reverse()
    .find((m) => m.role === "user");
  if (lastUser) {
    cands.push({ at: Date.parse(lastUser.at), target: "consultant" });
  }

  const lastQuote = project.quotes.find((q) => q.isLatest) ?? project.quotes[project.quotes.length - 1];
  if (lastQuote) {
    cands.push({ at: Date.parse(lastQuote.createdAt), target: "planner" });
  }

  const lastVersion = project.versions[project.versions.length - 1];
  if (lastVersion) {
    const label = lastVersion.label.toLowerCase();
    const target: ContinueTarget =
      /consult|ai|chat/i.test(label) ? "consultant" : "planner";
    cands.push({ at: Date.parse(lastVersion.createdAt), target });
  }

  cands.push({ at: Date.parse(project.updatedAt), target: "project" });

  cands.sort((a, b) => b.at - a.at);
  return cands[0]?.target ?? "planner";
}

export function continueHref(
  projectId: string,
  target: ContinueTarget,
): string {
  if (target === "consultant") return `/consultant?projectId=${projectId}`;
  if (target === "project") return `/my-projects?focus=${projectId}`;
  return `/planner?projectId=${projectId}`;
}

export function mostRecentProject(
  items: readonly ProjectListItem[],
): ProjectListItem | null {
  if (items.length === 0) return null;
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0]!;
}
