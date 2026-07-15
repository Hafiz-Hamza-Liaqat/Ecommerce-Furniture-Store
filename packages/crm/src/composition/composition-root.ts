/**
 * CRM foundation composition root — dependency wiring only.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createCrmValidators,
  type CrmValidators,
} from "../validation/validation.js";

export type CrmFoundation = {
  readonly clock: Clock;
  readonly validators: CrmValidators;
};

export type CreateCrmFoundationOptions = {
  readonly clock?: Clock;
};

export function createCrmFoundation(
  options: CreateCrmFoundationOptions = {},
): CrmFoundation {
  return {
    clock: options.clock ?? new SystemUtcClock(),
    validators: createCrmValidators(),
  };
}
