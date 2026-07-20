/**
 * RC10.5 — Local sync metadata helpers.
 */

import { CONFLICTS_KEY, CURSOR_KEY, DEVICE_KEY, ENGINE_STATE_KEY, OUTBOX_KEY } from "./keys";
import type { ConflictEvent, DeviceInfo, OutboxEntry, SyncEngineState } from "./types";

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

export function uid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function detectPlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Web";
}

export function getOrCreateDevice(userId: string | null): DeviceInfo {
  const existing = readJson<DeviceInfo | null>(DEVICE_KEY, null);
  const at = nowIso();
  if (existing && (!userId || existing.userId === userId || existing.userId === "guest")) {
    const next: DeviceInfo = {
      ...existing,
      userId: userId ?? existing.userId,
      lastActiveAt: at,
      platform: existing.platform || detectPlatform(),
    };
    writeJson(DEVICE_KEY, next);
    return next;
  }
  const created: DeviceInfo = {
    deviceId: uid(),
    platform: detectPlatform(),
    label: `${detectPlatform()} browser`,
    lastSyncAt: null,
    lastActiveAt: at,
    userId: userId ?? "guest",
  };
  writeJson(DEVICE_KEY, created);
  return created;
}

export function listOutbox(): OutboxEntry[] {
  return readJson<OutboxEntry[]>(OUTBOX_KEY, []);
}

export function saveOutbox(entries: readonly OutboxEntry[]): void {
  writeJson(OUTBOX_KEY, entries.slice(0, 200));
}

export function enqueueOutbox(entry: Omit<OutboxEntry, "id" | "at"> & { id?: string; at?: string }): void {
  const full: OutboxEntry = {
    id: entry.id ?? uid(),
    key: entry.key,
    revision: entry.revision,
    payload: entry.payload,
    at: entry.at ?? nowIso(),
  };
  const rest = listOutbox().filter((e) => e.key !== full.key);
  saveOutbox([full, ...rest]);
}

export function listConflicts(): ConflictEvent[] {
  return readJson<ConflictEvent[]>(CONFLICTS_KEY, []);
}

export function pushConflict(event: Omit<ConflictEvent, "id" | "at"> & { id?: string; at?: string }): void {
  const full: ConflictEvent = {
    id: event.id ?? uid(),
    at: event.at ?? nowIso(),
    key: event.key,
    localRevision: event.localRevision,
    remoteRevision: event.remoteRevision,
    resolution: event.resolution,
    note: event.note,
  };
  writeJson(CONFLICTS_KEY, [full, ...listConflicts()].slice(0, 100));
}

export type SyncCursor = {
  readonly lastPulledRevision: number;
  readonly lastPushedRevision: number;
  readonly recordRevisions: Record<string, number>;
  readonly recordHashes: Record<string, string>;
  /** Edit-time stamps used by revisedAt conflict policy (not sync-time). */
  readonly recordRevisedAt: Record<string, string>;
};

export function loadCursor(): SyncCursor {
  const raw = readJson<Partial<SyncCursor>>(CURSOR_KEY, {});
  return {
    lastPulledRevision: raw.lastPulledRevision ?? 0,
    lastPushedRevision: raw.lastPushedRevision ?? 0,
    recordRevisions: raw.recordRevisions ?? {},
    recordHashes: raw.recordHashes ?? {},
    recordRevisedAt: raw.recordRevisedAt ?? {},
  };
}

export function saveCursor(cursor: SyncCursor): void {
  writeJson(CURSOR_KEY, cursor);
}

export function loadEngineState(deviceId: string): SyncEngineState {
  const base = readJson<Partial<SyncEngineState>>(ENGINE_STATE_KEY, {});
  return {
    status: base.status ?? "synced",
    lastSyncAt: base.lastSyncAt ?? null,
    lastError: base.lastError ?? null,
    pendingCount: listOutbox().length,
    conflictCount: listConflicts().length,
    userId: base.userId ?? null,
    deviceId: base.deviceId ?? deviceId,
  };
}

export function saveEngineState(state: SyncEngineState): void {
  writeJson(ENGINE_STATE_KEY, state);
}

export function readLocalPayload(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

export function writeLocalPayload(key: string, payload: unknown): void {
  try {
    if (payload == null) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, typeof payload === "string" ? payload : JSON.stringify(payload));
  } catch {
    /* quota */
  }
}
