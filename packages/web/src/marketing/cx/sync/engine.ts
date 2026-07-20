/**
 * RC10.5 — Synchronization engine (local-primary, incremental, conflict-aware).
 * Does not alter planner/configurator/CRM/orders domain logic — only opaque storage keys.
 */

import { listLocalSyncKeys } from "./keys";
import {
  enqueueOutbox,
  getOrCreateDevice,
  listConflicts,
  listOutbox,
  loadCursor,
  loadEngineState,
  nowIso,
  pushConflict,
  readLocalPayload,
  saveCursor,
  saveEngineState,
  saveOutbox,
  uid,
  writeLocalPayload,
} from "./meta";
import { createLocalCloudRemote, createResilientRemote, type HttpSyncClient, createHttpCxSyncRemote } from "./remote";
import type {
  CollaborationHooks,
  CxSyncRemote,
  DeviceInfo,
  SyncEngineState,
  SyncRecord,
  SyncStatus,
  WorkspaceSnapshot,
} from "./types";

type Listener = (state: SyncEngineState) => void;

const listeners = new Set<Listener>();
let remote: CxSyncRemote = createLocalCloudRemote();
let collabHooks: CollaborationHooks = {};
let syncing = false;
let periodTimer: ReturnType<typeof setInterval> | null = null;

/** RC10.6+ extension registration (no-op consumers today). */
export function registerCollaborationHooks(hooks: CollaborationHooks): void {
  collabHooks = { ...collabHooks, ...hooks };
  void collabHooks;
}

export function configureCxSyncRemote(next: CxSyncRemote): void {
  remote = next;
}

export function configureCxSyncHttp(client: HttpSyncClient): void {
  remote = createResilientRemote(createHttpCxSyncRemote(client), createLocalCloudRemote());
}

export function subscribeSyncState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(state: SyncEngineState): void {
  saveEngineState(state);
  for (const l of listeners) {
    try {
      l(state);
    } catch {
      /* ignore */
    }
  }
}

function setStatus(
  userId: string | null,
  device: DeviceInfo,
  status: SyncStatus,
  extra?: Partial<SyncEngineState>,
): SyncEngineState {
  const state: SyncEngineState = {
    status,
    lastSyncAt: extra?.lastSyncAt ?? loadEngineState(device.deviceId).lastSyncAt,
    lastError: extra?.lastError ?? null,
    pendingCount: listOutbox().length,
    conflictCount: listConflicts().length,
    userId,
    deviceId: device.deviceId,
  };
  emit(state);
  return state;
}

function payloadHash(payload: unknown): string {
  try {
    return JSON.stringify(payload) ?? "null";
  } catch {
    return String(payload);
  }
}

function buildLocalRecords(
  cursorRevisions: Record<string, number>,
  cursorHashes: Record<string, string>,
  cursorRevisedAt: Record<string, string>,
): SyncRecord[] {
  const at = nowIso();
  const outboxByKey = new Map(listOutbox().map((e) => [e.key, e]));
  const records: SyncRecord[] = [];
  for (const key of listLocalSyncKeys()) {
    const payload = readLocalPayload(key);
    if (payload == null) continue;
    const hash = payloadHash(payload);
    const prevHash = cursorHashes[key];
    const prev = cursorRevisions[key] ?? 0;
    const dirty = prevHash !== hash;
    const revision = dirty ? prev + 1 : prev;
    const revisedAt = dirty
      ? (outboxByKey.get(key)?.at ?? cursorRevisedAt[key] ?? at)
      : (cursorRevisedAt[key] ?? at);
    records.push({
      key,
      revision: Math.max(revision, 1),
      revisedAt,
      payload,
    });
  }
  return records;
}

/**
 * Mark a local key dirty (call after CX writes). Dedupes outbox by key.
 */
export function markSyncDirty(key: string): void {
  if (!key.startsWith("afh.cx.") && key !== "afh.web.user.prefs") return;
  if (key.startsWith("afh.cx.sync.")) return;
  const cursor = loadCursor();
  const rev = (cursor.recordRevisions[key] ?? 0) + 1;
  const at = nowIso();
  enqueueOutbox({
    key,
    revision: rev,
    payload: readLocalPayload(key),
    at,
  });
  saveCursor({
    ...cursor,
    recordRevisedAt: { ...cursor.recordRevisedAt, [key]: at },
  });
  const device = getOrCreateDevice(getSyncState().userId);
  setStatus(getSyncState().userId, device, typeof navigator !== "undefined" && navigator.onLine ? "pending" : "offline");
}

/**
 * Deterministic conflict resolution: later revisedAt wins; loser recorded for review.
 * Never silently drops the losing side without a conflict event.
 */
function resolveRecord(
  local: SyncRecord | undefined,
  remoteRec: SyncRecord | undefined,
  lastKnown: number,
): { record: SyncRecord | null; conflict?: boolean } {
  if (!local && !remoteRec) return { record: null };
  if (!local && remoteRec) return { record: remoteRec };
  if (local && !remoteRec) return { record: local };

  const l = local!;
  const r = remoteRec!;
  if (l.revision === r.revision && JSON.stringify(l.payload) === JSON.stringify(r.payload)) {
    return { record: l };
  }

  // Both changed since last sync cursor
  const localDirty = l.revision > lastKnown;
  const remoteDirty = r.revision > lastKnown;
  if (localDirty && remoteDirty && JSON.stringify(l.payload) !== JSON.stringify(r.payload)) {
    const keepRemote = r.revisedAt >= l.revisedAt;
    pushConflict({
      key: l.key,
      localRevision: l.revision,
      remoteRevision: r.revision,
      resolution: keepRemote ? "merged_remote_wins" : "kept_local",
      note: keepRemote
        ? "Both devices edited; kept remote (later revisedAt). Local snapshot retained in conflict log."
        : "Both devices edited; kept local (later revisedAt). Remote snapshot retained in conflict log.",
    });
    // Persist losing payload under conflict archive key for review (not domain data).
    const loser = keepRemote ? l : r;
    writeLocalPayload(`afh.cx.sync.conflict.${loser.key}.${uid()}`, loser);
    return { record: keepRemote ? r : l, conflict: true };
  }

  if (r.revision > l.revision) return { record: r };
  return { record: l };
}

export async function runSyncCycle(userId: string): Promise<SyncEngineState> {
  const device = getOrCreateDevice(userId);
  if (!navigator.onLine) {
    return setStatus(userId, device, "offline");
  }
  if (syncing) {
    return setStatus(userId, device, "syncing");
  }
  syncing = true;
  setStatus(userId, device, listOutbox().length ? "retrying" : "syncing");

  try {
    const cursor = loadCursor();
    const remoteSnap = await remote.getSnapshot(userId);
    const localRecords = buildLocalRecords(
      cursor.recordRevisions,
      cursor.recordHashes,
      cursor.recordRevisedAt,
    );
    const localByKey = new Map(localRecords.map((r) => [r.key, r]));
    const remoteByKey = new Map((remoteSnap?.records ?? []).map((r) => [r.key, r]));
    const allKeys = new Set([...localByKey.keys(), ...remoteByKey.keys()]);

    const merged: SyncRecord[] = [];
    const remoteWinsKeys = new Set<string>();
    let hadConflict = false;
    for (const key of allKeys) {
      const lastKnown = cursor.recordRevisions[key] ?? 0;
      const resolved = resolveRecord(localByKey.get(key), remoteByKey.get(key), lastKnown);
      if (resolved.conflict) {
        hadConflict = true;
        if (resolved.record && remoteByKey.get(key) === resolved.record) {
          remoteWinsKeys.add(key);
        }
      }
      if (resolved.record) {
        merged.push(resolved.record);
        writeLocalPayload(resolved.record.key, resolved.record.payload);
      }
    }

    // Outbox tracks pending upload; never re-apply over a remote-wins conflict winner.
    // Local dirty payloads are already represented in localRecords / merge output.
    if (remoteWinsKeys.size > 0) {
      saveOutbox(listOutbox().filter((e) => !remoteWinsKeys.has(e.key)));
    }

    const pendingUpload = listOutbox().length > 0;
    const revision =
      Math.max(
        remoteSnap?.revision ?? 0,
        cursor.lastPushedRevision,
        ...merged.map((m) => m.revision),
        0,
      ) + (pendingUpload ? 1 : 0);

    const devicesMap = new Map<string, DeviceInfo>();
    for (const d of remoteSnap?.devices ?? []) devicesMap.set(d.deviceId, d);
    const touched: DeviceInfo = {
      ...device,
      userId,
      lastActiveAt: nowIso(),
      lastSyncAt: nowIso(),
    };
    devicesMap.set(touched.deviceId, touched);

    const snapshot: WorkspaceSnapshot = {
      version: 1,
      userId,
      revision: Math.max(revision, 1),
      revisedAt: nowIso(),
      records: merged,
      devices: [...devicesMap.values()],
    };

    try {
      await remote.putSnapshot(snapshot);
      saveOutbox([]);
    } catch {
      // Keep outbox; local-cloud may still have been updated by resilient remote
      setStatus(userId, touched, "pending", {
        lastError: "Upload incomplete — will retry",
        lastSyncAt: loadEngineState(touched.deviceId).lastSyncAt,
      });
      syncing = false;
      return loadEngineState(touched.deviceId);
    }

    const nextRevs: Record<string, number> = { ...cursor.recordRevisions };
    const nextHashes: Record<string, string> = { ...cursor.recordHashes };
    const nextRevisedAt: Record<string, string> = { ...cursor.recordRevisedAt };
    for (const r of merged) {
      nextRevs[r.key] = r.revision;
      nextHashes[r.key] = payloadHash(r.payload);
      nextRevisedAt[r.key] = r.revisedAt;
    }
    saveCursor({
      lastPulledRevision: snapshot.revision,
      lastPushedRevision: snapshot.revision,
      recordRevisions: nextRevs,
      recordHashes: nextHashes,
      recordRevisedAt: nextRevisedAt,
    });

    const status: SyncStatus = hadConflict ? "conflict" : listOutbox().length ? "pending" : "synced";
    const state = setStatus(userId, touched, status, {
      lastSyncAt: touched.lastSyncAt,
      lastError: null,
    });
    syncing = false;
    return state;
  } catch (err) {
    syncing = false;
    const message = err instanceof Error ? err.message : "Sync failed";
    return setStatus(userId, device, "error", { lastError: message });
  }
}

export function getSyncState(): SyncEngineState {
  const device = getOrCreateDevice(null);
  return loadEngineState(device.deviceId);
}

export function listSyncDevices(): DeviceInfo[] {
  // Devices are on the last known cloud snapshot (local-cloud mirror)
  const state = getSyncState();
  if (!state.userId) return [getOrCreateDevice(null)];
  try {
    const raw = localStorage.getItem(`afh.cloud.cx.v1.${state.userId}`);
    if (!raw) return [getOrCreateDevice(state.userId)];
    const snap = JSON.parse(raw) as WorkspaceSnapshot;
    return snap.devices?.length ? [...snap.devices] : [getOrCreateDevice(state.userId)];
  } catch {
    return [getOrCreateDevice(state.userId)];
  }
}

export function startBackgroundSync(getUserId: () => string | null): () => void {
  const tick = () => {
    const userId = getUserId();
    if (!userId) return;
    void runSyncCycle(userId);
  };

  const onOnline = () => {
    const userId = getUserId();
    if (userId) void runSyncCycle(userId);
  };
  const onOffline = () => {
    const device = getOrCreateDevice(getUserId());
    setStatus(getUserId(), device, "offline");
  };

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  // Cross-tab cloud updates
  const onStorage = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key.startsWith("afh.cloud.cx.v1.")) {
      const userId = getUserId();
      if (userId) void runSyncCycle(userId);
      return;
    }
    if (e.key.startsWith("afh.cx.") && !e.key.startsWith("afh.cx.sync.")) {
      markSyncDirty(e.key);
    }
  };
  window.addEventListener("storage", onStorage);

  if (periodTimer) clearInterval(periodTimer);
  periodTimer = setInterval(tick, 60_000);

  // Startup sync
  tick();

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("storage", onStorage);
    if (periodTimer) {
      clearInterval(periodTimer);
      periodTimer = null;
    }
  };
}

export async function syncNow(userId: string): Promise<SyncEngineState> {
  return runSyncCycle(userId);
}

export function listSyncConflicts() {
  return listConflicts();
}
