/**
 * Manufacturing domain event contracts — no publishers, consumers, or Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type BomCreatedPayload = {
  readonly bomId: string;
  readonly companyId: string;
};

export type ProductionOrderCreatedPayload = {
  readonly productionOrderId: string;
  readonly companyId: string;
};

export type RoutingCreatedPayload = {
  readonly routingId: string;
  readonly companyId: string;
};

export type WorkCenterRegisteredPayload = {
  readonly workCenterId: string;
  readonly companyId: string;
};

export type OperationDefinedPayload = {
  readonly operationId: string;
  readonly companyId: string;
};

export const ManufacturingEventTypes = {
  BomCreated: "manufacturing.bom.created",
  ProductionOrderCreated: "manufacturing.production_order.created",
  RoutingCreated: "manufacturing.routing.created",
  WorkCenterRegistered: "manufacturing.work_center.registered",
  OperationDefined: "manufacturing.operation.defined",
} as const;

export type ManufacturingEventType =
  (typeof ManufacturingEventTypes)[keyof typeof ManufacturingEventTypes];

export type ManufacturingDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: ManufacturingEventType | string;
  };
};

export type BomCreatedEvent = ManufacturingDomainEvent<BomCreatedPayload>;
export type ProductionOrderCreatedEvent =
  ManufacturingDomainEvent<ProductionOrderCreatedPayload>;
export type RoutingCreatedEvent =
  ManufacturingDomainEvent<RoutingCreatedPayload>;
export type WorkCenterRegisteredEvent =
  ManufacturingDomainEvent<WorkCenterRegisteredPayload>;
export type OperationDefinedEvent =
  ManufacturingDomainEvent<OperationDefinedPayload>;
