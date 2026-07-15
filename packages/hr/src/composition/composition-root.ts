/**
 * HR foundation composition root — dependency wiring only.
 * No payroll, attendance, leave, or scheduling runtime services.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createHumanResourcesValidators,
  type HumanResourcesValidators,
} from "../validation/validation.js";

export type HumanResourcesFoundation = {
  readonly clock: Clock;
  readonly validators: HumanResourcesValidators;
};

export type CreateHumanResourcesFoundationOptions = {
  readonly clock?: Clock;
};

export function createHumanResourcesFoundation(
  options: CreateHumanResourcesFoundationOptions = {},
): HumanResourcesFoundation {
  return {
    clock: options.clock ?? new SystemUtcClock(),
    validators: createHumanResourcesValidators(),
  };
}
