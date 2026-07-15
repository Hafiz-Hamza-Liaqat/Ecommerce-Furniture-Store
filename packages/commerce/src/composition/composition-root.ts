/**
 * Commerce foundation composition root — dependency wiring only.
 * No HTTP. No APIs. No persistence implementations.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createCommerceValidators,
  type CommerceValidators,
} from "../validation/validation.js";

export type CommerceFoundation = {
  readonly clock: Clock;
  readonly validators: CommerceValidators;
};

export type CreateCommerceFoundationOptions = {
  readonly clock?: Clock;
};

/**
 * Wires commerce foundation contracts for later bounded contexts.
 * Repository implementations are supplied by persistence adapters in later phases.
 */
export function createCommerceFoundation(
  options: CreateCommerceFoundationOptions = {},
): CommerceFoundation {
  const clock = options.clock ?? new SystemUtcClock();
  const validators = createCommerceValidators();

  return {
    clock,
    validators,
  };
}
