/**
 * DAM foundation composition root — dependency wiring only.
 * No HTTP. No APIs. No storage providers.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createDamValidators,
  type DamValidators,
} from "../validation/validation.js";

export type DamFoundation = {
  readonly clock: Clock;
  readonly validators: DamValidators;
};

export type CreateDamFoundationOptions = {
  readonly clock?: Clock;
};

/**
 * Wires DAM foundation contracts for later bounded contexts.
 * Storage adapters and repository implementations arrive in later phases.
 */
export function createDamFoundation(
  options: CreateDamFoundationOptions = {},
): DamFoundation {
  const clock = options.clock ?? new SystemUtcClock();
  const validators = createDamValidators();

  return {
    clock,
    validators,
  };
}
