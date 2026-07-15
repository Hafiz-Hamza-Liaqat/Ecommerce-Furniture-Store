export type { SalesHandlerDeps } from "./deps.js";
export {
  createCreateOpportunityHandler,
  createUpdateOpportunityHandler,
} from "./opportunity-handlers.js";
export {
  createCreateQuoteHandler,
  createReviseQuoteHandler,
} from "./quote-handlers.js";
export {
  createCreateSalesOrderHandler,
  createCancelSalesOrderHandler,
} from "./order-handlers.js";
export {
  createGetOpportunityHandler,
  createGetQuoteHandler,
  createGetSalesOrderHandler,
  createGetCustomerSalesSummaryHandler,
} from "./query-handlers.js";
