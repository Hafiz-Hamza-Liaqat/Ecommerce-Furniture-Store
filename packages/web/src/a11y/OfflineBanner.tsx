import { useEffect, useState } from "react";

/**
 * Lightweight offline / reconnect banner for marketing + app shells.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );

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

  if (!offline) return null;

  return (
    <div className="afh-offline-banner" role="status" aria-live="polite">
      You appear to be offline. Some actions may fail until connectivity returns.
    </div>
  );
}
