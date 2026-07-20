/**
 * RC10.4 — Orders, CRM & Sales Workflow (local CX layer until RC10.5 sync).
 * Parallel to ERP Sales/CRM domains; bridges planner projects without mutating
 * the furnishing project persistence model.
 */

export const PIPELINE_STAGES = [
  "new_inquiry",
  "qualified",
  "quotation_sent",
  "negotiation",
  "approved",
  "production",
  "ready_for_delivery",
  "delivered",
  "closed",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new_inquiry: "New Inquiry",
  qualified: "Qualified",
  quotation_sent: "Quotation Sent",
  negotiation: "Negotiation",
  approved: "Approved",
  production: "Production",
  ready_for_delivery: "Ready for Delivery",
  delivered: "Delivered",
  closed: "Closed",
};

export const QUOTE_WORKFLOW_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
] as const;

export type QuoteWorkflowStatus = (typeof QUOTE_WORKFLOW_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteWorkflowStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

export const ORDER_STATUSES = [
  "draft",
  "awaiting_approval",
  "approved",
  "in_production",
  "ready_for_delivery",
  "delivered",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  in_production: "In Production",
  ready_for_delivery: "Ready for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ASSIGNMENT_ROLES = [
  "salesperson",
  "designer",
  "architect",
  "project_manager",
] as const;

export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];

export type StaffAssignment = {
  readonly role: AssignmentRole;
  readonly userId: string;
  readonly label: string;
  readonly assignedAt: string;
};

export type PackageLineSnapshot = {
  readonly productId: string;
  readonly name: string;
  readonly qty: number;
  readonly unitPkr: number;
  readonly variantIds?: readonly string[];
  readonly variantLabels?: readonly string[];
};

export type SalesOpportunity = {
  readonly id: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly customerPhone?: string;
  readonly projectId?: string;
  readonly projectTitle?: string;
  readonly leadDraftId?: string;
  readonly stage: PipelineStage;
  readonly budgetPkr?: number;
  readonly packageTotalPkr?: number;
  readonly quoteIds: readonly string[];
  readonly orderIds: readonly string[];
  readonly assignments: readonly StaffAssignment[];
  readonly source: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type QuoteTimestamps = {
  readonly draftAt: string;
  readonly sentAt?: string;
  readonly viewedAt?: string;
  readonly acceptedAt?: string;
  readonly rejectedAt?: string;
  readonly expiredAt?: string;
};

/** Immutable quote revision — never overwrite prior revisions. */
export type SalesQuote = {
  readonly id: string;
  readonly opportunityId: string;
  readonly projectId?: string;
  readonly projectQuoteId?: string;
  readonly revision: number;
  /** Prior revision id when this row is a revision (never mutates the parent). */
  readonly revisesQuoteId?: string;
  readonly label: string;
  readonly status: QuoteWorkflowStatus;
  readonly lines: readonly PackageLineSnapshot[];
  readonly totalPkr: number;
  readonly timestamps: QuoteTimestamps;
  readonly createdAt: string;
};

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
export type DeliveryStatus =
  | "not_scheduled"
  | "scheduled"
  | "in_transit"
  | "delivered"
  | "failed";

export type SalesOrder = {
  readonly id: string;
  readonly opportunityId: string;
  readonly quoteId: string;
  readonly projectId?: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly salespersonLabel?: string;
  readonly packageSnapshot: readonly PackageLineSnapshot[];
  readonly subtotalPkr: number;
  /** Future-ready tax slot (always 0 in RC10.4). */
  readonly taxPkr: number;
  readonly totalPkr: number;
  readonly status: OrderStatus;
  readonly deliveryStatus: DeliveryStatus;
  readonly paymentStatus: PaymentStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type TimelineEventType =
  | "inquiry_created"
  | "project_linked"
  | "planner_configured"
  | "quote_generated"
  | "quote_revised"
  | "quote_sent"
  | "quote_viewed"
  | "quote_accepted"
  | "quote_rejected"
  | "quote_expired"
  | "stage_changed"
  | "order_created"
  | "order_status_changed"
  | "assignment_changed"
  | "note_added"
  | "customer_message"
  | "production_started"
  | "delivery_completed"
  | "document_generated";

export type TimelineEvent = {
  readonly id: string;
  readonly opportunityId: string;
  readonly customerKey: string;
  readonly at: string;
  readonly type: TimelineEventType;
  readonly title: string;
  readonly body: string;
  readonly href?: string;
  readonly meta?: Record<string, unknown>;
};

/** Staff-only — must never appear in customer-facing views. */
export type InternalNote = {
  readonly id: string;
  readonly opportunityId: string;
  readonly authorId: string;
  readonly authorLabel: string;
  readonly text: string;
  readonly createdAt: string;
  readonly staffOnly: true;
};

export type DocumentKind = "quotation_pdf" | "order_pdf" | "invoice_placeholder" | "delivery_note_placeholder";

export type SalesDocument = {
  readonly id: string;
  readonly opportunityId: string;
  readonly kind: DocumentKind;
  readonly label: string;
  readonly createdAt: string;
  readonly hrefHint?: string;
  readonly relatedQuoteId?: string;
  readonly relatedOrderId?: string;
};

export type SalesWorkspaceState = {
  readonly version: 1;
  readonly opportunities: readonly SalesOpportunity[];
  readonly quotes: readonly SalesQuote[];
  readonly orders: readonly SalesOrder[];
  readonly timeline: readonly TimelineEvent[];
  readonly notes: readonly InternalNote[];
  readonly documents: readonly SalesDocument[];
};

export type SalesSearchFilters = {
  readonly customer?: string;
  readonly projectId?: string;
  readonly orderId?: string;
  readonly quoteStatus?: QuoteWorkflowStatus | "";
  readonly salesperson?: string;
  readonly stage?: PipelineStage | "";
  readonly orderStatus?: OrderStatus | "";
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly query?: string;
};

export type OperationalMetrics = {
  readonly openQuotations: number;
  readonly acceptedQuotations: number;
  readonly conversionRate: number;
  readonly ordersInProduction: number;
  readonly averageQuotationValue: number;
  readonly pendingApprovals: number;
  readonly pipelineCount: number;
  readonly revenueAcceptedPkr: number;
  readonly upcomingDeliveries: number;
};
