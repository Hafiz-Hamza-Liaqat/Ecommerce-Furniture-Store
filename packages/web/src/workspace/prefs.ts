import type { DashWidgetId, WidgetSize } from "./data";
import { DASH_WIDGETS } from "./data";

const LAYOUT_KEY = "afh.web.dashboard.layout";
const FAVORITES_KEY = "afh.web.favorites";
const RECENT_CMD_KEY = "afh.web.recent.commands";
const FAV_CMD_KEY = "afh.web.favorite.commands";
const CONTEXT_KEY = "afh.web.workspace.context";
const RECENT_PAGES_KEY = "afh.web.recent.pages";
const BOOKMARKS_KEY = "afh.web.bookmarks";
const PINNED_KEY = "afh.web.pinned.records";
const WATCHED_KEY = "afh.web.watched.records";
const TABLE_PREFS_KEY = "afh.web.table.prefs";
const USER_PREFS_KEY = "afh.web.user.prefs";
const NOTIF_INBOX_KEY = "afh.web.notif.inbox";
const DOWNLOAD_HISTORY_KEY = "afh.web.download.history";

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

export type RecentPage = {
  readonly path: string;
  readonly label: string;
  readonly at: number;
};

export type Bookmark = {
  readonly path: string;
  readonly label: string;
};

export type TableDensity = "compact" | "comfortable" | "spacious";

export type TableViewPrefs = {
  readonly visibleKeys: string[];
  readonly columnOrder: string[];
  readonly columnWidths: Record<string, number>;
  readonly frozenCount: number;
  readonly density: TableDensity;
  readonly groupBy: string | null;
  readonly sorts: readonly { key: string; dir: "asc" | "desc" }[];
  readonly savedViews: readonly { id: string; label: string; filters: Record<string, string> }[];
  readonly exportPreset: "csv" | "xlsx" | "pdf";
};

export type UserPrefs = {
  readonly theme: "light" | "dark" | "system";
  readonly language: string;
  readonly timeZone: string;
  readonly dateFormat: "DMY" | "MDY" | "YMD";
  readonly timeFormat: "12h" | "24h";
  readonly density: TableDensity;
  readonly reduceMotion: boolean;
  readonly highContrast: boolean;
  readonly dashboardDefault: string;
  readonly notifEmail: boolean;
  readonly notifPush: boolean;
  readonly notifSms: boolean;
  readonly notifDigest: "off" | "daily" | "weekly";
};

export type InboxNotification = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly category: "approvals" | "ops" | "security" | "reports" | "mentions" | "system";
  readonly priority: "low" | "normal" | "high";
  readonly time: string;
  readonly href?: string;
  unread: boolean;
  archived: boolean;
  snoozedUntil?: number;
};

export type DownloadHistoryItem = {
  readonly id: string;
  readonly name: string;
  readonly at: number;
  readonly mimeType: string;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

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
  const next = [id, ...loadRecentCommands().filter((x) => x !== id)].slice(0, 12);
  localStorage.setItem(RECENT_CMD_KEY, JSON.stringify(next));
}

export function loadFavoriteCommands(): string[] {
  return readJson<string[]>(FAV_CMD_KEY, ["cmd-dash", "cmd-appr", "cmd-search"]);
}

export function toggleFavoriteCommand(id: string): string[] {
  const cur = loadFavoriteCommands();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(0, 20);
  localStorage.setItem(FAV_CMD_KEY, JSON.stringify(next));
  return next;
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

export function loadRecentPages(): RecentPage[] {
  return readJson<RecentPage[]>(RECENT_PAGES_KEY, []);
}

export function pushRecentPage(path: string, label: string): RecentPage[] {
  if (!path.startsWith("/app")) return loadRecentPages();
  const next = [
    { path, label, at: Date.now() },
    ...loadRecentPages().filter((p) => p.path !== path),
  ].slice(0, 12);
  localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(next));
  return next;
}

export function loadBookmarks(): Bookmark[] {
  return readJson<Bookmark[]>(BOOKMARKS_KEY, [
    { path: "/app", label: "Executive dashboard" },
    { path: "/app/calendar", label: "Enterprise calendar" },
    { path: "/app/preferences", label: "Preferences" },
  ]);
}

export function saveBookmarks(items: Bookmark[]): void {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
}

export function toggleBookmark(path: string, label: string): Bookmark[] {
  const cur = loadBookmarks();
  const next = cur.some((b) => b.path === path)
    ? cur.filter((b) => b.path !== path)
    : [...cur, { path, label }].slice(0, 24);
  saveBookmarks(next);
  return next;
}

export function loadPinnedRecords(): string[] {
  return readJson<string[]>(PINNED_KEY, []);
}

export function togglePinnedRecord(key: string): string[] {
  const cur = loadPinnedRecords();
  const next = cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key].slice(0, 40);
  localStorage.setItem(PINNED_KEY, JSON.stringify(next));
  return next;
}

export function loadWatchedRecords(): string[] {
  return readJson<string[]>(WATCHED_KEY, []);
}

export function toggleWatchedRecord(key: string): string[] {
  const cur = loadWatchedRecords();
  const next = cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key].slice(0, 40);
  localStorage.setItem(WATCHED_KEY, JSON.stringify(next));
  return next;
}

export function defaultTablePrefs(columnKeys: string[]): TableViewPrefs {
  return {
    visibleKeys: [...columnKeys],
    columnOrder: [...columnKeys],
    columnWidths: {},
    frozenCount: 1,
    density: "comfortable",
    groupBy: null,
    sorts: [{ key: columnKeys[0] ?? "title", dir: "asc" }],
    savedViews: [],
    exportPreset: "csv",
  };
}

export function loadTablePrefs(scope: string, columnKeys: string[]): TableViewPrefs {
  const map = readJson<Record<string, TableViewPrefs>>(TABLE_PREFS_KEY, {});
  const cur = map[scope];
  if (!cur) return defaultTablePrefs(columnKeys);
  const order = cur.columnOrder.filter((k) => columnKeys.includes(k));
  const missing = columnKeys.filter((k) => !order.includes(k));
  return {
    ...defaultTablePrefs(columnKeys),
    ...cur,
    columnOrder: [...order, ...missing],
    visibleKeys: cur.visibleKeys.filter((k) => columnKeys.includes(k)).length
      ? cur.visibleKeys.filter((k) => columnKeys.includes(k))
      : [...columnKeys],
  };
}

export function saveTablePrefs(scope: string, prefs: TableViewPrefs): void {
  const map = readJson<Record<string, TableViewPrefs>>(TABLE_PREFS_KEY, {});
  map[scope] = prefs;
  localStorage.setItem(TABLE_PREFS_KEY, JSON.stringify(map));
}

export function defaultUserPrefs(): UserPrefs {
  return {
    theme: "light",
    language: "en-PK",
    timeZone: "Asia/Karachi",
    dateFormat: "DMY",
    timeFormat: "24h",
    density: "comfortable",
    reduceMotion: false,
    highContrast: false,
    dashboardDefault: "/app",
    notifEmail: true,
    notifPush: true,
    notifSms: false,
    notifDigest: "daily",
  };
}

export function loadUserPrefs(): UserPrefs {
  return { ...defaultUserPrefs(), ...readJson<Partial<UserPrefs>>(USER_PREFS_KEY, {}) };
}

export function saveUserPrefs(prefs: UserPrefs): void {
  localStorage.setItem(USER_PREFS_KEY, JSON.stringify(prefs));
  applyUserPrefsToDocument(prefs);
}

export function applyUserPrefsToDocument(prefs: UserPrefs): void {
  const root = document.documentElement;
  let theme = prefs.theme;
  if (theme === "system") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  root.dataset.theme = theme;
  root.dataset.density = prefs.density;
  root.dataset.motion = prefs.reduceMotion ? "reduce" : "ok";
  root.dataset.contrast = prefs.highContrast ? "high" : "normal";
  localStorage.setItem("afh.web.theme", theme);
}

export function defaultInbox(): InboxNotification[] {
  return [
    {
      id: "n1",
      title: "3 approvals await your decision",
      body: "Discount exception and vendor onboarding need review.",
      category: "approvals",
      priority: "high",
      time: "10 min ago",
      href: "/app/approvals",
      unread: true,
      archived: false,
    },
    {
      id: "n2",
      title: "Service ticket SR-441 escalated",
      body: "SLA breach risk on Indus HQ site visit.",
      category: "ops",
      priority: "high",
      time: "45 min ago",
      href: "/app/service",
      unread: true,
      archived: false,
    },
    {
      id: "n3",
      title: "You were mentioned in Indus HQ",
      body: "@you — please confirm finish samples.",
      category: "mentions",
      priority: "normal",
      time: "1 h ago",
      href: "/app/projects",
      unread: true,
      archived: false,
    },
    {
      id: "n4",
      title: "Weekly capacity report ready",
      body: "Manufacturing utilization summary available.",
      category: "reports",
      priority: "low",
      time: "Today",
      href: "/app/reporting",
      unread: false,
      archived: false,
    },
    {
      id: "n5",
      title: "MFA reminder for finance role",
      body: "Complete MFA enrollment when convenient.",
      category: "security",
      priority: "normal",
      time: "Yesterday",
      href: "/app/account/mfa",
      unread: false,
      archived: false,
    },
    {
      id: "n6",
      title: "Catalogue PDF export completed",
      body: "Download from DAM when ready.",
      category: "system",
      priority: "low",
      time: "Yesterday",
      href: "/app/dam",
      unread: false,
      archived: false,
    },
  ];
}

export function loadInbox(): InboxNotification[] {
  const stored = readJson<InboxNotification[] | null>(NOTIF_INBOX_KEY, null);
  if (!stored || stored.length === 0) {
    const seed = defaultInbox();
    localStorage.setItem(NOTIF_INBOX_KEY, JSON.stringify(seed));
    return seed;
  }
  return stored;
}

export function saveInbox(items: InboxNotification[]): void {
  localStorage.setItem(NOTIF_INBOX_KEY, JSON.stringify(items));
}

export function loadDownloadHistory(): DownloadHistoryItem[] {
  return readJson<DownloadHistoryItem[]>(DOWNLOAD_HISTORY_KEY, []);
}

export function pushDownloadHistory(item: Omit<DownloadHistoryItem, "id" | "at">): void {
  const next = [
    { ...item, id: `dl-${Date.now()}`, at: Date.now() },
    ...loadDownloadHistory(),
  ].slice(0, 30);
  localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(next));
}
