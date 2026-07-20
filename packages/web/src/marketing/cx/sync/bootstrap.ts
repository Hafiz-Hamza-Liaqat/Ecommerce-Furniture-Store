/**
 * RC10.5 — Bootstrap sync engine for authenticated sessions.
 */

import type { ApiClient } from "../../../api/client";
import {
  configureCxSyncHttp,
  startBackgroundSync,
  syncNow,
} from "./engine";
import type { WorkspaceSnapshot } from "./types";

let stopBg: (() => void) | null = null;

export function bootstrapCxSync(options: {
  readonly api: ApiClient;
  readonly getUserId: () => string | null;
}): () => void {
  configureCxSyncHttp({
    async getCxWorkspace() {
      const res = await options.api.getCxWorkspace<WorkspaceSnapshot>();
      return { snapshot: res.data.snapshot };
    },
    async putCxWorkspace(snapshot) {
      await options.api.putCxWorkspace(snapshot);
    },
  });

  if (stopBg) stopBg();
  stopBg = startBackgroundSync(options.getUserId);

  const userId = options.getUserId();
  if (userId) void syncNow(userId);

  return () => {
    stopBg?.();
    stopBg = null;
  };
}
