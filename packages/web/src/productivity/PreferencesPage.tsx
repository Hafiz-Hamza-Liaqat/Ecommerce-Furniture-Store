import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Button, Alert } from "../components/ui";
import { Tabs } from "../workspace/widgets";
import { useSession } from "../state/session";
import {
  applyUserPrefsToDocument,
  defaultUserPrefs,
  loadUserPrefs,
  saveUserPrefs,
  type UserPrefs,
} from "../workspace/prefs";
import { useWorkspaceUi } from "../workspace/context";
import { SHORTCUTS } from "../workspace/data";

export function PreferencesPage() {
  const { setTheme } = useSession();
  const { toast } = useWorkspaceUi();
  const [prefs, setPrefs] = useState<UserPrefs>(() => loadUserPrefs());
  const [tab, setTab] = useState("general");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    applyUserPrefsToDocument(loadUserPrefs());
  }, []);

  function update<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  function onSave() {
    saveUserPrefs(prefs);
    if (prefs.theme === "system") {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(dark ? "dark" : "light");
    } else {
      setTheme(prefs.theme);
    }
    applyUserPrefsToDocument(prefs);
    setSaved(true);
    toast({ tone: "ok", title: "Preferences saved", body: "Stored locally — no backend contract changes." });
  }

  function onReset() {
    const next = defaultUserPrefs();
    setPrefs(next);
    saveUserPrefs(next);
    setTheme("light");
    applyUserPrefsToDocument(next);
    toast({ tone: "info", title: "Preferences reset" });
  }

  return (
    <div className="stack p5-prefs">
      <PageHeader
        title="Settings & preferences"
        lead="Workspace settings hub — preferences, security, notifications, AI, jobs, DAM, reporting, and organization links. Backend Policy remains authoritative for security actions."
        actions={
          <div className="row">
            <Button variant="ghost" onClick={onReset}>
              Reset prefs
            </Button>
            <Button onClick={onSave}>Save preferences</Button>
          </div>
        }
      />
      {saved ? <Alert tone="ok">Preferences applied.</Alert> : null}

      <section className="ws-card stack" aria-label="Settings destinations">
        <header className="ws-card__head">
          <h2>Enterprise settings</h2>
        </header>
        <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <Link className="btn btn--ghost" to="/app/account/security">
            Security & devices
          </Link>
          <Link className="btn btn--ghost" to="/app/account/mfa">
            MFA
          </Link>
          <Link className="btn btn--ghost" to="/app/account/email-verification">
            Email verification
          </Link>
          <Link className="btn btn--ghost" to="/app/notifications/preferences">
            Notification preferences
          </Link>
          <Link className="btn btn--ghost" to="/app/settings/ai">
            AI / authentication providers
          </Link>
          <Link className="btn btn--ghost" to="/app/platform/jobs">
            Background jobs
          </Link>
          <Link className="btn btn--ghost" to="/app/platform/monitoring">
            System health
          </Link>
          <Link className="btn btn--ghost" to="/app/platform/audit">
            Audit logs
          </Link>
          <Link className="btn btn--ghost" to="/app/platform/backups">
            Backup
          </Link>
          <Link className="btn btn--ghost" to="/app/dam/assets">
            Object storage / DAM
          </Link>
          <Link className="btn btn--ghost" to="/app/search">
            Search
          </Link>
          <Link className="btn btn--ghost" to="/app/reporting/library">
            Reporting
          </Link>
          <Link className="btn btn--ghost" to="/app/platform">
            Organization / SaaS ops
          </Link>
          <Link className="btn btn--ghost" to="/admin/platform">
            Administration
          </Link>
          <Link className="btn btn--ghost" to="/app/me">
            User / company workspace
          </Link>
        </div>
      </section>

      <Tabs
        tabs={[
          { id: "general", label: "Workspace" },
          { id: "notifications", label: "Notifications" },
          { id: "tables", label: "Tables & dashboard" },
          { id: "accessibility", label: "Localization & a11y" },
          { id: "shortcuts", label: "Shortcuts" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "general" ? (
        <section className="ws-card">
          <div className="ws-card__body erp-form-grid">
            <label className="field">
              <span className="field__label">Theme</span>
              <select
                className="field__input"
                value={prefs.theme}
                onChange={(e) => update("theme", e.target.value as UserPrefs["theme"])}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Language</span>
              <select
                className="field__input"
                value={prefs.language}
                onChange={(e) => update("language", e.target.value)}
              >
                <option value="en-PK">English (Pakistan)</option>
                <option value="en-US">English (US)</option>
                <option value="ur-PK">Urdu</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Time zone</span>
              <select
                className="field__input"
                value={prefs.timeZone}
                onChange={(e) => update("timeZone", e.target.value)}
              >
                <option value="Asia/Karachi">Asia/Karachi</option>
                <option value="UTC">UTC</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Date format</span>
              <select
                className="field__input"
                value={prefs.dateFormat}
                onChange={(e) => update("dateFormat", e.target.value as UserPrefs["dateFormat"])}
              >
                <option value="DMY">DD/MM/YYYY</option>
                <option value="MDY">MM/DD/YYYY</option>
                <option value="YMD">YYYY-MM-DD</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Time format</span>
              <select
                className="field__input"
                value={prefs.timeFormat}
                onChange={(e) => update("timeFormat", e.target.value as UserPrefs["timeFormat"])}
              >
                <option value="24h">24-hour</option>
                <option value="12h">12-hour</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {tab === "notifications" ? (
        <section className="ws-card">
          <div className="ws-card__body stack">
            <label className="p5-check">
              <input
                type="checkbox"
                checked={prefs.notifEmail}
                onChange={(e) => update("notifEmail", e.target.checked)}
              />
              Email notifications
            </label>
            <label className="p5-check">
              <input
                type="checkbox"
                checked={prefs.notifPush}
                onChange={(e) => update("notifPush", e.target.checked)}
              />
              Push notifications
            </label>
            <label className="p5-check">
              <input
                type="checkbox"
                checked={prefs.notifSms}
                onChange={(e) => update("notifSms", e.target.checked)}
              />
              SMS notifications
            </label>
            <label className="field">
              <span className="field__label">Digest</span>
              <select
                className="field__input"
                value={prefs.notifDigest}
                onChange={(e) => update("notifDigest", e.target.value as UserPrefs["notifDigest"])}
              >
                <option value="off">Off</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <Link className="btn btn--ghost" to="/app/notifications">
              Open notification center
            </Link>
          </div>
        </section>
      ) : null}

      {tab === "tables" ? (
        <section className="ws-card">
          <div className="ws-card__body erp-form-grid">
            <label className="field">
              <span className="field__label">Default table density</span>
              <select
                className="field__input"
                value={prefs.density}
                onChange={(e) => update("density", e.target.value as UserPrefs["density"])}
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Default dashboard</span>
              <select
                className="field__input"
                value={prefs.dashboardDefault}
                onChange={(e) => update("dashboardDefault", e.target.value)}
              >
                <option value="/app">Executive</option>
                <option value="/app/me">My workspace</option>
                <option value="/app/sales">Sales</option>
                <option value="/app/projects">Projects</option>
                <option value="/app/reporting">Reporting</option>
              </select>
            </label>
            <p className="p5-muted">
              Per-entity column layouts, sorts, and saved views persist automatically from each module table.
            </p>
          </div>
        </section>
      ) : null}

      {tab === "accessibility" ? (
        <section className="ws-card">
          <div className="ws-card__body stack">
            <label className="p5-check">
              <input
                type="checkbox"
                checked={prefs.reduceMotion}
                onChange={(e) => update("reduceMotion", e.target.checked)}
              />
              Reduce motion
            </label>
            <label className="p5-check">
              <input
                type="checkbox"
                checked={prefs.highContrast}
                onChange={(e) => update("highContrast", e.target.checked)}
              />
              High contrast
            </label>
            <p className="p5-muted">
              Also respects OS prefers-reduced-motion and prefers-contrast. Focus rings and skip-to-content
              remain available across the shell.
            </p>
          </div>
        </section>
      ) : null}

      {tab === "shortcuts" ? (
        <section className="ws-card">
          <div className="ws-card__body">
            <ul className="ws-shortcuts">
              {SHORTCUTS.map((s) => (
                <li key={s.keys}>
                  <kbd>{s.keys}</kbd>
                  <span>{s.action}</span>
                </li>
              ))}
              <li>
                <kbd>⌘/Ctrl ,</kbd>
                <span>Open preferences</span>
              </li>
              <li>
                <kbd>G then C</kbd>
                <span>Go to enterprise calendar</span>
              </li>
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
