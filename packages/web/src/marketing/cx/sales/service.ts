/**
 * RC10.4 — Sales workflow service (pipeline, quotes, orders, timeline, notes).
 */

import { pushNotification } from "../../nav/notifications";
import { loadSalesWorkspace, nowIso, saveSalesWorkspace, uid } from "./store";
import type {
  AssignmentRole,
  DocumentKind,
  InternalNote,
  OperationalMetrics,
  OrderStatus,
  PackageLineSnapshot,
  PipelineStage,
  QuoteWorkflowStatus,
  SalesDocument,
  SalesOpportunity,
  SalesOrder,
  SalesQuote,
  SalesSearchFilters,
  StaffAssignment,
  TimelineEvent,
  TimelineEventType,
} from "./types";
import { PIPELINE_STAGES } from "./types";

function customerKey(email: string, name: string): string {
  return (email || name).trim().toLowerCase();
}

function appendTimeline(
  events: readonly TimelineEvent[],
  event: Omit<TimelineEvent, "id" | "at"> & { at?: string },
): TimelineEvent[] {
  const full: TimelineEvent = {
    ...event,
    id: uid(),
    at: event.at ?? nowIso(),
  };
  return [full, ...events].slice(0, 500);
}

function mutate(
  updater: (state: ReturnType<typeof loadSalesWorkspace>) => ReturnType<typeof loadSalesWorkspace>,
): ReturnType<typeof loadSalesWorkspace> {
  const next = updater(loadSalesWorkspace());
  saveSalesWorkspace(next);
  return next;
}

export function listOpportunities(): SalesOpportunity[] {
  return [...loadSalesWorkspace().opportunities];
}

export function getOpportunity(id: string): SalesOpportunity | null {
  return loadSalesWorkspace().opportunities.find((o) => o.id === id) ?? null;
}

export function listQuotes(opportunityId?: string): SalesQuote[] {
  const all = loadSalesWorkspace().quotes;
  return opportunityId ? all.filter((q) => q.opportunityId === opportunityId) : [...all];
}

export function getQuote(id: string): SalesQuote | null {
  return loadSalesWorkspace().quotes.find((q) => q.id === id) ?? null;
}

export function listOrders(opportunityId?: string): SalesOrder[] {
  const all = loadSalesWorkspace().orders;
  return opportunityId ? all.filter((o) => o.opportunityId === opportunityId) : [...all];
}

export function getOrder(id: string): SalesOrder | null {
  return loadSalesWorkspace().orders.find((o) => o.id === id) ?? null;
}

export function listTimeline(opportunityId: string): TimelineEvent[] {
  return loadSalesWorkspace().timeline.filter((e) => e.opportunityId === opportunityId);
}

export function listCustomerTimeline(customerEmail: string, customerName: string): TimelineEvent[] {
  const key = customerKey(customerEmail, customerName);
  return loadSalesWorkspace().timeline.filter((e) => e.customerKey === key);
}

/** Staff-only notes — never expose via customer-facing helpers. */
export function listInternalNotes(opportunityId: string): InternalNote[] {
  return loadSalesWorkspace().notes.filter((n) => n.opportunityId === opportunityId);
}

export function listDocuments(opportunityId?: string): SalesDocument[] {
  const all = loadSalesWorkspace().documents;
  return opportunityId ? all.filter((d) => d.opportunityId === opportunityId) : [...all];
}

export type CreateInquiryInput = {
  readonly customerName: string;
  readonly customerEmail: string;
  readonly customerPhone?: string;
  readonly source: string;
  readonly projectId?: string;
  readonly projectTitle?: string;
  readonly leadDraftId?: string;
  readonly budgetPkr?: number;
  readonly packageTotalPkr?: number;
  readonly message?: string;
};

export function createInquiry(input: CreateInquiryInput): SalesOpportunity {
  const at = nowIso();
  let created!: SalesOpportunity;
  mutate((state) => {
    created = {
      id: uid(),
      customerName: input.customerName.trim() || "Customer",
      customerEmail: input.customerEmail.trim().toLowerCase(),
      ...(input.customerPhone ? { customerPhone: input.customerPhone } : {}),
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.projectTitle ? { projectTitle: input.projectTitle } : {}),
      ...(input.leadDraftId ? { leadDraftId: input.leadDraftId } : {}),
      stage: "new_inquiry",
      ...(input.budgetPkr != null ? { budgetPkr: input.budgetPkr } : {}),
      ...(input.packageTotalPkr != null ? { packageTotalPkr: input.packageTotalPkr } : {}),
      quoteIds: [],
      orderIds: [],
      assignments: [],
      source: input.source,
      createdAt: at,
      updatedAt: at,
    };
    let timeline = appendTimeline(state.timeline, {
      opportunityId: created.id,
      customerKey: customerKey(created.customerEmail, created.customerName),
      type: "inquiry_created",
      title: "Inquiry created",
      body: input.message?.slice(0, 240) || `New inquiry from ${created.customerName}.`,
      href: `/app/sales/workflow?opportunity=${created.id}`,
      ...(input.projectId ? { meta: { projectId: input.projectId } } : {}),
    });
    if (input.projectId) {
      timeline = appendTimeline(timeline, {
        opportunityId: created.id,
        customerKey: customerKey(created.customerEmail, created.customerName),
        type: "project_linked",
        title: "Project linked",
        body: input.projectTitle ?? input.projectId,
        href: `/planner?projectId=${encodeURIComponent(input.projectId)}`,
        at,
      });
    }
    return {
      ...state,
      opportunities: [created, ...state.opportunities],
      timeline,
    };
  });

  pushNotification({
    category: "crm_lead",
    title: "CRM lead created",
    body: `${created.customerName} — ${created.source}`,
    href: `/app/sales/workflow?opportunity=${encodeURIComponent(created.id)}`,
  });

  return created;
}

export function advanceStage(opportunityId: string, stage: PipelineStage): SalesOpportunity | null {
  let updated: SalesOpportunity | null = null;
  mutate((state) => {
    const opp = state.opportunities.find((o) => o.id === opportunityId);
    if (!opp || opp.stage === stage) {
      updated = opp ?? null;
      return state;
    }
    const at = nowIso();
    updated = { ...opp, stage, updatedAt: at };
    const timeline = appendTimeline(state.timeline, {
      opportunityId,
      customerKey: customerKey(opp.customerEmail, opp.customerName),
      type: stage === "production" ? "production_started" : stage === "delivered" ? "delivery_completed" : "stage_changed",
      title: "Pipeline stage updated",
      body: `${opp.stage} → ${stage}`,
      href: `/app/sales/workflow?opportunity=${opportunityId}`,
      meta: { from: opp.stage, to: stage },
    });
    return {
      ...state,
      opportunities: state.opportunities.map((o) => (o.id === opportunityId ? updated! : o)),
      timeline,
    };
  });
  return updated;
}

export type CreateQuoteInput = {
  readonly opportunityId: string;
  readonly projectId?: string;
  readonly projectQuoteId?: string;
  readonly label: string;
  readonly lines: readonly PackageLineSnapshot[];
  readonly totalPkr: number;
  readonly status?: QuoteWorkflowStatus;
};

export function createQuoteRevision(input: CreateQuoteInput): SalesQuote | null {
  let created: SalesQuote | null = null;
  mutate((state) => {
    const opp = state.opportunities.find((o) => o.id === input.opportunityId);
    if (!opp) return state;

    const prior = state.quotes
      .filter((q) => q.opportunityId === input.opportunityId)
      .sort((a, b) => b.revision - a.revision)[0];
    const revision = (prior?.revision ?? 0) + 1;
    const at = nowIso();
    const status = input.status ?? "draft";
    created = {
      id: uid(),
      opportunityId: input.opportunityId,
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.projectQuoteId ? { projectQuoteId: input.projectQuoteId } : {}),
      revision,
      ...(prior ? { revisesQuoteId: prior.id } : {}),
      label: input.label,
      status,
      lines: input.lines,
      totalPkr: input.totalPkr,
      timestamps: {
        draftAt: at,
        ...(status === "sent" ? { sentAt: at } : {}),
        ...(status === "accepted" ? { acceptedAt: at, sentAt: at } : {}),
      },
      createdAt: at,
    };

    const nextOpp: SalesOpportunity = {
      ...opp,
      quoteIds: [created.id, ...opp.quoteIds],
      packageTotalPkr: input.totalPkr,
      updatedAt: at,
      stage:
        opp.stage === "new_inquiry" || opp.stage === "qualified"
          ? status === "sent" || status === "accepted"
            ? "quotation_sent"
            : opp.stage === "new_inquiry"
              ? "qualified"
              : opp.stage
          : opp.stage,
    };

    const eventType: TimelineEventType = prior ? "quote_revised" : "quote_generated";
    const timeline = appendTimeline(state.timeline, {
      opportunityId: opp.id,
      customerKey: customerKey(opp.customerEmail, opp.customerName),
      type: eventType,
      title: prior ? `Quote revised (r${revision})` : "Quote generated",
      body: `${created.label} — ${created.totalPkr.toLocaleString("en-PK")} PKR`,
      href: `/app/sales/workflow?opportunity=${opp.id}&quote=${created.id}`,
      meta: { quoteId: created.id, revision },
    });

    return {
      ...state,
      opportunities: state.opportunities.map((o) => (o.id === opp.id ? nextOpp : o)),
      quotes: [created, ...state.quotes],
      timeline,
    };
  });
  return created;
}

export function setQuoteStatus(quoteId: string, status: QuoteWorkflowStatus): SalesQuote | null {
  let updated: SalesQuote | null = null;
  mutate((state) => {
    const quote = state.quotes.find((q) => q.id === quoteId);
    if (!quote || quote.status === status) {
      updated = quote ?? null;
      return state;
    }
    const at = nowIso();
    const timestamps = { ...quote.timestamps };
    if (status === "sent") timestamps.sentAt = at;
    if (status === "viewed") timestamps.viewedAt = at;
    if (status === "accepted") timestamps.acceptedAt = at;
    if (status === "rejected") timestamps.rejectedAt = at;
    if (status === "expired") timestamps.expiredAt = at;

    updated = { ...quote, status, timestamps };

    const opp = state.opportunities.find((o) => o.id === quote.opportunityId);
    let opportunities = state.opportunities;
    let timeline = state.timeline;

    if (opp) {
      const type: TimelineEventType =
        status === "sent"
          ? "quote_sent"
          : status === "viewed"
            ? "quote_viewed"
            : status === "accepted"
              ? "quote_accepted"
              : status === "rejected"
                ? "quote_rejected"
                : status === "expired"
                  ? "quote_expired"
                  : "quote_generated";
      timeline = appendTimeline(state.timeline, {
        opportunityId: opp.id,
        customerKey: customerKey(opp.customerEmail, opp.customerName),
        type,
        title: `Quote ${status}`,
        body: `${quote.label} (r${quote.revision})`,
        href: `/app/sales/workflow?opportunity=${opp.id}&quote=${quote.id}`,
      });

      if (status === "sent" || status === "viewed") {
        opportunities = opportunities.map((o) =>
          o.id === opp.id
            ? {
                ...o,
                stage: o.stage === "new_inquiry" || o.stage === "qualified" ? "quotation_sent" : o.stage,
                updatedAt: at,
              }
            : o,
        );
      }
      if (status === "accepted") {
        opportunities = opportunities.map((o) =>
          o.id === opp.id ? { ...o, stage: "approved", updatedAt: at } : o,
        );
        pushNotification({
          category: "quote_approved",
          title: "Quote accepted",
          body: `${quote.label} — ${quote.totalPkr.toLocaleString("en-PK")} PKR`,
          href: `/app/sales/workflow?opportunity=${opp.id}`,
        });
      }
      if (status === "rejected") {
        opportunities = opportunities.map((o) =>
          o.id === opp.id ? { ...o, stage: "negotiation", updatedAt: at } : o,
        );
        pushNotification({
          category: "quote_rejected",
          title: "Quote rejected",
          body: `${quote.label} was rejected.`,
          href: `/app/sales/workflow?opportunity=${opp.id}`,
        });
      }
    }

    return {
      ...state,
      quotes: state.quotes.map((q) => (q.id === quoteId ? updated! : q)),
      opportunities,
      timeline,
    };
  });
  return updated;
}

export function createOrderFromAcceptedQuote(quoteId: string): SalesOrder | null {
  const quote = getQuote(quoteId);
  if (!quote || quote.status !== "accepted") return null;
  const opp = getOpportunity(quote.opportunityId);
  if (!opp) return null;

  let created: SalesOrder | null = null;
  mutate((state) => {
    const at = nowIso();
    const salesperson = opp.assignments.find((a) => a.role === "salesperson");
    created = {
      id: uid(),
      opportunityId: opp.id,
      quoteId: quote.id,
      ...(quote.projectId ? { projectId: quote.projectId } : {}),
      customerName: opp.customerName,
      customerEmail: opp.customerEmail,
      ...(salesperson ? { salespersonLabel: salesperson.label } : {}),
      packageSnapshot: quote.lines,
      subtotalPkr: quote.totalPkr,
      taxPkr: 0,
      totalPkr: quote.totalPkr,
      status: "awaiting_approval",
      deliveryStatus: "not_scheduled",
      paymentStatus: "unpaid",
      createdAt: at,
      updatedAt: at,
    };

    const nextOpp: SalesOpportunity = {
      ...opp,
      orderIds: [created.id, ...opp.orderIds],
      stage: "approved",
      updatedAt: at,
    };

    const timeline = appendTimeline(state.timeline, {
      opportunityId: opp.id,
      customerKey: customerKey(opp.customerEmail, opp.customerName),
      type: "order_created",
      title: "Order created",
      body: `Order from ${quote.label} — ${created.totalPkr.toLocaleString("en-PK")} PKR`,
      href: `/app/sales/workflow?opportunity=${opp.id}&order=${created.id}`,
      meta: { orderId: created.id, quoteId: quote.id },
    });

    return {
      ...state,
      orders: [created, ...state.orders],
      opportunities: state.opportunities.map((o) => (o.id === opp.id ? nextOpp : o)),
      timeline,
    };
  });
  return created;
}

/**
 * Order status changes must not mutate planner / project package data.
 */
export function setOrderStatus(orderId: string, status: OrderStatus): SalesOrder | null {
  let updated: SalesOrder | null = null;
  mutate((state) => {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order || order.status === status) {
      updated = order ?? null;
      return state;
    }
    const at = nowIso();
    updated = { ...order, status, updatedAt: at };
    if (status === "delivered" || status === "completed") {
      updated = { ...updated, deliveryStatus: "delivered" };
    }
    if (status === "in_production") {
      updated = { ...updated, deliveryStatus: order.deliveryStatus };
    }

    const opp = state.opportunities.find((o) => o.id === order.opportunityId);
    let opportunities = state.opportunities;
    let stageMap: PipelineStage | null = null;
    if (status === "approved") stageMap = "approved";
    if (status === "in_production") stageMap = "production";
    if (status === "ready_for_delivery") stageMap = "ready_for_delivery";
    if (status === "delivered") stageMap = "delivered";
    if (status === "completed") stageMap = "closed";

    if (opp && stageMap) {
      opportunities = opportunities.map((o) =>
        o.id === opp.id ? { ...o, stage: stageMap!, updatedAt: at } : o,
      );
    }

    const timeline = opp
      ? appendTimeline(state.timeline, {
          opportunityId: opp.id,
          customerKey: customerKey(opp.customerEmail, opp.customerName),
          type:
            status === "in_production"
              ? "production_started"
              : status === "delivered" || status === "completed"
                ? "delivery_completed"
                : "order_status_changed",
          title: "Order status updated",
          body: `${order.status} → ${status}`,
          href: `/app/sales/workflow?opportunity=${opp.id}&order=${orderId}`,
          meta: { orderId, from: order.status, to: status },
        })
      : state.timeline;

    return {
      ...state,
      orders: state.orders.map((o) => (o.id === orderId ? updated! : o)),
      opportunities,
      timeline,
    };
  });
  return updated;
}

export function assignStaff(
  opportunityId: string,
  role: AssignmentRole,
  userId: string,
  label: string,
): SalesOpportunity | null {
  let updated: SalesOpportunity | null = null;
  mutate((state) => {
    const opp = state.opportunities.find((o) => o.id === opportunityId);
    if (!opp) return state;
    const at = nowIso();
    const assignment: StaffAssignment = { role, userId, label, assignedAt: at };
    const assignments = [...opp.assignments.filter((a) => a.role !== role), assignment];
    updated = { ...opp, assignments, updatedAt: at };
    const timeline = appendTimeline(state.timeline, {
      opportunityId,
      customerKey: customerKey(opp.customerEmail, opp.customerName),
      type: "assignment_changed",
      title: "Assignment updated",
      body: `${role.replace(/_/g, " ")} → ${label}`,
      href: `/app/sales/workflow?opportunity=${opportunityId}`,
    });
    return {
      ...state,
      opportunities: state.opportunities.map((o) => (o.id === opportunityId ? updated! : o)),
      timeline,
    };
  });
  return updated;
}

export function addInternalNote(
  opportunityId: string,
  text: string,
  authorId: string,
  authorLabel: string,
): InternalNote | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  let note: InternalNote | null = null;
  mutate((state) => {
    const opp = state.opportunities.find((o) => o.id === opportunityId);
    if (!opp) return state;
    const at = nowIso();
    note = {
      id: uid(),
      opportunityId,
      authorId,
      authorLabel,
      text: trimmed,
      createdAt: at,
      staffOnly: true,
    };
    // Timeline marks that a note was added but does not copy private text.
    const timeline = appendTimeline(state.timeline, {
      opportunityId,
      customerKey: customerKey(opp.customerEmail, opp.customerName),
      type: "note_added",
      title: "Internal note added",
      body: `Staff note by ${authorLabel}`,
      href: `/app/sales/workflow?opportunity=${opportunityId}`,
      meta: { staffOnly: true },
    });
    return {
      ...state,
      notes: [note, ...state.notes],
      timeline,
    };
  });
  return note;
}

export function recordDocument(input: {
  readonly opportunityId: string;
  readonly kind: DocumentKind;
  readonly label: string;
  readonly relatedQuoteId?: string;
  readonly relatedOrderId?: string;
}): SalesDocument | null {
  let doc: SalesDocument | null = null;
  mutate((state) => {
    const opp = state.opportunities.find((o) => o.id === input.opportunityId);
    if (!opp) return state;
    const at = nowIso();
    doc = {
      id: uid(),
      opportunityId: input.opportunityId,
      kind: input.kind,
      label: input.label,
      createdAt: at,
      ...(input.relatedQuoteId ? { relatedQuoteId: input.relatedQuoteId } : {}),
      ...(input.relatedOrderId ? { relatedOrderId: input.relatedOrderId } : {}),
    };
    const timeline = appendTimeline(state.timeline, {
      opportunityId: opp.id,
      customerKey: customerKey(opp.customerEmail, opp.customerName),
      type: "document_generated",
      title: "Document prepared",
      body: input.label,
      href: `/app/sales/workflow?opportunity=${opp.id}`,
      meta: { kind: input.kind },
    });
    return {
      ...state,
      documents: [doc, ...state.documents],
      timeline,
    };
  });
  return doc;
}

export function searchSales(filters: SalesSearchFilters): {
  readonly opportunities: SalesOpportunity[];
  readonly quotes: SalesQuote[];
  readonly orders: SalesOrder[];
} {
  const state = loadSalesWorkspace();
  const q = (filters.query ?? "").trim().toLowerCase();
  const sp = (filters.salesperson ?? "").trim().toLowerCase();
  const cust = (filters.customer ?? "").trim().toLowerCase();

  const inDate = (iso: string) => {
    if (filters.dateFrom && iso < filters.dateFrom) return false;
    if (filters.dateTo && iso > `${filters.dateTo}T23:59:59.999Z`) return false;
    return true;
  };

  let opportunities = state.opportunities.filter((o) => {
    if (filters.stage && o.stage !== filters.stage) return false;
    if (filters.projectId && o.projectId !== filters.projectId) return false;
    if (cust && !`${o.customerName} ${o.customerEmail}`.toLowerCase().includes(cust)) return false;
    if (sp && !o.assignments.some((a) => a.role === "salesperson" && a.label.toLowerCase().includes(sp))) {
      return false;
    }
    if (!inDate(o.createdAt)) return false;
    if (
      q &&
      !`${o.customerName} ${o.customerEmail} ${o.projectTitle ?? ""} ${o.id}`.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });

  let quotes = state.quotes.filter((quote) => {
    if (filters.quoteStatus && quote.status !== filters.quoteStatus) return false;
    if (filters.projectId && quote.projectId !== filters.projectId) return false;
    if (!inDate(quote.createdAt)) return false;
    if (q && !`${quote.label} ${quote.id}`.toLowerCase().includes(q)) {
      const opp = state.opportunities.find((o) => o.id === quote.opportunityId);
      if (!opp || !opportunities.some((o) => o.id === opp.id)) return false;
    }
    return opportunities.some((o) => o.id === quote.opportunityId) || (!filters.stage && !cust && !sp);
  });

  // Keep quotes aligned to filtered opportunities when customer/stage filters apply
  if (filters.stage || cust || sp || filters.projectId) {
    const ids = new Set(opportunities.map((o) => o.id));
    quotes = state.quotes.filter((quote) => {
      if (!ids.has(quote.opportunityId)) return false;
      if (filters.quoteStatus && quote.status !== filters.quoteStatus) return false;
      return true;
    });
  }

  let orders = state.orders.filter((order) => {
    if (filters.orderId && order.id !== filters.orderId) return false;
    if (filters.orderStatus && order.status !== filters.orderStatus) return false;
    if (filters.projectId && order.projectId !== filters.projectId) return false;
    if (cust && !`${order.customerName} ${order.customerEmail}`.toLowerCase().includes(cust)) return false;
    if (sp && !(order.salespersonLabel ?? "").toLowerCase().includes(sp)) return false;
    if (!inDate(order.createdAt)) return false;
    if (q && !`${order.id} ${order.customerName}`.toLowerCase().includes(q)) return false;
    if (filters.stage || filters.projectId) {
      return opportunities.some((o) => o.id === order.opportunityId);
    }
    return true;
  });

  if (filters.orderId) {
    const hit = state.orders.find((o) => o.id === filters.orderId);
    if (hit) {
      orders = [hit];
      opportunities = state.opportunities.filter((o) => o.id === hit.opportunityId);
    }
  }

  return { opportunities, quotes, orders };
}

export function computeOperationalMetrics(): OperationalMetrics {
  const state = loadSalesWorkspace();
  const openQuotations = state.quotes.filter((q) =>
    q.status === "draft" || q.status === "sent" || q.status === "viewed",
  ).length;
  const acceptedQuotations = state.quotes.filter((q) => q.status === "accepted").length;
  const decided = state.quotes.filter((q) => q.status === "accepted" || q.status === "rejected").length;
  const conversionRate = decided === 0 ? 0 : Math.round((acceptedQuotations / decided) * 1000) / 10;
  const ordersInProduction = state.orders.filter((o) => o.status === "in_production").length;
  const quoteValues = state.quotes.map((q) => q.totalPkr);
  const averageQuotationValue =
    quoteValues.length === 0
      ? 0
      : Math.round(quoteValues.reduce((s, n) => s + n, 0) / quoteValues.length);
  const pendingApprovals = state.orders.filter((o) => o.status === "awaiting_approval").length;
  const revenueAcceptedPkr = state.quotes
    .filter((q) => q.status === "accepted")
    .reduce((s, q) => s + q.totalPkr, 0);
  const upcomingDeliveries = state.orders.filter(
    (o) => o.status === "ready_for_delivery" || o.deliveryStatus === "scheduled",
  ).length;

  return {
    openQuotations,
    acceptedQuotations,
    conversionRate,
    ordersInProduction,
    averageQuotationValue,
    pendingApprovals,
    pipelineCount: state.opportunities.filter((o) => o.stage !== "closed").length,
    revenueAcceptedPkr,
    upcomingDeliveries,
  };
}

export function pipelineBoard(): Record<PipelineStage, SalesOpportunity[]> {
  const board = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, [] as SalesOpportunity[]])) as Record<
    PipelineStage,
    SalesOpportunity[]
  >;
  for (const opp of listOpportunities()) {
    board[opp.stage].push(opp);
  }
  return board;
}

export function findOpportunityForProject(projectId: string): SalesOpportunity | null {
  return (
    loadSalesWorkspace().opportunities.find((o) => o.projectId === projectId) ?? null
  );
}

export function findOpportunityForLead(leadDraftId: string): SalesOpportunity | null {
  return loadSalesWorkspace().opportunities.find((o) => o.leadDraftId === leadDraftId) ?? null;
}
