/**
 * Procurement foundation composition root — dependency wiring only.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createProcurementValidators,
  type ProcurementValidators,
} from "../validation/validation.js";

export type ProcurementFoundation = {
  readonly clock: Clock;
  readonly validators: ProcurementValidators;
};

export type CreateProcurementFoundationOptions = {
  readonly clock?: Clock;
};

export function createProcurementFoundation(
  options: CreateProcurementFoundationOptions = {},
): ProcurementFoundation {
  return {
    clock: options.clock ?? new SystemUtcClock(),
    validators: createProcurementValidators(),
  };
}
