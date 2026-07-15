import { useSession } from "../state/session";
import { Button } from "../components/ui";

export function TopBar() {
  const {
    user,
    developerMode,
    theme,
    lastCorrelationId,
    setDeveloperMode,
    setTheme,
    clearSession,
    api,
  } = useSession();

  async function onLogout() {
    try {
      await api.signOut();
    } catch {
      /* session may already be invalid */
    }
    clearSession();
  }

  return (
    <header className="topbar">
      <div>
        <strong>{user?.fullName ?? user?.email ?? "Signed in"}</strong>
        {developerMode && lastCorrelationId ? (
          <div style={{ fontSize: "0.8rem", color: "var(--afh-ink-soft)" }}>
            correlation: {lastCorrelationId}
          </div>
        ) : null}
      </div>
      <div className="row">
        <Button
          variant="ghost"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle color theme"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setDeveloperMode(!developerMode)}
          aria-pressed={developerMode}
        >
          Dev {developerMode ? "on" : "off"}
        </Button>
        <Button variant="ghost" onClick={() => void onLogout()}>
          Log out
        </Button>
      </div>
    </header>
  );
}
