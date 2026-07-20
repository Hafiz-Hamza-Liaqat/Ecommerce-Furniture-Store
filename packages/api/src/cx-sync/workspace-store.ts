/**
 * RC10.5 — Filesystem CX workspace snapshot store (per authenticated user).
 * Session-scoped only — no RBAC catalog changes.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type CxWorkspaceSnapshotDto = {
  readonly version: 1;
  readonly userId: string;
  readonly revision: number;
  readonly revisedAt: string;
  readonly records: readonly {
    readonly key: string;
    readonly revision: number;
    readonly revisedAt: string;
    readonly payload: unknown;
  }[];
  readonly devices: readonly {
    readonly deviceId: string;
    readonly platform: string;
    readonly label: string;
    readonly lastSyncAt: string | null;
    readonly lastActiveAt: string;
    readonly userId: string;
  }[];
};

export type CxWorkspaceStore = {
  get(userId: string): CxWorkspaceSnapshotDto | null;
  put(userId: string, snapshot: CxWorkspaceSnapshotDto): void;
};

export function createFilesystemCxWorkspaceStore(rootDir: string): CxWorkspaceStore {
  if (!existsSync(rootDir)) {
    mkdirSync(rootDir, { recursive: true });
  }

  const pathFor = (userId: string) => {
    const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
    return join(rootDir, `${safe}.json`);
  };

  return {
    get(userId) {
      const file = pathFor(userId);
      if (!existsSync(file)) return null;
      try {
        const parsed = JSON.parse(readFileSync(file, "utf8")) as CxWorkspaceSnapshotDto;
        if (parsed?.version !== 1 || parsed.userId !== userId) return null;
        return parsed;
      } catch {
        return null;
      }
    },
    put(userId, snapshot) {
      if (snapshot.userId !== userId) {
        throw new Error("snapshot_user_mismatch");
      }
      writeFileSync(pathFor(userId), JSON.stringify(snapshot), "utf8");
    },
  };
}

export function createMemoryCxWorkspaceStore(): CxWorkspaceStore {
  const map = new Map<string, CxWorkspaceSnapshotDto>();
  return {
    get(userId) {
      return map.get(userId) ?? null;
    },
    put(userId, snapshot) {
      if (snapshot.userId !== userId) throw new Error("snapshot_user_mismatch");
      map.set(userId, snapshot);
    },
  };
}
