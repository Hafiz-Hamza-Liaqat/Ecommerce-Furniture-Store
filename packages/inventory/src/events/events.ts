/**
 * Inventory domain event contracts — no publishers, no Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type InventoryItemCreatedPayload = {
  readonly inventoryItemId: string;
  readonly companyId: string;
};

export type WarehouseCreatedPayload = {
  readonly warehouseId: string;
  readonly companyId: string;
};

export type StockReservedPayload = {
  readonly inventoryItemId: string;
  readonly companyId: string;
  readonly warehouseId: string;
  readonly quantity: number;
  readonly movementId: string | null;
  readonly correlationId: string | null;
};

export type StockReleasedPayload = {
  readonly inventoryItemId: string;
  readonly companyId: string;
  readonly warehouseId: string;
  readonly quantity: number;
  readonly movementId: string | null;
  readonly correlationId: string | null;
};

export type StockAdjustedPayload = {
  readonly inventoryItemId: string;
  readonly companyId: string;
  readonly warehouseId: string;
  readonly quantityDelta: number;
  readonly movementId: string | null;
  readonly correlationId: string | null;
};

export const InventoryEventTypes = {
  InventoryItemCreated: "inventory.item.created",
  WarehouseCreated: "inventory.warehouse.created",
  StockReserved: "inventory.stock.reserved",
  StockReleased: "inventory.stock.released",
  StockAdjusted: "inventory.stock.adjusted",
} as const;

export type InventoryEventType =
  (typeof InventoryEventTypes)[keyof typeof InventoryEventTypes];

export type InventoryDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: InventoryEventType | string;
  };
};

export type InventoryItemCreatedEvent =
  InventoryDomainEvent<InventoryItemCreatedPayload>;
export type WarehouseCreatedEvent =
  InventoryDomainEvent<WarehouseCreatedPayload>;
export type StockReservedEvent = InventoryDomainEvent<StockReservedPayload>;
export type StockReleasedEvent = InventoryDomainEvent<StockReleasedPayload>;
export type StockAdjustedEvent = InventoryDomainEvent<StockAdjustedPayload>;
