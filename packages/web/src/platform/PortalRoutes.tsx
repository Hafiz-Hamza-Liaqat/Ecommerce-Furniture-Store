import { useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { BRAND } from "../brand";
import { Alert, PageHeader } from "../components/ui";
import { EmptyState, StatusBadge, Tabs } from "../workspace/widgets";
import { PlatformPublicShell, SectionCard } from "./PlatformShell";
import {
  loadPortalInvoices,
  loadPortalOrders,
  loadPortalProjects,
  loadPortalTickets,
} from "./store";

function PortalHome() {
  const [tab, setTab] = useState("orders");
  const orders = loadPortalOrders();
  const invoices = loadPortalInvoices();
  const projects = loadPortalProjects();
  const tickets = loadPortalTickets();

  return (
    <div className="stack plt-page">
      <PageHeader
        title="Customer portal"
        lead="View orders, invoices, projects, service requests, downloads, quotes, tickets, messages, and documents."
        actions={
          <Link className="btn btn--ghost" to="/contact">
            Contact support
          </Link>
        }
      />
      <Alert tone="info" title="Existing APIs">
        Portal lists are presentation fixtures aligned with Sales, Finance, Projects, and Service modules — no new ERP
        APIs.
      </Alert>

      <Tabs
        tabs={[
          { id: "orders", label: "Orders" },
          { id: "invoices", label: "Invoices" },
          { id: "projects", label: "Projects" },
          { id: "service", label: "Service" },
          { id: "docs", label: "Documents" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "orders" ? (
        <SectionCard title="Orders">
          <ul className="plt-list">
            {orders.map((o) => (
              <li key={o.id}>
                <div>
                  <strong>{o.title}</strong>
                  <span>
                    {o.id} · {o.amount}
                  </span>
                </div>
                <StatusBadge status={o.status} tone="ok" />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {tab === "invoices" ? (
        <SectionCard title="Invoices">
          <ul className="plt-list">
            {invoices.map((i) => (
              <li key={i.id}>
                <div>
                  <strong>{i.number}</strong>
                  <span>{i.amount}</span>
                </div>
                <StatusBadge status={i.status} tone={i.status === "Paid" ? "ok" : "warn"} />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {tab === "projects" ? (
        <SectionCard title="Track projects">
          <ul className="plt-list">
            {projects.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <span>
                    {p.progress}% · {p.status}
                  </span>
                </div>
                <div className="plt-limit__track" style={{ width: 120 }}>
                  <div className="plt-limit__fill" style={{ width: `${p.progress}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {tab === "service" ? (
        <SectionCard title="Service requests & tickets">
          <ul className="plt-list">
            {tickets.map((t) => (
              <li key={t.id}>
                <div>
                  <strong>{t.subject}</strong>
                  <span>{t.id}</span>
                </div>
                <StatusBadge status={t.status} tone={t.status === "Resolved" ? "ok" : "warn"} />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {tab === "docs" ? (
        <SectionCard title="Downloads, quotes & messages">
          <EmptyState
            title="Document library"
            body="Quotes, packing lists, and signed drawings surface from DAM / Sales — presentation links only."
          />
          <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
            <a className="btn btn--ghost" href="/catalogue.pdf">
              Catalogue PDF
            </a>
            <Link className="btn btn--ghost" to="/quote">
              Request quote
            </Link>
            <Link className="btn btn--ghost" to="/contact">
              Messages
            </Link>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

export function PortalRoutes() {
  return (
    <Routes>
      <Route
        element={
          <PlatformPublicShell
            brand={`${BRAND.name} Customer Portal`}
            homeTo="/portal"
            nav={[
              { to: "/portal", label: "Home" },
              { to: "/onboarding", label: "Onboarding" },
              { to: "/app/platform/success", label: "Help" },
            ]}
          />
        }
      >
        <Route index element={<PortalHome />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Route>
    </Routes>
  );
}
