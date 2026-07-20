/**
 * RC10.1 — Studio workspace side-car prefs.
 * Does not duplicate project records; pins/layout only.
 */

export type StudioDensity = "comfortable" | "compact";
export type StudioSort = "updated" | "created" | "budget" | "title";

export type StudioPrefs = {
  readonly pinnedProjectIds: readonly string[];
  readonly density: StudioDensity;
  readonly defaultSort: StudioSort;
};

const PREFS_KEY = "afh.cx.studio.prefs";

const DEFAULTS: StudioPrefs = {
  pinnedProjectIds: [],
  density: "comfortable",
  defaultSort: "updated",
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

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function loadStudioPrefs(): StudioPrefs {
  const raw = readJson<Partial<StudioPrefs>>(PREFS_KEY, {});
  const pins = Array.isArray(raw.pinnedProjectIds)
    ? raw.pinnedProjectIds.filter((id): id is string => typeof id === "string")
    : [];
  const density =
    raw.density === "compact" || raw.density === "comfortable"
      ? raw.density
      : DEFAULTS.density;
  const defaultSort =
    raw.defaultSort === "updated" ||
    raw.defaultSort === "created" ||
    raw.defaultSort === "budget" ||
    raw.defaultSort === "title"
      ? raw.defaultSort
      : DEFAULTS.defaultSort;
  return {
    pinnedProjectIds: [...new Set(pins)].slice(0, 24),
    density,
    defaultSort,
  };
}

export function saveStudioPrefs(next: StudioPrefs): void {
  writeJson(PREFS_KEY, {
    pinnedProjectIds: next.pinnedProjectIds.slice(0, 24),
    density: next.density,
    defaultSort: next.defaultSort,
  });
}

export function isProjectPinned(projectId: string): boolean {
  return loadStudioPrefs().pinnedProjectIds.includes(projectId);
}

export function togglePinnedProject(projectId: string): StudioPrefs {
  const cur = loadStudioPrefs();
  const set = new Set(cur.pinnedProjectIds);
  if (set.has(projectId)) set.delete(projectId);
  else set.add(projectId);
  const next: StudioPrefs = {
    ...cur,
    pinnedProjectIds: [...set].slice(0, 24),
  };
  saveStudioPrefs(next);
  return next;
}

export function setStudioDensity(density: StudioDensity): StudioPrefs {
  const next = { ...loadStudioPrefs(), density };
  saveStudioPrefs(next);
  return next;
}

export function setStudioDefaultSort(defaultSort: StudioSort): StudioPrefs {
  const next = { ...loadStudioPrefs(), defaultSort };
  saveStudioPrefs(next);
  return next;
}
