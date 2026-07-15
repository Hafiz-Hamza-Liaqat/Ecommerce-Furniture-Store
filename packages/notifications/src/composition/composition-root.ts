/**
 * Notification foundation composition root — wiring only.
 * Transport-independent; delivery providers arrive later as Event Bus consumers.
 */

import { SystemUtcClock, type Clock } from "@afh/shared-kernel";
import {
  createNotificationValidators,
  type NotificationValidators,
} from "../validation/validation.js";

export type NotificationFoundation = {
  readonly clock: Clock;
  readonly validators: NotificationValidators;
};

export type CreateNotificationFoundationOptions = {
  readonly clock?: Clock;
};

export function createNotificationFoundation(
  options: CreateNotificationFoundationOptions = {},
): NotificationFoundation {
  return {
    clock: options.clock ?? new SystemUtcClock(),
    validators: createNotificationValidators(),
  };
}
