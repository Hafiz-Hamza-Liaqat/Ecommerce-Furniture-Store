import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, PageHeader } from "../components/ui";
import { EmptyState, StatusBadge } from "../workspace/widgets";
import { useSession } from "../state/session";
import { useWorkspaceUi } from "../workspace/context";

type DeviceRow = {
  readonly id: string;
  readonly label: string;
  readonly lastSeen: number;
  readonly current: boolean;
  readonly userAgent: string;
};

const DEVICES_KEY = "afh.web.security.devices";

function loadDevices(sessionId: string | null): DeviceRow[] {
  try {
    const raw = localStorage.getItem(DEVICES_KEY);
    if (raw) return JSON.parse(raw) as DeviceRow[];
  } catch {
    /* ignore */
  }
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
  const current: DeviceRow = {
    id: sessionId ?? `dev-${Date.now()}`,
    label: "This browser",
    lastSeen: Date.now(),
    current: true,
    userAgent: ua.slice(0, 120),
  };
  localStorage.setItem(DEVICES_KEY, JSON.stringify([current]));
  return [current];
}

function saveDevices(rows: DeviceRow[]): void {
  localStorage.setItem(DEVICES_KEY, JSON.stringify(rows));
}

export function SecurityCenterPage() {
  const { api, tokens, user, clearSession, refreshSession } = useSession();
  const { toast } = useWorkspaceUi();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [sessionHint, setSessionHint] = useState<string>("—");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setDevices(loadDevices(tokens?.sessionId ?? null));
    void api
      .getSession()
      .then((res) => {
        setSessionHint(res.data.sessionId ? `Session ${res.data.sessionId.slice(0, 8)}…` : "No session");
      })
      .catch(() => setSessionHint("Session probe unavailable"));
  }, [api, tokens?.sessionId]);

  function revoke(id: string) {
    const next = devices.filter((d) => d.id !== id || d.current);
    if (devices.find((d) => d.id === id)?.current) {
      toast({ tone: "warn", title: "Cannot revoke current device here", body: "Use Sign out instead." });
      return;
    }
    setDevices(next);
    saveDevices(next);
    toast({ tone: "ok", title: "Device marked revoked (local)" });
  }

  return (
    <div className="stack">
      <PageHeader
        title="Security & devices"
        lead="Active devices, session status, and security shortcuts. Identity remains the source of truth for sessions."
        actions={
          <Link className="btn btn--ghost" to="/app/account/mfa">
            MFA settings
          </Link>
        }
      />
      <Alert tone="info" title="Signed in as">
        {user?.fullName ?? user?.email ?? "User"} · {sessionHint}
      </Alert>
      <section className="ws-card">
        <header className="ws-card__head">
          <h2>Active devices</h2>
        </header>
        {devices.length === 0 ? (
          <EmptyState title="No devices" body="No device records yet." />
        ) : (
          <ul className="ws-feed">
            {devices.map((d) => (
              <li key={d.id}>
                <div>
                  <strong>{d.label}</strong>
                  <span>
                    {d.userAgent} · {new Date(d.lastSeen).toLocaleString()}
                  </span>
                </div>
                <div className="row" style={{ gap: "0.35rem", alignItems: "center" }}>
                  <StatusBadge status={d.current ? "current" : "other"} tone={d.current ? "ok" : "neutral"} />
                  {!d.current ? (
                    <Button variant="danger" onClick={() => revoke(d.id)}>
                      Revoke
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        void api.signOut().finally(() => {
                          clearSession();
                          toast({ tone: "info", title: "Signed out" });
                        });
                      }}
                    >
                      Sign out
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        <Button
          variant="primary"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true);
            void refreshSession().then((ok) => {
              setRefreshing(false);
              toast({
                tone: ok ? "ok" : "danger",
                title: ok ? "Session refreshed" : "Refresh failed",
                body: ok
                  ? "Tokens rotated via Identity SessionService."
                  : "Signed out — refresh rejected or expired.",
              });
            });
          }}
        >
          {refreshing ? "Refreshing…" : "Refresh session"}
        </Button>
        <Link className="btn btn--ghost" to="/app/account/email-verification">
          Email verification
        </Link>
        <Link className="btn btn--ghost" to="/app/platform/audit">
          Security & audit events
        </Link>
        <Link className="btn btn--ghost" to="/password-reset">
          Password reset
        </Link>
      </div>
    </div>
  );
}
