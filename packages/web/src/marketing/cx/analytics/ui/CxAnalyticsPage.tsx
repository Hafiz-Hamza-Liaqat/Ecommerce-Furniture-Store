/**
 * RC10.6 — CX Workspace Intelligence (executive + domain dashboards).
 * Read-only reporting; does not alter sales/planner/CRM/orders workflows.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, PageHeader } from "../../../../components/ui";
import { buildBiReport } from "../derive";
import { exportBiReportCsv, exportBiReportPdf, printBiDashboard } from "../export";
import {
  listProjectOptions,
  listRoomTypeOptions,
  listSalespersonOptions,
  listStyleOptions,
} from "../filter";
import { loadBiSnapshot } from "../source";
import { DEFAULT_BI_FILTERS, type BiFilters } from "../types";
import { BiFilterBar } from "./BiFilterBar";
import {
  BiActivityList,
  BiBarPanel,
  BiComparisonCard,
  BiDonutPanel,
  BiKpiGrid,
  BiLinePanel,
  BiLoading,
} from "./BiWidgets";

type TabId =
  | "executive"
  | "sales"
  | "crm"
  | "production"
  | "customers"
  | "planner";

const TABS: { id: TabId; label: string }[] = [
  { id: "executive", label: "Executive" },
  { id: "sales", label: "Sales" },
  { id: "crm", label: "CRM" },
  { id: "production", label: "Production" },
  { id: "customers", label: "Customers" },
  { id: "planner", label: "Planner" },
];

export function CxAnalyticsPage() {
  const [filters, setFilters] = useState<BiFilters>(DEFAULT_BI_FILTERS);
  const [tab, setTab] = useState<TabId>("executive");
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);

  const snapshot = useMemo(() => {
    void tick;
    return loadBiSnapshot();
  }, [tick]);

  const report = useMemo(() => buildBiReport(filters, snapshot), [filters, snapshot]);

  const salespeople = listSalespersonOptions(snapshot);
  const projects = listProjectOptions(snapshot);
  const styles = listStyleOptions(snapshot);
  const roomTypes = listRoomTypeOptions(snapshot);

  function refresh() {
    setLoading(true);
    // Yield so loading state paints before sync derive completes.
    window.setTimeout(() => {
      setTick((t) => t + 1);
      setLoading(false);
    }, 0);
  }

  return (
    <div className="stack cx-bi-page" data-bi-rev={tick}>
      <PageHeader
        title="Workspace intelligence"
        lead="Executive and operational analytics from local CX workspace data — reporting only; workflows unchanged."
        actions={
          <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={refresh}>
              Refresh
            </Button>
            <Button variant="ghost" onClick={() => exportBiReportCsv(report)}>
              Export CSV
            </Button>
            <Button variant="ghost" onClick={() => exportBiReportPdf(report)}>
              Export PDF
            </Button>
            <Button variant="ghost" onClick={() => printBiDashboard()}>
              Print
            </Button>
            <Link className="btn" to="/app/sales/workflow">
              Sales workflow
            </Link>
          </div>
        }
      />

      <Alert tone="info">
        Profit, inventory, financial ledger, AI forecasting, and multi-branch reporting are reserved
        extension points — not enabled in RC10.6.
      </Alert>

      <BiFilterBar
        value={filters}
        onChange={setFilters}
        salespeople={salespeople}
        projects={projects}
        styles={styles}
        roomTypes={roomTypes}
      />

      <nav className="erp-subnav" aria-label="Analytics sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`erp-subnav__link${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loading ? <BiLoading /> : null}

      {tab === "executive" ? (
        <div className="stack">
          <BiKpiGrid items={report.executive.kpis} />
          <div className="erp-dash-grid">
            <BiLinePanel title="Revenue trend" points={report.executive.revenueTrend} />
            <BiActivityList title="Recent activity" items={report.executive.recentActivity} />
          </div>
        </div>
      ) : null}

      {tab === "sales" ? (
        <div className="stack">
          <div className="erp-dash-grid">
            <BiComparisonCard
              label="Quotation acceptance"
              current={`${report.sales.quotationAcceptanceRate}%`}
              previous="—"
              delta={`${report.sales.quotationAcceptanceRate}%`}
            />
            <article className="ws-card">
              <header className="ws-card__head">
                <h2>Cycle times</h2>
              </header>
              <div className="ws-card__body">
                <p>
                  Avg approval:{" "}
                  <strong>
                    {report.sales.averageApprovalHours == null
                      ? "—"
                      : `${report.sales.averageApprovalHours} h`}
                  </strong>
                </p>
                <p>
                  Avg negotiation:{" "}
                  <strong>
                    {report.sales.averageNegotiationHours == null
                      ? "—"
                      : `${report.sales.averageNegotiationHours} h`}
                  </strong>
                </p>
              </div>
            </article>
          </div>
          <div className="erp-dash-grid">
            <BiBarPanel title="Conversion funnel" items={report.sales.conversionFunnel} />
            <BiBarPanel
              title="Revenue by salesperson"
              items={report.sales.revenueBySalesperson}
              mode="money"
            />
            <BiBarPanel
              title="Revenue by category"
              items={report.sales.revenueByCategory}
              mode="money"
            />
            <BiBarPanel
              title="Revenue by room type"
              items={report.sales.revenueByRoomType}
              mode="money"
            />
            <BiBarPanel title="Top configurations" items={report.sales.topConfigurations} />
            <BiBarPanel
              title="Salesperson pipeline value"
              items={report.sales.salespersonPerformance}
              mode="money"
            />
          </div>
        </div>
      ) : null}

      {tab === "crm" ? (
        <div className="stack">
          <BiKpiGrid
            items={[
              {
                id: "lead-conv",
                label: "Lead conversion",
                value: `${report.crm.leadConversionRate}%`,
              },
              { id: "won", label: "Won opportunities", value: String(report.crm.wonCount) },
              { id: "lost", label: "Lost opportunities", value: String(report.crm.lostCount) },
              {
                id: "bottleneck",
                label: "Approval bottlenecks",
                value: String(report.crm.approvalBottlenecks),
              },
            ]}
          />
          <div className="erp-dash-grid">
            <BiDonutPanel title="Pipeline stage distribution" items={report.crm.stageDistribution} />
            <BiBarPanel title="Average days in stage" items={report.crm.averageDaysInStage} />
            <BiActivityList title="Recent leads" items={report.crm.recentLeads} />
          </div>
        </div>
      ) : null}

      {tab === "production" ? (
        <div className="stack">
          <BiKpiGrid
            items={[
              {
                id: "prod",
                label: "Orders in production",
                value: String(report.production.inProduction),
              },
              {
                id: "await",
                label: "Awaiting production",
                value: String(report.production.awaitingProduction),
              },
              {
                id: "upcoming",
                label: "Upcoming deliveries",
                value: String(report.production.upcomingDeliveries),
              },
              {
                id: "done",
                label: "Completed deliveries",
                value: String(report.production.completedDeliveries),
              },
              {
                id: "backlog",
                label: "Production backlog",
                value: String(report.production.backlog),
              },
              {
                id: "avg-prod",
                label: "Avg production days",
                value:
                  report.production.averageProductionDays == null
                    ? "—"
                    : String(report.production.averageProductionDays),
              },
              {
                id: "avg-del",
                label: "Avg delivery days",
                value:
                  report.production.averageDeliveryDays == null
                    ? "—"
                    : String(report.production.averageDeliveryDays),
              },
            ]}
          />
          <BiDonutPanel title="Order status mix" items={report.production.statusDistribution} />
        </div>
      ) : null}

      {tab === "customers" ? (
        <div className="stack">
          <BiKpiGrid
            items={[
              {
                id: "new-c",
                label: "New customers",
                value: String(report.customers.newCustomers),
              },
              {
                id: "ret-c",
                label: "Returning customers",
                value: String(report.customers.returningCustomers),
              },
              {
                id: "ppc",
                label: "Projects per customer",
                value: String(report.customers.projectsPerCustomer),
              },
              {
                id: "avg-spend",
                label: "Average customer spend",
                value: `PKR ${report.customers.averageSpendPkr.toLocaleString("en-PK")}`,
              },
            ]}
          />
          <div className="erp-dash-grid">
            <BiBarPanel
              title="Highest-value customers"
              items={report.customers.highestValue}
              mode="money"
            />
            <BiBarPanel title="Most active customers" items={report.customers.mostActive} />
            <BiActivityList title="Recent customer activity" items={report.customers.recentActivity} />
          </div>
        </div>
      ) : null}

      {tab === "planner" ? (
        <div className="stack">
          <BiKpiGrid
            items={[
              {
                id: "avg-room",
                label: "Average room budget",
                value: `PKR ${report.planner.averageRoomBudgetPkr.toLocaleString("en-PK")}`,
              },
            ]}
          />
          <div className="erp-dash-grid">
            <BiDonutPanel title="Furniture styles" items={report.planner.styleDistribution} />
            <BiBarPanel title="Package popularity" items={report.planner.packagePopularity} />
            <BiBarPanel title="Room type distribution" items={report.planner.roomTypeDistribution} />
            <BiBarPanel title="Budget distribution" items={report.planner.budgetBuckets} />
            <BiBarPanel title="Popular materials" items={report.planner.materialHints} />
            <BiBarPanel title="Popular finishes" items={report.planner.finishHints} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
