/**
 * Financial foundation composition root — dependency wiring only.
 * No HTTP. No APIs. No persistence implementations.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createFinancialValidators,
  type FinancialValidators,
} from "../validation/validation.js";

export type FinancialFoundation = {
  readonly clock: Clock;
  readonly validators: FinancialValidators;
};

export type CreateFinancialFoundationOptions = {
  readonly clock?: Clock;
};

/**
 * Wires financial foundation contracts for later bounded contexts.
 * Repository implementations are supplied by persistence adapters in later phases.
 */
export function createFinancialFoundation(
  options: CreateFinancialFoundationOptions = {},
): FinancialFoundation {
  const clock = options.clock ?? new SystemUtcClock();
  const validators = createFinancialValidators();

  return {
    clock,
    validators,
  };
}
