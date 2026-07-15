/**
 * Sales domain event contracts — no publishers, consumers, or Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type OpportunityCreatedPayload = {
  readonly opportunityId: string;
  readonly companyId: string;
};

export type QuoteCreatedPayload = {
  readonly quoteId: string;
  readonly companyId: string;
};

export type QuoteRevisedPayload = {
  readonly quoteId: string;
  readonly revisionId: string;
  readonly companyId: string;
  readonly revisionNumber: number;
};

export type OrderCreatedPayload = {
  readonly salesOrderId: string;
  readonly companyId: string;
  readonly quoteId: string | null;
};

export type OrderCancelledPayload = {
  readonly salesOrderId: string;
  readonly companyId: string;
  readonly reason: string | null;
};

export type OrderCompletedPayload = {
  readonly salesOrderId: string;
  readonly companyId: string;
};

export const SalesEventTypes = {
  OpportunityCreated: "sales.opportunity.created",
  QuoteCreated: "sales.quote.created",
  QuoteRevised: "sales.quote.revised",
  OrderCreated: "sales.order.created",
  OrderCancelled: "sales.order.cancelled",
  OrderCompleted: "sales.order.completed",
} as const;

export type SalesEventType =
  (typeof SalesEventTypes)[keyof typeof SalesEventTypes];

export type SalesDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: SalesEventType | string;
  };
};

export type OpportunityCreatedEvent =
  SalesDomainEvent<OpportunityCreatedPayload>;
export type QuoteCreatedEvent = SalesDomainEvent<QuoteCreatedPayload>;
export type QuoteRevisedEvent = SalesDomainEvent<QuoteRevisedPayload>;
export type OrderCreatedEvent = SalesDomainEvent<OrderCreatedPayload>;
export type OrderCancelledEvent = SalesDomainEvent<OrderCancelledPayload>;
export type OrderCompletedEvent = SalesDomainEvent<OrderCompletedPayload>;
