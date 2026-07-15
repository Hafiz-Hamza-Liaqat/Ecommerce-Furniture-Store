/**
 * Project foundation composition root — dependency wiring only.
 * No HTTP. No APIs. No persistence implementations.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createProjectValidators,
  type ProjectValidators,
} from "../validation/validation.js";

export type ProjectFoundation = {
  readonly clock: Clock;
  readonly validators: ProjectValidators;
};

export type CreateProjectFoundationOptions = {
  readonly clock?: Clock;
};

/**
 * Wires project & resource foundation contracts for later bounded contexts.
 * Repository implementations are supplied by persistence adapters in later phases.
 */
export function createProjectFoundation(
  options: CreateProjectFoundationOptions = {},
): ProjectFoundation {
  const clock = options.clock ?? new SystemUtcClock();
  const validators = createProjectValidators();

  return {
    clock,
    validators,
  };
}
