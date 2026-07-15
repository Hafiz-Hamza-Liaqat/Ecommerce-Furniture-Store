/**
 * Inventory foundation composition root — dependency wiring only.
 * No transport layer. No persistence implementations.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createInventoryValidators,
  type InventoryValidators,
} from "../validation/validation.js";

export type InventoryFoundation = {
  readonly clock: Clock;
  readonly validators: InventoryValidators;
};

export type CreateInventoryFoundationOptions = {
  readonly clock?: Clock;
};

/**
 * Wires inventory foundation contracts for later bounded contexts.
 * Repository implementations are supplied by persistence adapters in later phases.
 */
export function createInventoryFoundation(
  options: CreateInventoryFoundationOptions = {},
): InventoryFoundation {
  const clock = options.clock ?? new SystemUtcClock();
  const validators = createInventoryValidators();

  return {
    clock,
    validators,
  };
}
