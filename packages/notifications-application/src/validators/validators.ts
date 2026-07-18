/**
 * Notifications application validators — structural intent only.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import { validationFail, validationOk } from "@afh/shared-kernel";
import type { UpsertNotificationPreferencePayload } from "../commands/commands.js";
import type {
  GetNotificationPayload,
  GetNotificationPreferencesPayload,
  ListInAppNotificationsPayload,
} from "../queries/queries.js";

function requireField(
  field: string,
  value: string | null | undefined,
): ReturnType<typeof validationFail> | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const upsertNotificationPreferenceCommandValidator: Validator<
  Command<UpsertNotificationPreferencePayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("channel", p.channel) ??
      validationOk()
    );
  },
};

export const getNotificationQueryValidator: Validator<
  Query<GetNotificationPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("notificationId", p.notificationId) ??
      validationOk()
    );
  },
};

export const getNotificationPreferencesQueryValidator: Validator<
  Query<GetNotificationPreferencesPayload>
> = {
  validate(query) {
    return requireField("companyId", query.payload.companyId) ?? validationOk();
  },
};

export const listInAppNotificationsQueryValidator: Validator<
  Query<ListInAppNotificationsPayload>
> = {
  validate(query) {
    return requireField("companyId", query.payload.companyId) ?? validationOk();
  },
};
