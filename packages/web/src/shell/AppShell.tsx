import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { WorkspaceUiProvider } from "../workspace/context";
import {
  CommandPalette,
  HelpModal,
  NotificationDrawer,
  QuickCreateLauncher,
  ShortcutsOverlay,
  ToastHost,
} from "../workspace/overlays";
import { Skeleton } from "../workspace/widgets";

function ShellInner() {
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const t = window.setTimeout(() => setReady(true), 180);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <div className="app-shell ws-shell">
      <a className="sr-only" href="#main-content">
        Skip to content
      </a>
      <Sidebar />
      <div className="app-shell__main">
        <TopBar />
        <main className="app-content" id="main-content" tabIndex={-1}>
          {!ready ? <Skeleton rows={4} /> : null}
          <div className={`ws-page${ready ? " is-ready" : ""}`} hidden={!ready}>
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette />
      <QuickCreateLauncher />
      <NotificationDrawer />
      <ShortcutsOverlay />
      <HelpModal />
      <ToastHost />
    </div>
  );
}

export function AppShell() {
  return (
    <WorkspaceUiProvider>
      <ShellInner />
    </WorkspaceUiProvider>
  );
}
