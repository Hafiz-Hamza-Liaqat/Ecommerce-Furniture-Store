/**
 * Reporting foundation composition root — wiring only.
 * Reporting remains the presentation owner (Phase 0A).
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createReportingValidators,
  type ReportingValidators,
} from "../validation/validation.js";

export type ReportingFoundation = {
  readonly clock: Clock;
  readonly validators: ReportingValidators;
};

export type CreateReportingFoundationOptions = {
  readonly clock?: Clock;
};

export function createReportingFoundation(
  options: CreateReportingFoundationOptions = {},
): ReportingFoundation {
  return {
    clock: options.clock ?? new SystemUtcClock(),
    validators: createReportingValidators(),
  };
}
