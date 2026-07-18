/**
 * Notifications application composition root.
 */

import { HandlerRegistry } from "@afh/application";
import type {
  NotificationPreferenceRepository,
  NotificationRepository,
} from "@afh/notifications";
import type { SecurityAuditService } from "@afh/identity";
import {
  createGetNotificationHandler,
  createGetNotificationPreferencesHandler,
  createListInAppNotificationsHandler,
  createUpsertNotificationPreferenceHandler,
} from "../handlers/notification-handlers.js";
import type { NotificationsHandlerDeps } from "../handlers/deps.js";

export type CreateNotificationsApplicationOptions = {
  readonly notifications: NotificationRepository;
  readonly preferences: NotificationPreferenceRepository;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type NotificationsApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: NotificationsHandlerDeps;
};

export function createNotificationsApplication(
  options: CreateNotificationsApplicationOptions,
): NotificationsApplication {
  const deps: NotificationsHandlerDeps = {
    notifications: options.notifications,
    preferences: options.preferences,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();
  handlers.registerCommand(createUpsertNotificationPreferenceHandler(deps));
  handlers.registerQuery(createGetNotificationHandler(deps));
  handlers.registerQuery(createListInAppNotificationsHandler(deps));
  handlers.registerQuery(createGetNotificationPreferencesHandler(deps));

  return { handlers, deps };
}
