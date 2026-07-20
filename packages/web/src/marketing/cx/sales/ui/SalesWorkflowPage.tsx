/**
 * RC10.4 — Sales workflow workspace (CRM pipeline, quotes, orders, timeline).
 * Staff-only surface under /app/sales/workflow.
 */

import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader, Alert, Button } from "../../../../components/ui";
import { useSession } from "../../../../state/session";
import {
  ASSIGNMENT_ROLES,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  QUOTE_WORKFLOW_STATUSES,
  QUOTE_STATUS_LABELS,
  addInternalNote,
  advanceStage,
  assignStaff,
  computeOperationalMetrics,
  createInquiry,
  createOrderFromAcceptedQuote,
  createQuoteRevision,
  getOpportunity,
  listCustomerTimeline,
  listDocuments,
  listInternalNotes,
  listOrders,
  listQuotes,
  listTimeline,
  openDeliveryNotePlaceholder,
  openInvoicePlaceholder,
  openOrderPdf,
  openQuotationPdf,
  pipelineBoard,
  searchSales,
  setOrderStatus,
  setQuoteStatus,
  type AssignmentRole,
  type OrderStatus,
  type PipelineStage,
  type QuoteWorkflowStatus,
  type SalesOpportunity,
  type SalesSearchFilters,
} from "..";

function formatPkr(n: number): string {
  return `PKR ${n.toLocaleString("en-PK")}`;
}

type TabId = "dashboard" | "pipeline" | "quotes" | "orders" | "detail";

export function SalesWorkflowPage() {
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const focusOpp = params.get("opportunity");
  const [tab, setTab] = useState<TabId>(focusOpp ? "detail" : "dashboard");
  const [filters, setFilters] = useState<SalesSearchFilters>({});
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const metrics = computeOperationalMetrics();
  const board = pipelineBoard();
  const searched = searchSales(filters);

  const selected = focusOpp ? getOpportunity(focusOpp) : null;

  const openOpp = (id: string) => {
    setParams({ opportunity: id });
    setTab("detail");
    refresh();
  };

  return (
    <div className="stack sales-workflow" data-sales-rev={tick}>
      <PageHeader
        title="Sales workflow"
        lead="CRM pipeline from inquiry through quotation, order, production, and delivery — linked to planner packages (local until RC10.5)."
        actions={
          <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
            <Button
              variant="primary"
              onClick={() => {
                const name = window.prompt("Customer name");
                if (!name) return;
                const email = window.prompt("Customer email") || `${name.replace(/\s+/g, ".").toLowerCase()}@example.com`;
                const opp = createInquiry({
                  customerName: name,
                  customerEmail: email,
                  source: "sales-workspace",
                  message: "Manual inquiry from sales workflow.",
                });
                openOpp(opp.id);
              }}
            >
              New inquiry
            </Button>
            <Link className="btn" to="/app/sales">
              ERP Sales
            </Link>
          </div>
        }
      />

      <nav className="erp-subnav" aria-label="Sales workflow sections">
        {(
          [
            ["dashboard", "Dashboard"],
            ["pipeline", "Pipeline"],
            ["quotes", "Quotations"],
            ["orders", "Orders"],
            ["detail", "Customer detail"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`erp-subnav__link${tab === id ? " is-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "dashboard" ? (
        <DashboardPanel metrics={metrics} board={board} onOpen={openOpp} />
      ) : null}

      {tab === "pipeline" ? (
        <PipelinePanel board={board} filters={filters} setFilters={setFilters} onOpen={openOpp} refresh={refresh} />
      ) : null}

      {tab === "quotes" ? (
        <QuotesPanel
          quotes={searched.quotes}
          filters={filters}
          setFilters={setFilters}
          onOpen={openOpp}
          refresh={refresh}
        />
      ) : null}

      {tab === "orders" ? (
        <OrdersPanel
          orders={searched.orders}
          filters={filters}
          setFilters={setFilters}
          onOpen={openOpp}
          refresh={refresh}
        />
      ) : null}

      {tab === "detail" ? (
        selected ? (
          <DetailPanel
            opportunity={selected}
            userId={user?.id ?? "staff-local"}
            userLabel={user?.email || "Sales staff"}
            refresh={refresh}
          />
        ) : (
          <Alert tone="info">Select an inquiry from Pipeline or create a new inquiry.</Alert>
        )
      ) : null}
    </div>
  );
}

function DashboardPanel({
  metrics,
  board,
  onOpen,
}: {
  readonly metrics: ReturnType<typeof computeOperationalMetrics>;
  readonly board: ReturnType<typeof pipelineBoard>;
  readonly onOpen: (id: string) => void;
}) {
  const recent = Object.values(board)
    .flat()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);
  const pendingQuotes = listQuotes().filter((q) => q.status === "draft" || q.status === "sent").slice(0, 5);
  const awaiting = listOrders().filter((o) => o.status === "awaiting_approval").slice(0, 5);
  const production = listOrders().filter((o) => o.status === "in_production").slice(0, 5);
  const deliveries = listOrders().filter((o) => o.status === "ready_for_delivery").slice(0, 5);

  return (
    <>
      <div className="erp-kpi-grid">
        <div className="ws-stat">
          <div className="ws-stat__label">Open quotations</div>
          <div className="ws-stat__value">{metrics.openQuotations}</div>
        </div>
        <div className="ws-stat">
          <div className="ws-stat__label">Conversion rate</div>
          <div className="ws-stat__value">{metrics.conversionRate}%</div>
        </div>
        <div className="ws-stat">
          <div className="ws-stat__label">Orders in production</div>
          <div className="ws-stat__value">{metrics.ordersInProduction}</div>
        </div>
        <div className="ws-stat">
          <div className="ws-stat__label">Avg quotation</div>
          <div className="ws-stat__value">{formatPkr(metrics.averageQuotationValue)}</div>
        </div>
        <div className="ws-stat">
          <div className="ws-stat__label">Pending approvals</div>
          <div className="ws-stat__value">{metrics.pendingApprovals}</div>
        </div>
        <div className="ws-stat">
          <div className="ws-stat__label">Accepted revenue</div>
          <div className="ws-stat__value">{formatPkr(metrics.revenueAcceptedPkr)}</div>
        </div>
      </div>

      <div className="erp-dash-grid">
        <DashList title="Recent inquiries" items={recent.map((o) => ({ id: o.id, label: o.customerName, meta: PIPELINE_STAGE_LABELS[o.stage] }))} onOpen={onOpen} />
        <DashList
          title="Pending quotations"
          items={pendingQuotes.map((q) => ({
            id: q.opportunityId,
            label: q.label,
            meta: `${QUOTE_STATUS_LABELS[q.status]} · ${formatPkr(q.totalPkr)}`,
          }))}
          onOpen={onOpen}
        />
        <DashList
          title="Orders awaiting approval"
          items={awaiting.map((o) => ({
            id: o.opportunityId,
            label: o.customerName,
            meta: formatPkr(o.totalPkr),
          }))}
          onOpen={onOpen}
        />
        <DashList
          title="Production queue"
          items={production.map((o) => ({
            id: o.opportunityId,
            label: o.customerName,
            meta: ORDER_STATUS_LABELS[o.status],
          }))}
          onOpen={onOpen}
        />
        <DashList
          title="Upcoming deliveries"
          items={deliveries.map((o) => ({
            id: o.opportunityId,
            label: o.customerName,
            meta: o.deliveryStatus,
          }))}
          onOpen={onOpen}
        />
      </div>
    </>
  );
}

function DashList({
  title,
  items,
  onOpen,
}: {
  readonly title: string;
  readonly items: readonly { id: string; label: string; meta: string }[];
  readonly onOpen: (id: string) => void;
}) {
  return (
    <section className="ws-card">
      <header className="ws-card__head">
        <h2>{title}</h2>
      </header>
      <ul className="ws-feed">
        {items.length === 0 ? <li className="cx-muted">None yet.</li> : null}
        {items.map((item) => (
          <li key={`${title}-${item.id}-${item.label}`}>
            <button type="button" className="linkish" onClick={() => onOpen(item.id)}>
              <strong>{item.label}</strong>
            </button>
            <span>{item.meta}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FilterStrip({
  filters,
  setFilters,
}: {
  readonly filters: SalesSearchFilters;
  readonly setFilters: (f: SalesSearchFilters) => void;
}) {
  return (
    <div className="sales-workflow__filters">
      <label>
        Customer
        <input
          value={filters.customer ?? ""}
          onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
        />
      </label>
      <label>
        Salesperson
        <input
          value={filters.salesperson ?? ""}
          onChange={(e) => setFilters({ ...filters, salesperson: e.target.value })}
        />
      </label>
      <label>
        Stage
        <select
          value={filters.stage ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, stage: (e.target.value || "") as PipelineStage | "" })
          }
        >
          <option value="">All stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {PIPELINE_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Quote status
        <select
          value={filters.quoteStatus ?? ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              quoteStatus: (e.target.value || "") as QuoteWorkflowStatus | "",
            })
          }
        >
          <option value="">All</option>
          {QUOTE_WORKFLOW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {QUOTE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Order status
        <select
          value={filters.orderStatus ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, orderStatus: (e.target.value || "") as OrderStatus | "" })
          }
        >
          <option value="">All</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label>
        From
        <input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
        />
      </label>
      <label>
        To
        <input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
        />
      </label>
      <label>
        Search
        <input
          value={filters.query ?? ""}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          placeholder="Name, id, project…"
        />
      </label>
    </div>
  );
}

function PipelinePanel({
  board,
  filters,
  setFilters,
  onOpen,
  refresh,
}: {
  readonly board: ReturnType<typeof pipelineBoard>;
  readonly filters: SalesSearchFilters;
  readonly setFilters: (f: SalesSearchFilters) => void;
  readonly onOpen: (id: string) => void;
  readonly refresh: () => void;
}) {
  const filteredIds = new Set(searchSales(filters).opportunities.map((o) => o.id));
  return (
    <>
      <FilterStrip filters={filters} setFilters={setFilters} />
      <div className="sales-workflow__kanban">
        {PIPELINE_STAGES.map((stage) => (
          <section key={stage} className="ws-card sales-workflow__column">
            <header className="ws-card__head">
              <h2>{PIPELINE_STAGE_LABELS[stage]}</h2>
              <span className="cx-muted">{board[stage].filter((o) => filteredIds.has(o.id)).length}</span>
            </header>
            <ul className="ws-feed">
              {board[stage]
                .filter((o) => filteredIds.has(o.id))
                .map((opp) => (
                  <li key={opp.id}>
                    <button type="button" className="linkish" onClick={() => onOpen(opp.id)}>
                      <strong>{opp.customerName}</strong>
                    </button>
                    <span>
                      {opp.packageTotalPkr != null ? formatPkr(opp.packageTotalPkr) : opp.source}
                    </span>
                    <label className="sales-workflow__stage-move">
                      Move
                      <select
                        value={opp.stage}
                        onChange={(e) => {
                          advanceStage(opp.id, e.target.value as PipelineStage);
                          refresh();
                        }}
                      >
                        {PIPELINE_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {PIPELINE_STAGE_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function QuotesPanel({
  quotes,
  filters,
  setFilters,
  onOpen,
  refresh,
}: {
  readonly quotes: ReturnType<typeof searchSales>["quotes"];
  readonly filters: SalesSearchFilters;
  readonly setFilters: (f: SalesSearchFilters) => void;
  readonly onOpen: (id: string) => void;
  readonly refresh: () => void;
}) {
  return (
    <>
      <FilterStrip filters={filters} setFilters={setFilters} />
      <section className="ws-card">
        <header className="ws-card__head">
          <h2>Quotations ({quotes.length})</h2>
        </header>
        <div className="ws-card__body">
          <table className="sales-workflow__table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Rev</th>
                <th>Status</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <button type="button" className="linkish" onClick={() => onOpen(q.opportunityId)}>
                      {q.label}
                    </button>
                  </td>
                  <td>r{q.revision}</td>
                  <td>{QUOTE_STATUS_LABELS[q.status]}</td>
                  <td>{formatPkr(q.totalPkr)}</td>
                  <td>
                    <select
                      aria-label={`Status for ${q.label}`}
                      value={q.status}
                      onChange={(e) => {
                        setQuoteStatus(q.id, e.target.value as QuoteWorkflowStatus);
                        refresh();
                      }}
                    >
                      {QUOTE_WORKFLOW_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {QUOTE_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>{" "}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const opp = getOpportunity(q.opportunityId);
                        openQuotationPdf(q, opp?.customerName ?? "Customer");
                        refresh();
                      }}
                    >
                      PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function OrdersPanel({
  orders,
  filters,
  setFilters,
  onOpen,
  refresh,
}: {
  readonly orders: ReturnType<typeof searchSales>["orders"];
  readonly filters: SalesSearchFilters;
  readonly setFilters: (f: SalesSearchFilters) => void;
  readonly onOpen: (id: string) => void;
  readonly refresh: () => void;
}) {
  return (
    <>
      <FilterStrip filters={filters} setFilters={setFilters} />
      <section className="ws-card">
        <header className="ws-card__head">
          <h2>Orders ({orders.length})</h2>
        </header>
        <div className="ws-card__body">
          <table className="sales-workflow__table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Delivery</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <button type="button" className="linkish" onClick={() => onOpen(o.opportunityId)}>
                      {o.customerName}
                    </button>
                  </td>
                  <td>
                    <select
                      value={o.status}
                      onChange={(e) => {
                        setOrderStatus(o.id, e.target.value as OrderStatus);
                        refresh();
                      }}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {ORDER_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{o.paymentStatus}</td>
                  <td>{o.deliveryStatus}</td>
                  <td>{formatPkr(o.totalPkr)}</td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        openOrderPdf(o);
                        refresh();
                      }}
                    >
                      Order PDF
                    </Button>{" "}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        openInvoicePlaceholder(o);
                        refresh();
                      }}
                    >
                      Invoice
                    </Button>{" "}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        openDeliveryNotePlaceholder(o);
                        refresh();
                      }}
                    >
                      Delivery
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function DetailPanel({
  opportunity,
  userId,
  userLabel,
  refresh,
}: {
  readonly opportunity: SalesOpportunity;
  readonly userId: string;
  readonly userLabel: string;
  readonly refresh: () => void;
}) {
  const quotes = listQuotes(opportunity.id);
  const orders = listOrders(opportunity.id);
  const timeline = listCustomerTimeline(opportunity.customerEmail, opportunity.customerName);
  const notes = listInternalNotes(opportunity.id);
  const docs = listDocuments(opportunity.id);
  const [noteText, setNoteText] = useState("");

  return (
    <div className="erp-dash-grid">
      <section className="ws-card">
        <header className="ws-card__head">
          <h2>{opportunity.customerName}</h2>
          <span className="cx-muted">{PIPELINE_STAGE_LABELS[opportunity.stage]}</span>
        </header>
        <div className="ws-card__body stack">
          <p>
            {opportunity.customerEmail}
            {opportunity.customerPhone ? ` · ${opportunity.customerPhone}` : ""}
          </p>
          <p className="cx-muted">
            Source: {opportunity.source}
            {opportunity.projectTitle ? ` · Project: ${opportunity.projectTitle}` : ""}
          </p>
          {opportunity.projectId ? (
            <Link to={`/planner?projectId=${encodeURIComponent(opportunity.projectId)}`}>
              Open planner package
            </Link>
          ) : null}
          <label>
            Pipeline stage
            <select
              value={opportunity.stage}
              onChange={(e) => {
                advanceStage(opportunity.id, e.target.value as PipelineStage);
                refresh();
              }}
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {PIPELINE_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <div>
            <h3>Assignments</h3>
            {ASSIGNMENT_ROLES.map((role) => {
              const current = opportunity.assignments.find((a) => a.role === role);
              return (
                <label key={role} className="sales-workflow__assign">
                  {role.replace(/_/g, " ")}
                  <input
                    defaultValue={current?.label ?? ""}
                    placeholder="Name"
                    onBlur={(e) => {
                      const label = e.target.value.trim();
                      if (!label) return;
                      assignStaff(opportunity.id, role as AssignmentRole, userId, label);
                      refresh();
                    }}
                  />
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <section className="ws-card">
        <header className="ws-card__head">
          <h2>Quotations</h2>
          <Button
            variant="ghost"
            onClick={() => {
              createQuoteRevision({
                opportunityId: opportunity.id,
                ...(opportunity.projectId ? { projectId: opportunity.projectId } : {}),
                label: `Quote ${quotes.length + 1}`,
                lines: quotes[0]?.lines ?? [
                  { productId: "placeholder", name: "Configured package", qty: 1, unitPkr: opportunity.packageTotalPkr ?? 0 },
                ],
                totalPkr: opportunity.packageTotalPkr ?? quotes[0]?.totalPkr ?? 0,
                status: "draft",
              });
              refresh();
            }}
          >
            New revision
          </Button>
        </header>
        <ul className="ws-feed">
          {quotes.map((q) => (
            <li key={q.id}>
              <strong>
                {q.label} (r{q.revision})
              </strong>
              <span>
                {QUOTE_STATUS_LABELS[q.status]} · {formatPkr(q.totalPkr)}
              </span>
              <div className="row" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
                <select
                  value={q.status}
                  onChange={(e) => {
                    setQuoteStatus(q.id, e.target.value as QuoteWorkflowStatus);
                    refresh();
                  }}
                >
                  {QUOTE_WORKFLOW_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {QUOTE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                {q.status === "accepted" ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      createOrderFromAcceptedQuote(q.id);
                      refresh();
                    }}
                  >
                    Create order
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  onClick={() => {
                    openQuotationPdf(q, opportunity.customerName);
                    refresh();
                  }}
                >
                  PDF
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="ws-card">
        <header className="ws-card__head">
          <h2>Orders</h2>
        </header>
        <ul className="ws-feed">
          {orders.length === 0 ? <li className="cx-muted">No orders yet.</li> : null}
          {orders.map((o) => (
            <li key={o.id}>
              <strong>{o.id.slice(0, 8)}</strong>
              <span>
                {ORDER_STATUS_LABELS[o.status]} · {formatPkr(o.totalPkr)}
                {o.salespersonLabel ? ` · ${o.salespersonLabel}` : ""}
              </span>
              <select
                value={o.status}
                onChange={(e) => {
                  setOrderStatus(o.id, e.target.value as OrderStatus);
                  refresh();
                }}
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </section>

      <section className="ws-card">
        <header className="ws-card__head">
          <h2>Customer timeline</h2>
        </header>
        <ul className="ws-feed">
          {(timeline.length ? timeline : listTimeline(opportunity.id)).map((e) => (
            <li key={e.id}>
              <strong>{e.title}</strong>
              <span>
                {new Date(e.at).toLocaleString()} — {e.body}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ws-card sales-workflow__internal">
        <header className="ws-card__head">
          <h2>Internal notes (staff only)</h2>
        </header>
        <div className="ws-card__body stack">
          <Alert tone="warn">Internal notes never appear on customer quotations or PDFs.</Alert>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder="e.g. Customer prefers walnut finish."
          />
          <Button
            variant="primary"
            onClick={() => {
              addInternalNote(opportunity.id, noteText, userId, userLabel);
              setNoteText("");
              refresh();
            }}
          >
            Add note
          </Button>
          <ul className="ws-feed">
            {notes.map((n) => (
              <li key={n.id}>
                <strong>{n.authorLabel}</strong>
                <span>
                  {new Date(n.createdAt).toLocaleString()} — {n.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ws-card">
        <header className="ws-card__head">
          <h2>Documents</h2>
        </header>
        <ul className="ws-feed">
          {docs.length === 0 ? <li className="cx-muted">No documents generated yet.</li> : null}
          {docs.map((d) => (
            <li key={d.id}>
              <strong>{d.label}</strong>
              <span>
                {d.kind} · {new Date(d.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
