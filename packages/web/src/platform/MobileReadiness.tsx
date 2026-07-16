import { useEffect, useState } from "react";
import { Button } from "../components/ui";
import { lastSyncAt, touchSync } from "./store";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

/** Offline indicator, sync status, and PWA install affordance. */
export function MobileReadinessBar() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [syncAt, setSyncAt] = useState<number | null>(() => lastSyncAt());
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const onBip = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setDeferred(null);
    });
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", onBip);
    };
  }, []);

  return (
    <div className="plt-mobile-bar" role="status" aria-live="polite">
      <span className={online ? "plt-dot plt-dot--ok" : "plt-dot plt-dot--danger"} aria-hidden />
      <span>{online ? "Online" : "Offline — changes queue locally"}</span>
      <span className="plt-mobile-bar__sep" aria-hidden>
        ·
      </span>
      <span>
        Sync{" "}
        {syncAt
          ? new Date(syncAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "pending"}
      </span>
      <Button
        variant="ghost"
        onClick={() => setSyncAt(touchSync())}
        aria-label="Refresh sync status"
      >
        Sync now
      </Button>
      {deferred && !installed ? (
        <Button
          variant="primary"
          onClick={() => {
            void deferred.prompt().then(() => setDeferred(null));
          }}
        >
          Install PWA
        </Button>
      ) : installed ? (
        <span>App installed</span>
      ) : (
        <span className="plt-mobile-bar__hint">Add to home screen for tablet / mobile</span>
      )}
    </div>
  );
}

/** Global toast when a new service worker is waiting. */
export function PwaUpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onController = () => window.location.reload();

    const attach = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(worker);
          }
        });
      });
    };

    void navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) attach(reg);
    });

    navigator.serviceWorker.addEventListener("controllerchange", onController);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onController);
  }, []);

  if (!waiting) return null;

  return (
    <div className="afh-pwa-update" role="status" aria-live="polite">
      <span>A new version is ready.</span>
      <Button
        variant="primary"
        onClick={() => {
          waiting.postMessage({ type: "AFH_SKIP_WAITING" });
          setWaiting(null);
        }}
      >
        Reload
      </Button>
      <Button variant="ghost" onClick={() => setWaiting(null)}>
        Later
      </Button>
    </div>
  );
}

export function registerPlatformServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* presentation-only; ignore SW failures in local/dev without HTTPS */
    });
  });
}
