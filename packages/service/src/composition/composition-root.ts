/**
 * Service foundation composition root — dependency wiring only.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createServiceValidators,
  type ServiceValidators,
} from "../validation/validation.js";

export type ServiceFoundation = {
  readonly clock: Clock;
  readonly validators: ServiceValidators;
};

export type CreateServiceFoundationOptions = {
  readonly clock?: Clock;
};

export function createServiceFoundation(
  options: CreateServiceFoundationOptions = {},
): ServiceFoundation {
  return {
    clock: options.clock ?? new SystemUtcClock(),
    validators: createServiceValidators(),
  };
}
