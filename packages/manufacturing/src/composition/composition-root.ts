/**
 * Manufacturing foundation composition root — dependency wiring only.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createManufacturingValidators,
  type ManufacturingValidators,
} from "../validation/validation.js";

export type ManufacturingFoundation = {
  readonly clock: Clock;
  readonly validators: ManufacturingValidators;
};

export type CreateManufacturingFoundationOptions = {
  readonly clock?: Clock;
};

export function createManufacturingFoundation(
  options: CreateManufacturingFoundationOptions = {},
): ManufacturingFoundation {
  return {
    clock: options.clock ?? new SystemUtcClock(),
    validators: createManufacturingValidators(),
  };
}
