/**
 * RC10.4 — CX Sales workflow public API.
 */

export * from "./types";
export {
  loadSalesWorkspace,
  saveSalesWorkspace,
  clearSalesWorkspace,
} from "./store";
export {
  listOpportunities,
  getOpportunity,
  listQuotes,
  getQuote,
  listOrders,
  getOrder,
  listTimeline,
  listCustomerTimeline,
  listInternalNotes,
  listDocuments,
  createInquiry,
  advanceStage,
  createQuoteRevision,
  setQuoteStatus,
  createOrderFromAcceptedQuote,
  setOrderStatus,
  assignStaff,
  addInternalNote,
  recordDocument,
  searchSales,
  computeOperationalMetrics,
  pipelineBoard,
  findOpportunityForProject,
  findOpportunityForLead,
} from "./service";
export { bridgeLeadToSales, bridgeProjectQuoteToSales } from "./bridge";
export {
  openQuotationPdf,
  openOrderPdf,
  openInvoicePlaceholder,
  openDeliveryNotePlaceholder,
} from "./documents";
