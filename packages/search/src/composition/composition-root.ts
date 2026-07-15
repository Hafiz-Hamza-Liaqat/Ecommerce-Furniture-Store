/**
 * Search foundation composition root — wiring only.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createSearchValidators,
  type SearchValidators,
} from "../validation/validation.js";

export type SearchFoundation = {
  readonly clock: Clock;
  readonly validators: SearchValidators;
};

export type CreateSearchFoundationOptions = {
  readonly clock?: Clock;
};

export function createSearchFoundation(
  options: CreateSearchFoundationOptions = {},
): SearchFoundation {
  return {
    clock: options.clock ?? new SystemUtcClock(),
    validators: createSearchValidators(),
  };
}
