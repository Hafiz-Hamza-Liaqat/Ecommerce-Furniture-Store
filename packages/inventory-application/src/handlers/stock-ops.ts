/**
 * Stock mutation helpers — ledger is SSoT; StockPosition is a projection.
 * Does not implement reservation/allocation/costing policy (Rules).
 */

import type { ApplicationContext } from "@afh/application";
import type {
  InventoryLedgerEntry,
  InventoryMovement,
  InventoryMovementKind,
  StockPosition,
} from "@afh/inventory";
import type { PlatformError, Result } from "@afh/shared-kernel";
import { ok } from "@afh/shared-kernel";
import type { InventoryHandlerDeps } from "./deps.js";
import { newEntityId } from "../support/support.js";

export type PositionDelta = {
  readonly onHand?: number;
  readonly reserved?: number;
  readonly available?: number;
  readonly damaged?: number;
  readonly returned?: number;
  readonly inTransit?: number;
};

export async function loadOrCreatePosition(
  deps: InventoryHandlerDeps,
  input: {
    readonly companyId: string;
    readonly inventoryItemId: string;
    readonly warehouseId: string;
    readonly locationId: string | null;
    readonly unitCode: string | null;
    readonly batchId: string | null;
    readonly lotId: string | null;
    readonly now: string;
  },
): Promise<Result<StockPosition, PlatformError>> {
  const found = await deps.stock.findPosition(
    input.companyId,
    input.inventoryItemId,
    input.warehouseId,
    input.locationId,
  );
  if (!found.ok) return found;
  if (found.value) return ok(found.value);

  const created: StockPosition = {
    id: newEntityId(),
    companyId: input.companyId,
    inventoryItemId: input.inventoryItemId,
    warehouseId: input.warehouseId,
    locationId: input.locationId,
    unitCode: input.unitCode,
    onHand: 0,
    reserved: 0,
    available: 0,
    damaged: 0,
    returned: 0,
    inTransit: 0,
    batchId: input.batchId,
    lotId: input.lotId,
    updatedAt: input.now,
  };
  return ok(created);
}

export function applyProjection(
  position: StockPosition,
  delta: PositionDelta,
  now: string,
): StockPosition {
  return {
    ...position,
    onHand: position.onHand + (delta.onHand ?? 0),
    reserved: position.reserved + (delta.reserved ?? 0),
    available: position.available + (delta.available ?? 0),
    damaged: position.damaged + (delta.damaged ?? 0),
    returned: position.returned + (delta.returned ?? 0),
    inTransit: position.inTransit + (delta.inTransit ?? 0),
    updatedAt: now,
  };
}

export async function persistMovementAndLedger(
  deps: InventoryHandlerDeps,
  ctx: ApplicationContext,
  input: {
    readonly companyId: string;
    readonly kind: InventoryMovementKind;
    readonly inventoryItemId: string;
    readonly quantity: number;
    readonly unitCode: string | null;
    readonly fromWarehouseId: string | null;
    readonly toWarehouseId: string | null;
    readonly fromLocationId: string | null;
    readonly toLocationId: string | null;
    readonly batchId: string | null;
    readonly lotId: string | null;
    readonly serialNumberId: string | null;
    readonly subjectType: string | null;
    readonly subjectId: string | null;
    readonly warehouseIdForLedger: string;
    readonly locationIdForLedger: string | null;
    readonly quantityDelta: number;
    readonly bucket: string | null;
    readonly position: StockPosition;
    readonly projection: PositionDelta;
    readonly occurredAt: string;
  },
): Promise<Result<{ movementId: string; ledgerId: string }, PlatformError>> {
  const now = ctx.clock.now().toISOString();
  const movementId = newEntityId();
  const ledgerId = newEntityId();

  const movement: InventoryMovement = {
    id: movementId,
    companyId: input.companyId,
    kind: input.kind,
    status: "completed",
    inventoryItemId: input.inventoryItemId,
    quantity: input.quantity,
    unitCode: input.unitCode,
    fromWarehouseId: input.fromWarehouseId,
    toWarehouseId: input.toWarehouseId,
    fromLocationId: input.fromLocationId,
    toLocationId: input.toLocationId,
    batchId: input.batchId,
    lotId: input.lotId,
    serialNumberId: input.serialNumberId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    correlationId: ctx.correlationId,
    occurredAt: input.occurredAt,
    createdAt: now,
  };

  const savedMovement = await deps.movements.save(movement);
  if (!savedMovement.ok) return savedMovement;

  const entry: InventoryLedgerEntry = {
    id: ledgerId,
    companyId: input.companyId,
    inventoryItemId: input.inventoryItemId,
    warehouseId: input.warehouseIdForLedger,
    locationId: input.locationIdForLedger,
    movementId,
    movementKind: input.kind,
    quantityDelta: input.quantityDelta,
    unitCode: input.unitCode,
    bucket: input.bucket,
    batchId: input.batchId,
    lotId: input.lotId,
    serialNumberId: input.serialNumberId,
    occurredAt: input.occurredAt,
    recordedAt: now,
    correlationId: ctx.correlationId,
    causationId: null,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
  };

  const appended = await deps.ledger.append(entry);
  if (!appended.ok) return appended;

  const projected = applyProjection(input.position, input.projection, now);
  const savedPosition = await deps.stock.save(projected);
  if (!savedPosition.ok) return savedPosition;

  return ok({ movementId, ledgerId });
}
