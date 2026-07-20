import { useEffect, useState } from "react";
import { getSyncState, subscribeSyncState } from "../marketing/cx/sync";

/**
 * Lightweight offline / reconnect banner for marketing + app shells.
 * RC10.5 — also surfaces pending sync when offline.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );
  const [pending, setPending] = useState(() => getSyncState().pendingCount);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => subscribeSyncState((s) => setPending(s.pendingCount)), []);

  if (!offline && pending === 0) return null;

  return (
    <div className="afh-offline-banner" role="status" aria-live="polite">
      {offline
        ? pending > 0
          ? `You appear to be offline. ${pending} change(s) are queued and will sync when connectivity returns.`
          : "You appear to be offline. Some actions may fail until connectivity returns."
        : `${pending} change(s) waiting to sync.`}
    </div>
  );
}
