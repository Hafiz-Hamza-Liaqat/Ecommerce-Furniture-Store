import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="sr-only" href="#main-content">
        Skip to content
      </a>
      <Sidebar />
      <div className="app-shell__main">
        <TopBar />
        <main className="app-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
