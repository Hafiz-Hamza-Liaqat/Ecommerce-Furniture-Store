/**
 * RC10.5 — Cloud synchronization types (opaque records; domain models unchanged).
 */

export type SyncStatus =
  | "synced"
  | "syncing"
  | "offline"
  | "pending"
  | "conflict"
  | "retrying"
  | "error";

export type DeviceInfo = {
  readonly deviceId: string;
  readonly platform: string;
  readonly label: string;
  readonly lastSyncAt: string | null;
  readonly lastActiveAt: string;
  readonly userId: string;
};

export type SyncRecord = {
  readonly key: string;
  readonly revision: number;
  readonly revisedAt: string;
  readonly payload: unknown;
};

export type WorkspaceSnapshot = {
  readonly version: 1;
  readonly userId: string;
  readonly revision: number;
  readonly revisedAt: string;
  readonly records: readonly SyncRecord[];
  readonly devices: readonly DeviceInfo[];
};

export type OutboxEntry = {
  readonly id: string;
  readonly key: string;
  readonly at: string;
  readonly revision: number;
  readonly payload: unknown;
};

export type ConflictEvent = {
  readonly id: string;
  readonly key: string;
  readonly at: string;
  readonly localRevision: number;
  readonly remoteRevision: number;
  readonly resolution: "kept_local" | "kept_remote" | "merged_remote_wins";
  readonly note: string;
};

export type SyncEngineState = {
  readonly status: SyncStatus;
  readonly lastSyncAt: string | null;
  readonly lastError: string | null;
  readonly pendingCount: number;
  readonly conflictCount: number;
  readonly userId: string | null;
  readonly deviceId: string;
};

/** Extension points for RC10.6+ collaboration (not enabled). */
export type CollaborationHooks = {
  readonly onSharedProject?: (projectId: string) => void;
  readonly onTeamWorkspace?: (workspaceId: string) => void;
  readonly onPresence?: (deviceId: string) => void;
  readonly onLiveEdit?: (resourceId: string) => void;
};

export type CxSyncRemote = {
  readonly kind: "http" | "local-cloud";
  getSnapshot(userId: string): Promise<WorkspaceSnapshot | null>;
  putSnapshot(snapshot: WorkspaceSnapshot): Promise<void>;
};
