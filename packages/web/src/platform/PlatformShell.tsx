import { Link, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { BRAND } from "../brand";
import { MobileReadinessBar } from "./MobileReadiness";

export function PlatformPublicShell({
  brand,
  nav,
  homeTo,
}: {
  readonly brand: string;
  readonly homeTo: string;
  readonly nav: readonly { readonly to: string; readonly label: string }[];
}) {
  const { pathname } = useLocation();
  return (
    <div className="plt-shell">
      <a className="plt-skip" href="#plt-main">
        Skip to content
      </a>
      <header className="plt-shell__header">
        <Link to={homeTo} className="plt-shell__brand">
          {brand}
        </Link>
        <nav className="plt-shell__nav" aria-label="Primary">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={pathname === item.to || pathname.startsWith(`${item.to}/`) ? "is-active" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="plt-shell__actions">
          <Link className="btn btn--ghost" to="/app">
            Workspace
          </Link>
          <Link className="btn btn--primary" to="/login">
            Sign in
          </Link>
        </div>
      </header>
      <MobileReadinessBar />
      <main id="plt-main" className="plt-shell__main">
        <Outlet />
      </main>
      <footer className="plt-shell__footer">
        <span>{BRAND.name} · SaaS operations</span>
        <Link to="/">Marketing site</Link>
      </footer>
    </div>
  );
}

export function PlatformSubnav({
  items,
}: {
  readonly items: readonly { readonly to: string; readonly label: string }[];
}) {
  return (
    <nav className="plt-subnav" aria-label="Platform">
      {items.map((item) => (
        <Link key={item.to} to={item.to}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function LimitBar({
  label,
  used,
  limit,
  unit,
}: {
  readonly label: string;
  readonly used: number;
  readonly limit: number | "unlimited";
  readonly unit: string;
}) {
  const pct = limit === "unlimited" ? 8 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="plt-limit">
      <div className="plt-limit__head">
        <strong>{label}</strong>
        <span>
          {used.toLocaleString()} / {limit === "unlimited" ? "∞" : limit.toLocaleString()} {unit}
        </span>
      </div>
      <div className="plt-limit__track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="plt-limit__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  lead,
  children,
  actions,
}: {
  readonly title: string;
  readonly lead?: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}) {
  return (
    <section className="plt-card">
      <header className="plt-card__head">
        <div>
          <h2>{title}</h2>
          {lead ? <p>{lead}</p> : null}
        </div>
        {actions ? <div className="plt-card__actions">{actions}</div> : null}
      </header>
      <div className="plt-card__body">{children}</div>
    </section>
  );
}
