/**
 * Sales application constants — workflow, rules, policy action codes.
 * No business formulas.
 */

export const SalesCommandTypes = {
  CreateOpportunity: "sales.CreateOpportunity",
  UpdateOpportunity: "sales.UpdateOpportunity",
  CreateQuote: "sales.CreateQuote",
  ReviseQuote: "sales.ReviseQuote",
  CreateSalesOrder: "sales.CreateSalesOrder",
  CancelSalesOrder: "sales.CancelSalesOrder",
} as const;

export const SalesQueryTypes = {
  GetOpportunity: "sales.GetOpportunity",
  GetQuote: "sales.GetQuote",
  GetSalesOrder: "sales.GetSalesOrder",
  GetCustomerSalesSummary: "sales.GetCustomerSalesSummary",
} as const;

/** Workflow definition codes (host registers definitions) */
export const SalesWorkflowCodes = {
  Opportunity: "sales_opportunity_v1",
  Quote: "quote_v1",
  SalesOrder: "sales_order_fulfillment_v1",
} as const;

export const SalesSubjectTypes = {
  Opportunity: "sales.opportunity",
  Quote: "sales.quote",
  SalesOrder: "sales.order",
} as const;

/** Rules Engine rule-set codes (host registers rule sets) */
export const SalesRuleSetCodes = {
  Pricing: "sales.pricing",
  DiscountEligibility: "sales.discount_eligibility",
  Tax: "sales.tax",
  CreditCheck: "sales.credit_check",
} as const;

export const SalesPolicyActions = {
  OpportunityCreate: "opportunity.create",
  OpportunityUpdate: "opportunity.update",
  OpportunityRead: "opportunity.read",
  QuoteCreate: "quote.create",
  QuoteRevise: "quote.revise",
  QuoteRead: "quote.read",
  OrderCreate: "order.create",
  OrderCancel: "order.cancel",
  OrderRead: "order.read",
  CustomerSalesSummaryRead: "order.read",
} as const;

export const SalesApprovalTypes = {
  OrderCancel: "sales.order_cancel",
} as const;
