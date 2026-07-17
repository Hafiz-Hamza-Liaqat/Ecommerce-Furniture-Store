import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, type CSSProperties } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { WorkspaceUiProvider, useWorkspaceUi } from "../workspace/context";
import {
  CommandPalette,
  HelpModal,
  NotificationDrawer,
  QuickCreateLauncher,
  ShortcutsOverlay,
  ToastHost,
} from "../workspace/overlays";
import { AiAssistantPanel } from "../ai/AiPanel";
import { Skeleton } from "../workspace/widgets";
import { loadInbox, saveInbox, type InboxNotification } from "../workspace/prefs";

const MODULE_LABELS: Record<string, string> = {
  sales: "Sales",
  procurement: "Procurement",
  inventory: "Inventory",
  finance: "Finance",
  projects: "Projects",
  crm: "CRM",
  service: "Service",
  hr: "HR",
  manufacturing: "Manufacturing",
  cms: "CMS",
  dam: "DAM",
  me: "My workspace",
  notifications: "Notifications",
  search: "Search",
  reporting: "Reporting",
  workflow: "Workflow",
  approvals: "Approvals",
  calendar: "Enterprise calendar",
  preferences: "Preferences",
  analytics: "Analytics",
  reports: "Reports",
  insights: "Insights",
  ai: "AI Assistant",
  settings: "Settings",
  integrations: "Integrations",
  platform: "Platform",
};

function pageLabel(pathname: string): string {
  if (pathname === "/app") return "Executive dashboard";
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "app" && parts[1]) {
    const mod = MODULE_LABELS[parts[1]] ?? parts[1];
    if (parts.length === 2) return mod;
    return `${mod} · ${parts.slice(2).join(" / ")}`;
  }
  return "Workspace";
}

function ShellInner() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { rememberPage, sidebarWidth } = useWorkspaceUi();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const t = window.setTimeout(() => setReady(true), 180);
    rememberPage(pathname, pageLabel(pathname));
    return () => window.clearTimeout(t);
  }, [pathname, rememberPage]);

  useEffect(() => {
    const onGoto = (e: Event) => {
      const path = (e as CustomEvent<string>).detail;
      if (path) navigate(path);
    };
    window.addEventListener("afh:goto", onGoto);
    return () => window.removeEventListener("afh:goto", onGoto);
  }, [navigate]);

  // Soft realtime: occasionally surface a system tick into the inbox when empty of unread
  useEffect(() => {
    const t = window.setInterval(() => {
      const inbox = loadInbox();
      const unread = inbox.filter((n) => n.unread && !n.archived).length;
      if (unread === 0 && Math.random() < 0.08) {
        const pulse: InboxNotification = {
          id: `live-${Date.now()}`,
          title: "Workspace sync pulse",
          body: "Presentation refresh from local messaging interface.",
          category: "system",
          priority: "low",
          time: "Just now",
          href: "/app/notifications",
          unread: true,
          archived: false,
        };
        saveInbox([pulse, ...inbox].slice(0, 40));
      }
    }, 45000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div
      className="app-shell ws-shell"
      style={{ "--afh-sidebar": `${sidebarWidth}px` } as CSSProperties}
    >
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
      <AiAssistantPanel />
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
