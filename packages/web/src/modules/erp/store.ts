/** Local persistence for API-created record ids and collaboration notes. */

const IDS_KEY = "afh.web.module.ids";
const NOTES_KEY = "afh.web.module.notes";
const LOCAL_RECORDS_KEY = "afh.web.module.localRecords";

type IdMap = Record<string, string[]>;
type NotesMap = Record<string, { notes: string[]; comments: string[]; attachments: string[] }>;
type LocalMap = Record<string, RecordRowLike[]>;

type RecordRowLike = {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly meta: Record<string, string | number>;
  readonly description?: string;
  readonly amount?: string;
  readonly tags?: readonly string[];
  readonly source?: "fixture" | "api" | "local";
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

export function rememberId(moduleId: string, entityKey: string, id: string): void {
  const map = readJson<IdMap>(IDS_KEY, {});
  const key = `${moduleId}:${entityKey}`;
  const next = [id, ...(map[key] ?? []).filter((x) => x !== id)].slice(0, 50);
  map[key] = next;
  localStorage.setItem(IDS_KEY, JSON.stringify(map));
}

export function rememberedIds(moduleId: string, entityKey: string): string[] {
  const map = readJson<IdMap>(IDS_KEY, {});
  return map[`${moduleId}:${entityKey}`] ?? [];
}

export function saveLocalRecord(
  moduleId: string,
  entityKey: string,
  row: RecordRowLike,
): void {
  const map = readJson<LocalMap>(LOCAL_RECORDS_KEY, {});
  const key = `${moduleId}:${entityKey}`;
  const existing = map[key] ?? [];
  map[key] = [row, ...existing.filter((r) => r.id !== row.id)].slice(0, 100);
  localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(map));
  rememberId(moduleId, entityKey, row.id);
}

export function loadLocalRecords(moduleId: string, entityKey: string): RecordRowLike[] {
  const map = readJson<LocalMap>(LOCAL_RECORDS_KEY, {});
  return map[`${moduleId}:${entityKey}`] ?? [];
}

export function getCollab(moduleId: string, entityKey: string, id: string) {
  const map = readJson<NotesMap>(NOTES_KEY, {});
  return (
    map[`${moduleId}:${entityKey}:${id}`] ?? {
      notes: [],
      comments: [],
      attachments: [],
    }
  );
}

export function addCollab(
  moduleId: string,
  entityKey: string,
  id: string,
  kind: "notes" | "comments" | "attachments",
  value: string,
): void {
  const map = readJson<NotesMap>(NOTES_KEY, {});
  const key = `${moduleId}:${entityKey}:${id}`;
  const cur = map[key] ?? { notes: [], comments: [], attachments: [] };
  map[key] = { ...cur, [kind]: [value, ...cur[kind]].slice(0, 40) };
  localStorage.setItem(NOTES_KEY, JSON.stringify(map));
}
