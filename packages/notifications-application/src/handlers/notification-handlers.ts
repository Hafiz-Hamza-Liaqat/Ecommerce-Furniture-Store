import type { CommandHandler, FetchListCandidates, QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { Notification, NotificationChannel, NotificationPreference } from "@afh/notifications";
import type { Page } from "@afh/shared-kernel";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import {
  IN_APP_CHANNEL,
  KNOWN_NOTIFICATION_CHANNELS,
  NotificationsCommandTypes,
  NotificationsPolicyActions,
  NotificationsQueryTypes,
} from "../constants.js";
import type { UpsertNotificationPreferencePayload } from "../commands/commands.js";
import type {
  GetNotificationPayload,
  GetNotificationPreferencesPayload,
  GetNotificationPreferencesResult,
  GetNotificationResult,
  ListInAppNotificationsPayload,
} from "../queries/queries.js";
import {
  getNotificationPreferencesQueryValidator,
  getNotificationQueryValidator,
  listInAppNotificationsQueryValidator,
  upsertNotificationPreferenceCommandValidator,
} from "../validators/validators.js";
import type { NotificationsHandlerDeps } from "./deps.js";
import {
  companyResource,
  loadRecordForAuthorization,
  newEntityId,
  recordNotificationsAudit,
  requireCompanyId,
  requireUserId,
} from "../support/support.js";

export type UpsertNotificationPreferenceResult = {
  readonly preferenceId: string;
};

function mapChannel(value: string): NotificationChannel {
  return (KNOWN_NOTIFICATION_CHANNELS as readonly string[]).includes(value)
    ? (value as NotificationChannel)
    : "other";
}

export function createGetNotificationHandler(
  deps: NotificationsHandlerDeps,
): QueryHandler<GetNotificationPayload, GetNotificationResult> {
  return {
    queryType: NotificationsQueryTypes.GetNotification,
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.notifications.findById({ companyId: p.companyId, id: p.notificationId }),
      );
      return companyResource(
        "notification",
        NotificationsPolicyActions.NotificationRead,
        p.companyId,
        p.notificationId,
        { ownerUserId: record?.recipient.userId ?? null },
      );
    },
    validate() {
      return getNotificationQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const found = await deps.notifications.findById({
        companyId: scope.value,
        id: query.payload.notificationId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Notification not found", {
            code: "notification_not_found",
          }),
        );
      }

      return ok({ notification: found.value });
    },
  };
}

function createInAppNotificationListCandidateFetcher(
  listByRecipient: NotificationsHandlerDeps["notifications"]["listByRecipient"],
  userId: string,
): FetchListCandidates<Notification> {
  let prepared: Notification[] | null = null;

  return async ({ companyId, offset, limit }) => {
    if (prepared === null) {
      const all: Notification[] = [];
      let page = 1;
      for (;;) {
        const batch = await listByRecipient(companyId, userId, { page, pageSize: 100 });
        if (!batch.ok) {
          return batch;
        }
        all.push(...batch.value.items.filter((n) => n.channel === IN_APP_CHANNEL));
        if (!batch.value.hasMore) {
          break;
        }
        page += 1;
      }
      prepared = all;
    }

    return ok(prepared.slice(offset, offset + limit));
  };
}

export function createListInAppNotificationsHandler(
  deps: NotificationsHandlerDeps,
): QueryHandler<ListInAppNotificationsPayload, Page<Notification>> {
  return {
    queryType: NotificationsQueryTypes.ListInAppNotifications,
    authorize(query, ctx) {
      return companyResource(
        "notification",
        NotificationsPolicyActions.NotificationRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, NotificationsPolicyActions.NotificationRead),
      );
    },
    validate() {
      return listInAppNotificationsQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const actor = requireUserId(ctx);
      if (!actor.ok) return actor;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Notification>({
        ctx,
        action: NotificationsPolicyActions.NotificationRead,
        resourceType: "notification",
        request,
        toScope: (notification) => ({
          id: notification.id,
          companyId: notification.companyId ?? scope.value,
          ownerUserId: notification.recipient.userId ?? null,
        }),
        fetchCandidates: createInAppNotificationListCandidateFetcher(
          (companyId, userId, page) => deps.notifications.listByRecipient(companyId, userId, page),
          actor.value,
        ),
      });
    },
  };
}

export function createGetNotificationPreferencesHandler(
  deps: NotificationsHandlerDeps,
): QueryHandler<GetNotificationPreferencesPayload, GetNotificationPreferencesResult> {
  return {
    queryType: NotificationsQueryTypes.GetNotificationPreferences,
    authorize(query, ctx) {
      return companyResource(
        "notification_preference",
        NotificationsPolicyActions.PreferenceRead,
        query.payload.companyId,
        null,
        { ownerUserId: ctx.userId ?? null },
      );
    },
    validate() {
      return getNotificationPreferencesQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const actor = requireUserId(ctx);
      if (!actor.ok) return actor;

      const found = await deps.preferences.findByUser(scope.value, actor.value);
      if (!found.ok) return found;

      return ok({ preferences: found.value });
    },
  };
}

export function createUpsertNotificationPreferenceHandler(
  deps: NotificationsHandlerDeps,
): CommandHandler<
  UpsertNotificationPreferencePayload,
  UpsertNotificationPreferenceResult
> {
  return {
    commandType: NotificationsCommandTypes.UpsertNotificationPreference,
    authorize(command, ctx) {
      return companyResource(
        "notification_preference",
        NotificationsPolicyActions.PreferenceUpdate,
        command.payload.companyId,
        null,
        {
          ownerUserId: ctx.userId ?? null,
          attributes: { channel: command.payload.channel },
        },
      );
    },
    validate() {
      return upsertNotificationPreferenceCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;
      const actor = requireUserId(ctx);
      if (!actor.ok) return actor;

      const p = command.payload;
      const channel = mapChannel(p.channel);
      const eventType = p.eventType ?? null;

      const existing = await deps.preferences.findByUser(scope.value, actor.value);
      if (!existing.ok) return existing;

      const now = ctx.clock.now().toISOString();
      const match = existing.value.find(
        (pref) => pref.channel === channel && pref.eventType === eventType,
      );

      const preference: NotificationPreference = match
        ? { ...match, enabled: p.enabled, updatedAt: now }
        : {
            id: newEntityId(),
            companyId: scope.value,
            userId: actor.value,
            channel,
            eventType,
            enabled: p.enabled,
            updatedAt: now,
          };

      const saved = await deps.preferences.save(preference);
      if (!saved.ok) return saved;

      await recordNotificationsAudit(deps.audit, ctx, {
        action: NotificationsPolicyActions.PreferenceUpdate,
        entityType: "notification_preference",
        entityId: preference.id,
        outcome: "success",
        details: { channel, enabled: p.enabled },
      });

      return ok({ preferenceId: preference.id });
    },
  };
}
