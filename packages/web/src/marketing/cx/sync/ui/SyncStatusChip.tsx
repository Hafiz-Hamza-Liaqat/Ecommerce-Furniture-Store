/**
 * RC10.5 — Sync status chip (TopBar / MarketingShell). No new routes.
 */

import { useEffect, useState } from "react";
import {
  getSyncState,
  listSyncConflicts,
  listSyncDevices,
  subscribeSyncState,
  syncNow,
} from "../engine";
import type { SyncEngineState, SyncStatus } from "../types";

const LABELS: Record<SyncStatus, string> = {
  synced: "Synced",
  syncing: "Syncing",
  offline: "Offline",
  pending: "Pending changes",
  conflict: "Conflict detected",
  retrying: "Retrying",
  error: "Sync error",
};

export function SyncStatusChip({
  userId,
  compact = false,
}: {
  readonly userId: string | null | undefined;
  readonly compact?: boolean;
}) {
  const [state, setState] = useState<SyncEngineState>(() => getSyncState());
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeSyncState(setState), []);

  if (!userId) return null;

  const label = LABELS[state.status];
  const devices = open ? listSyncDevices() : [];
  const conflicts = open ? listSyncConflicts() : [];

  return (
    <div className="cx-sync-chip">
      <button
        type="button"
        className={`cx-sync-chip__btn cx-sync-chip__btn--${state.status}`}
        aria-expanded={open}
        aria-label={`Synchronization: ${label}`}
        title={state.lastError ?? label}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cx-sync-chip__dot" aria-hidden />
        {compact ? null : <span>{label}</span>}
      </button>
      {open ? (
        <div className="cx-sync-chip__panel" role="dialog" aria-label="Synchronization details">
          <p className="cx-sync-chip__status">
            <strong>{label}</strong>
            <span className="cx-sync-chip__status-meta">
              {state.lastSyncAt
                ? `Last sync ${new Date(state.lastSyncAt).toLocaleString()}`
                : "Not synced yet"}
            </span>
          </p>
          {state.pendingCount > 0 ? <p>{state.pendingCount} pending change(s)</p> : null}
          {state.lastError ? <p className="cx-sync-chip__err">{state.lastError}</p> : null}
          <button
            type="button"
            className="site-btn site-btn--primary"
            onClick={() => {
              void syncNow(userId).then(setState);
            }}
          >
            Sync Now
          </button>
          <h3>Devices</h3>
          <ul className="cx-sync-chip__devices">
            {devices.map((d) => (
              <li key={d.deviceId}>
                <span className="cx-sync-chip__device-name">
                  {d.label} · {d.platform}
                </span>
                {d.lastSyncAt ? (
                  <span className="cx-sync-chip__device-meta">
                    Synced {new Date(d.lastSyncAt).toLocaleString()}
                  </span>
                ) : (
                  <span className="cx-sync-chip__device-meta">Not synced yet</span>
                )}
              </li>
            ))}
          </ul>
          {conflicts.length > 0 ? (
            <>
              <h3>Conflicts</h3>
              <ul className="cx-sync-chip__conflicts">
                {conflicts.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <span className="cx-sync-chip__conflict-key">{c.key}</span>
                    <span className="cx-sync-chip__conflict-note">
                      {c.resolution} — {c.note}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <button type="button" className="site-btn site-btn--ghost" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
