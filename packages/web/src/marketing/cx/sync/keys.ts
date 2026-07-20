/**
 * RC10.5 — Keys included in cloud workspace sync (opaque JSON; no domain rewrite).
 */

export const SYNC_META_PREFIX = "afh.cx.sync.";
export const OUTBOX_KEY = "afh.cx.sync.outbox";
export const CONFLICTS_KEY = "afh.cx.sync.conflicts";
export const ENGINE_STATE_KEY = "afh.cx.sync.state";
export const DEVICE_KEY = "afh.cx.sync.device";
export const CURSOR_KEY = "afh.cx.sync.cursor";
export const LOCAL_CLOUD_PREFIX = "afh.cloud.cx.v1.";

/** Static keys always considered for sync. */
export const STATIC_SYNC_KEYS = [
  "afh.cx.projects.index",
  "afh.cx.projects.owner",
  "afh.cx.projects.share",
  "afh.cx.studio.prefs",
  "afh.cx.planner",
  "afh.cx.consultant",
  "afh.cx.consultant.memory",
  "afh.cx.leadQueue",
  "afh.cx.wishlist",
  "afh.cx.compare",
  "afh.cx.recent",
  "afh.cx.recentSearch",
  "afh.cx.notifications",
  "afh.cx.catalogGaps",
  "afh.cx.sales.workspace",
  "afh.web.user.prefs",
] as const;

export function isSyncableKey(key: string): boolean {
  if (key.startsWith(SYNC_META_PREFIX)) return false;
  if (key.startsWith(LOCAL_CLOUD_PREFIX)) return false;
  if (key.startsWith("afh.cx.project.")) return true;
  return (STATIC_SYNC_KEYS as readonly string[]).includes(key);
}

export function listLocalSyncKeys(): string[] {
  const keys = new Set<string>(STATIC_SYNC_KEYS);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && isSyncableKey(k)) keys.add(k);
    }
  } catch {
    /* private mode */
  }
  return [...keys].sort();
}
