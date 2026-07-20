/**
 * RC10.5 — Sync remotes: HTTP (cloud) + local-cloud fallback (multi-tab / offline queue drain).
 */

import { LOCAL_CLOUD_PREFIX } from "./keys";
import type { CxSyncRemote, WorkspaceSnapshot } from "./types";

export function createLocalCloudRemote(): CxSyncRemote {
  return {
    kind: "local-cloud",
    async getSnapshot(userId) {
      try {
        const raw = localStorage.getItem(`${LOCAL_CLOUD_PREFIX}${userId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as WorkspaceSnapshot;
        if (parsed?.version !== 1 || parsed.userId !== userId) return null;
        return parsed;
      } catch {
        return null;
      }
    },
    async putSnapshot(snapshot) {
      localStorage.setItem(`${LOCAL_CLOUD_PREFIX}${snapshot.userId}`, JSON.stringify(snapshot));
    },
  };
}

export type HttpSyncClient = {
  getCxWorkspace(): Promise<{ snapshot: WorkspaceSnapshot | null }>;
  putCxWorkspace(snapshot: WorkspaceSnapshot): Promise<void>;
};

export function createHttpCxSyncRemote(client: HttpSyncClient): CxSyncRemote {
  return {
    kind: "http",
    async getSnapshot() {
      const res = await client.getCxWorkspace();
      return res.snapshot;
    },
    async putSnapshot(snapshot) {
      await client.putCxWorkspace(snapshot);
    },
  };
}

/**
 * Prefer HTTP; on failure fall back to local-cloud so offline / missing API never lose data.
 */
export function createResilientRemote(http: CxSyncRemote, local: CxSyncRemote): CxSyncRemote {
  return {
    kind: "http",
    async getSnapshot(userId) {
      try {
        const snap = await http.getSnapshot(userId);
        if (snap) {
          await local.putSnapshot(snap);
          return snap;
        }
      } catch {
        /* fall through */
      }
      return local.getSnapshot(userId);
    },
    async putSnapshot(snapshot) {
      await local.putSnapshot(snapshot);
      try {
        await http.putSnapshot(snapshot);
      } catch {
        /* local-cloud retained; outbox / retry will push later */
        throw new Error("http_sync_unavailable");
      }
    },
  };
}
