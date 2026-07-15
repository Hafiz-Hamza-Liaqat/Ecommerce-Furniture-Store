/**
 * Sales application commands — intent only. No transport DTOs.
 */

import type { OpportunitySource } from "@afh/sales";
import { SalesCommandTypes } from "../constants.js";

export type CreateOpportunityPayload = {
  readonly companyId: string;
  readonly title: string;
  readonly code?: string | null;
  readonly source?: OpportunitySource | null;
  readonly customerId?: string | null;
  readonly organizationId?: string | null;
  readonly salesRepUserId?: string | null;
  readonly territoryId?: string | null;
  readonly projectId?: string | null;
  readonly estimatedValueRef?: string | null;
  readonly currencyCode?: string | null;
};

export type UpdateOpportunityPayload = {
  readonly companyId: string;
  readonly opportunityId: string;
  readonly title?: string | null;
  readonly code?: string | null;
  readonly source?: OpportunitySource | null;
  readonly customerId?: string | null;
  readonly organizationId?: string | null;
  readonly salesRepUserId?: string | null;
  readonly territoryId?: string | null;
  readonly projectId?: string | null;
  readonly estimatedValueRef?: string | null;
  readonly currencyCode?: string | null;
  /** Lifecycle change — Workflow SSoT; never set status directly */
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
  readonly transitionComment?: string | null;
};

export type QuoteLineIntent = {
  readonly description: string;
  readonly quantity: number;
  readonly productId?: string | null;
  readonly variantId?: string | null;
  readonly inventoryItemId?: string | null;
  readonly unitCode?: string | null;
};

export type QuoteTermsIntent = {
  readonly paymentTerms?: string | null;
  readonly deliveryTerms?: string | null;
  readonly validityDays?: number | null;
  readonly notes?: string | null;
};

export type CreateQuotePayload = {
  readonly companyId: string;
  readonly number: string;
  readonly currencyCode: string;
  readonly customerId?: string | null;
  readonly organizationId?: string | null;
  readonly opportunityId?: string | null;
  readonly projectId?: string | null;
  readonly salesRepUserId?: string | null;
  readonly terms?: QuoteTermsIntent | null;
  readonly lines: readonly QuoteLineIntent[];
};

export type ReviseQuotePayload = {
  readonly companyId: string;
  readonly quoteId: string;
  readonly notes?: string | null;
  readonly terms?: QuoteTermsIntent | null;
  readonly lines: readonly QuoteLineIntent[];
  /** Current revision number; next revision is previous + 1 (default previous = 1) */
  readonly previousRevisionNumber?: number;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type SalesOrderLineIntent = {
  readonly description: string;
  readonly quantity: number;
  readonly productId?: string | null;
  readonly variantId?: string | null;
  readonly inventoryItemId?: string | null;
  readonly unitCode?: string | null;
};

export type CreateSalesOrderPayload = {
  readonly companyId: string;
  readonly number: string;
  readonly currencyCode: string;
  readonly customerId?: string | null;
  readonly organizationId?: string | null;
  readonly quoteId?: string | null;
  readonly opportunityId?: string | null;
  readonly projectId?: string | null;
  readonly salesRepUserId?: string | null;
  readonly billingAddressId?: string | null;
  readonly shippingAddressId?: string | null;
  readonly lines: readonly SalesOrderLineIntent[];
};

export type CancelSalesOrderPayload = {
  readonly companyId: string;
  readonly salesOrderId: string;
  readonly reason?: string | null;
  /** Required when executing cancel transition (not when only submitting approval) */
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
  /** When true and ApprovalEngine is wired, submit cancel approval and defer transition */
  readonly requireApproval?: boolean;
};

export { SalesCommandTypes };
