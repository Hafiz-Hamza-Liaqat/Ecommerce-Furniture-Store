/**
 * CMS foundation composition root — dependency wiring only.
 * No runtime publishing / rendering services.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createCmsValidators,
  type CmsValidators,
} from "../validation/validation.js";

export type CmsFoundation = {
  readonly clock: Clock;
  readonly validators: CmsValidators;
};

export type CreateCmsFoundationOptions = {
  readonly clock?: Clock;
};

export function createCmsFoundation(
  options: CreateCmsFoundationOptions = {},
): CmsFoundation {
  return {
    clock: options.clock ?? new SystemUtcClock(),
    validators: createCmsValidators(),
  };
}
