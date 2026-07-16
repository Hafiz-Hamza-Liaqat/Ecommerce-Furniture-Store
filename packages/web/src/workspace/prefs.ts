import type { DashWidgetId, WidgetSize } from "./data";
import { DASH_WIDGETS } from "./data";

const LAYOUT_KEY = "afh.web.dashboard.layout";
const FAVORITES_KEY = "afh.web.favorites";
const RECENT_CMD_KEY = "afh.web.recent.commands";
const CONTEXT_KEY = "afh.web.workspace.context";

export type LayoutItem = {
  readonly id: DashWidgetId;
  readonly size: WidgetSize;
  readonly hidden: boolean;
};

export type WorkspaceContextPrefs = {
  readonly workspaceId: string;
  readonly companyId: string;
  readonly branchId: string;
  readonly sidebarCollapsed: boolean;
};

export function defaultLayout(): LayoutItem[] {
  return DASH_WIDGETS.map((w) => ({
    id: w.id,
    size: w.defaultSize,
    hidden: false,
  }));
}

export function loadLayout(): LayoutItem[] {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return defaultLayout();
    const parsed = JSON.parse(raw) as LayoutItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultLayout();
    const known = new Set(DASH_WIDGETS.map((w) => w.id));
    const filtered = parsed.filter((i) => known.has(i.id));
    const missing = DASH_WIDGETS.filter((w) => !filtered.some((f) => f.id === w.id)).map(
      (w) => ({ id: w.id, size: w.defaultSize, hidden: false }),
    );
    return [...filtered, ...missing];
  } catch {
    return defaultLayout();
  }
}

export function saveLayout(items: LayoutItem[]): void {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(items));
}

export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return ["/app", "/app/approvals", "/app/sales"];
    return JSON.parse(raw) as string[];
  } catch {
    return ["/app"];
  }
}

export function saveFavorites(paths: string[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(paths));
}

export function loadRecentCommands(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_CMD_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function pushRecentCommand(id: string): void {
  const next = [id, ...loadRecentCommands().filter((x) => x !== id)].slice(0, 8);
  localStorage.setItem(RECENT_CMD_KEY, JSON.stringify(next));
}

export function loadWorkspaceContext(): WorkspaceContextPrefs {
  try {
    const raw = localStorage.getItem(CONTEXT_KEY);
    if (!raw) {
      return {
        workspaceId: "executive",
        companyId: "afh-pk",
        branchId: "lahore-hq",
        sidebarCollapsed: false,
      };
    }
    return JSON.parse(raw) as WorkspaceContextPrefs;
  } catch {
    return {
      workspaceId: "executive",
      companyId: "afh-pk",
      branchId: "lahore-hq",
      sidebarCollapsed: false,
    };
  }
}

export function saveWorkspaceContext(prefs: WorkspaceContextPrefs): void {
  localStorage.setItem(CONTEXT_KEY, JSON.stringify(prefs));
}
