/**
 * Notifications application queries — no transport DTOs.
 */

import type { Notification, NotificationPreference } from "@afh/notifications";
import type { ListQueryRequest } from "@afh/shared-kernel";

/** Recipient is always the calling principal (ctx.userId) — not payload-driven. */
export type ListInAppNotificationsPayload = ListQueryRequest;

export type GetNotificationPayload = {
  readonly companyId: string;
  readonly notificationId: string;
};

export type GetNotificationResult = {
  readonly notification: Notification;
};

export type GetNotificationPreferencesPayload = {
  readonly companyId: string;
};

export type GetNotificationPreferencesResult = {
  readonly preferences: readonly NotificationPreference[];
};
