/**
 * Commerce domain event contracts — no publishers, no Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type CustomerCreatedPayload = {
  readonly customerId: string;
  readonly companyId: string;
};

export type ProductCreatedPayload = {
  readonly productId: string;
  readonly companyId: string;
};

export type ProductUpdatedPayload = {
  readonly productId: string;
  readonly companyId: string;
};

export type CatalogChangedPayload = {
  readonly catalogId: string;
  readonly companyId: string;
  readonly changeKind: "created" | "updated" | "entry_added" | "entry_removed";
};

export type CommerceOrganizationCreatedPayload = {
  readonly commerceOrganizationId: string;
  readonly companyId: string;
  readonly identityOrganizationId: string;
};

export const CommerceEventTypes = {
  CustomerCreated: "commerce.customer.created",
  ProductCreated: "commerce.product.created",
  ProductUpdated: "commerce.product.updated",
  CatalogChanged: "commerce.catalog.changed",
  CommerceOrganizationCreated: "commerce.organization.created",
} as const;

export type CommerceEventType =
  (typeof CommerceEventTypes)[keyof typeof CommerceEventTypes];

export type CommerceDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: CommerceEventType | string;
  };
};

export type CustomerCreatedEvent =
  CommerceDomainEvent<CustomerCreatedPayload>;
export type ProductCreatedEvent = CommerceDomainEvent<ProductCreatedPayload>;
export type ProductUpdatedEvent = CommerceDomainEvent<ProductUpdatedPayload>;
export type CatalogChangedEvent = CommerceDomainEvent<CatalogChangedPayload>;
export type CommerceOrganizationCreatedEvent =
  CommerceDomainEvent<CommerceOrganizationCreatedPayload>;
