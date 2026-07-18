export type { NotificationsHandlerDeps } from "./deps.js";
export {
  createGetNotificationHandler,
  createGetNotificationPreferencesHandler,
  createListInAppNotificationsHandler,
  createUpsertNotificationPreferenceHandler,
  type UpsertNotificationPreferenceResult,
} from "./notification-handlers.js";
