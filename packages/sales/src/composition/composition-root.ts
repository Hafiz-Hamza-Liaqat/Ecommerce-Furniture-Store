/**
 * Sales foundation composition root — dependency wiring only.
 * No HTTP, APIs, engines, or persistence implementations.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createSalesValidators,
  type SalesValidators,
} from "../validation/validation.js";

export type SalesFoundation = {
  readonly clock: Clock;
  readonly validators: SalesValidators;
};

export type CreateSalesFoundationOptions = {
  readonly clock?: Clock;
};

/**
 * Wires sales domain foundation contracts for later application services.
 */
export function createSalesFoundation(
  options: CreateSalesFoundationOptions = {},
): SalesFoundation {
  return {
    clock: options.clock ?? new SystemUtcClock(),
    validators: createSalesValidators(),
  };
}
