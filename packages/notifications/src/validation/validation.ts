/**
 * Notification validation — structural only.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type {
  DeliveryAttempt,
  Notification,
  NotificationPreference,
  NotificationTemplate,
} from "../models/models.js";

function requireNonEmpty(
  field: string,
  value: string | null | undefined,
): ValidationOutcome | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const notificationStructureValidator: Validator<Notification> = {
  validate(input: Notification): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("recipient.id", input.recipient.id) ??
      validationOk()
    );
  },
};

export const notificationTemplateStructureValidator: Validator<NotificationTemplate> =
  {
    validate(input: NotificationTemplate): ValidationOutcome {
      return (
        requireNonEmpty("id", input.id) ??
        requireNonEmpty("code", input.code) ??
        requireNonEmpty("name", input.name) ??
        validationOk()
      );
    },
  };

export const notificationPreferenceStructureValidator: Validator<NotificationPreference> =
  {
    validate(input: NotificationPreference): ValidationOutcome {
      return (
        requireNonEmpty("id", input.id) ??
        requireNonEmpty("userId", input.userId) ??
        validationOk()
      );
    },
  };

export const deliveryAttemptStructureValidator: Validator<DeliveryAttempt> = {
  validate(input: DeliveryAttempt): ValidationOutcome {
    if (input.attemptNumber < 1) {
      return validationFail([
        {
          field: "attemptNumber",
          code: "invalid",
          message: "attemptNumber must be >= 1",
        },
      ]);
    }
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("notificationId", input.notificationId) ??
      validationOk()
    );
  },
};

export type NotificationValidators = {
  readonly notification: Validator<Notification>;
  readonly template: Validator<NotificationTemplate>;
  readonly preference: Validator<NotificationPreference>;
  readonly deliveryAttempt: Validator<DeliveryAttempt>;
};

export function createNotificationValidators(): NotificationValidators {
  return {
    notification: notificationStructureValidator,
    template: notificationTemplateStructureValidator,
    preference: notificationPreferenceStructureValidator,
    deliveryAttempt: deliveryAttemptStructureValidator,
  };
}
