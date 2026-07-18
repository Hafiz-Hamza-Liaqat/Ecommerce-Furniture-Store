/**
 * Notifications application constants.
 */

export const NotificationsCommandTypes = {
  UpsertNotificationPreference: "notifications.UpsertNotificationPreference",
} as const;

export const NotificationsQueryTypes = {
  ListInAppNotifications: "notifications.ListInAppNotifications",
  GetNotification: "notifications.GetNotification",
  GetNotificationPreferences: "notifications.GetNotificationPreferences",
} as const;

export const NotificationsPolicyActions = {
  NotificationRead: "notifications.notifications.read",
  PreferenceRead: "notifications.preferences.read",
  PreferenceUpdate: "notifications.preferences.update",
} as const;

/** Known notification channels — unrecognized input falls back to "other". */
export const KNOWN_NOTIFICATION_CHANNELS = [
  "email",
  "sms",
  "whatsapp",
  "push",
  "in_app",
  "other",
] as const;

export const IN_APP_CHANNEL = "in_app" as const;
