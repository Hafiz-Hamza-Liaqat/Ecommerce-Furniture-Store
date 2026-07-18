/**
 * Notifications V1 — handler tests (Policy, recipient scope, company isolation).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  PolicyDecision,
  PolicyEngine,
  PolicyPrincipal,
  PolicyResource,
  SecurityAuditService,
} from "@afh/identity";
import type {
  Notification,
  NotificationPreference,
  NotificationPreferenceRepository,
  NotificationRepository,
} from "@afh/notifications";
import {
  CommandId,
  CorrelationId,
  QueryId,
  ok,
  type Clock,
  type Command,
  type Page,
  type PageRequest,
  type PlatformError,
  type Query,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";
import type { ApplicationContext } from "@afh/application";
import {
  createGetNotificationHandler,
  createGetNotificationPreferencesHandler,
  createListInAppNotificationsHandler,
  createUpsertNotificationPreferenceHandler,
  type UpsertNotificationPreferenceResult,
} from "./notification-handlers.js";
import type { NotificationsHandlerDeps } from "./deps.js";
import {
  NotificationsCommandTypes,
  NotificationsPolicyActions,
  NotificationsQueryTypes,
} from "../constants.js";

const clock: Clock = { now: () => new Date("2026-07-19T00:00:00.000Z") };

const passthroughUnitOfWork: UnitOfWork = {
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    return work(passthroughUnitOfWork);
  },
};

const stubAudit = {
  async record() {
    return;
  },
} as unknown as SecurityAuditService;

function pageSlice<T>(items: readonly T[], page?: PageRequest): Page<T> {
  const pageNum = page && "page" in page ? Math.max(1, page.page) : 1;
  const pageSize =
    page && "pageSize" in page ? Math.max(1, page.pageSize) : 100;
  const offset = (pageNum - 1) * pageSize;
  const slice = items.slice(offset, offset + pageSize);
  return {
    items: slice,
    totalCount: items.length,
    page: pageNum,
    pageSize,
    nextCursor: null,
    hasMore: offset + slice.length < items.length,
  };
}

function makeNotification(
  partial: Partial<Notification> &
    Pick<Notification, "id" | "companyId" | "recipient">,
): Notification {
  return {
    channel: "in_app",
    templateId: null,
    status: "delivered",
    subject: null,
    bodyPreview: null,
    correlationId: null,
    causationEventType: null,
    causationEventId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function createMemoryNotificationRepo(
  initial: Notification[] = [],
): NotificationRepository {
  const store = new Map(
    initial.map((n) => [`${n.companyId ?? "_"}:${n.id}`, n]),
  );
  return {
    async findById(key) {
      return ok(store.get(`${key.companyId ?? "_"}:${key.id}`) ?? null);
    },
    async save(notification) {
      store.set(`${notification.companyId ?? "_"}:${notification.id}`, notification);
      return ok(undefined);
    },
    async listByRecipient(companyId, userId, page) {
      const items = [...store.values()].filter(
        (n) => n.companyId === companyId && n.recipient.userId === userId,
      );
      return ok(pageSlice(items, page));
    },
  };
}

function createMemoryPreferenceRepo(
  initial: NotificationPreference[] = [],
): NotificationPreferenceRepository {
  const store = [...initial];
  return {
    async findByUser(companyId, userId) {
      return ok(store.filter((p) => p.companyId === companyId && p.userId === userId));
    },
    async save(preference) {
      const idx = store.findIndex((p) => p.id === preference.id);
      if (idx >= 0) {
        store[idx] = preference;
      } else {
        store.push(preference);
      }
      return ok(undefined);
    },
  };
}

function principal(userId: string, permission: string): PolicyPrincipal {
  return {
    userId,
    companyId: "co-1",
    roles: [
      {
        roleCode: "notifications",
        scopeType: "company",
        scopeId: "co-1",
        permissionCodes: [permission],
      },
    ],
    permissionCodes: [permission],
  };
}

function policyAllowCompany(): PolicyEngine {
  return {
    async evaluate(
      _p: PolicyPrincipal,
      _action: string,
      resource: PolicyResource,
    ): Promise<PolicyDecision> {
      if (resource.companyId === "co-1") {
        return { allowed: true };
      }
      return {
        allowed: false,
        reasonCode: "company_mismatch",
        message: "company",
      };
    },
  };
}

function policyDenyAll(): PolicyEngine {
  return {
    async evaluate(): Promise<PolicyDecision> {
      return {
        allowed: false,
        reasonCode: "denied",
        message: "denied",
      };
    },
  };
}

function makeCtx(
  userId: string,
  permission: string,
  policyEngine: PolicyEngine = policyAllowCompany(),
): ApplicationContext {
  return {
    correlationId: "corr-1",
    userId,
    companyId: "co-1",
    branchId: null,
    principal: principal(userId, permission),
    metadata: {},
    clock,
    signal: null,
    policyEngine,
    workflow: null,
    approval: null,
    rules: null,
    unitOfWork: passthroughUnitOfWork,
    outboxDispatcher: null,
  };
}

function commandOf<T>(commandType: string, payload: T): Command<T> {
  return {
    commandId: CommandId.from("00000000-0000-4000-8000-000000000001"),
    commandType,
    payload,
    metadata: {
      correlationId: CorrelationId.from("00000000-0000-4000-8000-000000000002"),
      causationId: null,
      companyId: (payload as { companyId?: string }).companyId ?? null,
      actorId: "user-1",
      issuedAt: new Date(),
    },
    idempotencyKey: null,
  };
}

function queryOf<T>(queryType: string, payload: T): Query<T> {
  return {
    queryId: QueryId.from("00000000-0000-4000-8000-000000000003"),
    queryType,
    payload,
    metadata: {
      correlationId: CorrelationId.from("00000000-0000-4000-8000-000000000004"),
      causationId: null,
      companyId: (payload as { companyId?: string }).companyId ?? null,
      actorId: "user-1",
      issuedAt: new Date(),
    },
  };
}

function notificationsDeps(
  notifications: NotificationRepository,
  preferences: NotificationPreferenceRepository,
): NotificationsHandlerDeps {
  return { notifications, preferences, audit: stubAudit };
}

describe("Notifications V1 handlers", () => {
  it("ListInAppNotifications returns only the caller's in_app notifications", async () => {
    const notifications = createMemoryNotificationRepo([
      makeNotification({
        id: "n1",
        companyId: "co-1",
        channel: "in_app",
        recipient: { id: "r1", userId: "user-1", address: null, displayName: null, channel: "in_app" },
      }),
      makeNotification({
        id: "n2",
        companyId: "co-1",
        channel: "email",
        recipient: { id: "r2", userId: "user-1", address: null, displayName: null, channel: "email" },
      }),
      makeNotification({
        id: "n3",
        companyId: "co-1",
        channel: "in_app",
        recipient: { id: "r3", userId: "user-2", address: null, displayName: null, channel: "in_app" },
      }),
    ]);
    const handler = createListInAppNotificationsHandler(
      notificationsDeps(notifications, createMemoryPreferenceRepo()),
    );

    const result = await handler.handle(
      queryOf(NotificationsQueryTypes.ListInAppNotifications, { companyId: "co-1" }),
      makeCtx("user-1", NotificationsPolicyActions.NotificationRead),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    const page = result.value as Page<Notification>;
    assert.equal(page.totalCount, 1);
    assert.equal(page.items[0]?.id, "n1");
  });

  it("GetNotification authorization fails closed when Policy denies read", async () => {
    const notification = makeNotification({
      id: "n1",
      companyId: "co-1",
      recipient: { id: "r1", userId: "user-1", address: null, displayName: null, channel: "in_app" },
    });
    const handler = createGetNotificationHandler(
      notificationsDeps(
        createMemoryNotificationRepo([notification]),
        createMemoryPreferenceRepo(),
      ),
    );

    const query = queryOf(NotificationsQueryTypes.GetNotification, {
      companyId: "co-1",
      notificationId: "n1",
    });

    const ctx = makeCtx(
      "user-2",
      NotificationsPolicyActions.NotificationRead,
      policyDenyAll(),
    );
    assert.ok(handler.authorize);
    const authSpec = await handler.authorize(query, ctx);
    const decision = await ctx.policyEngine.evaluate(
      ctx.principal!,
      authSpec.action,
      authSpec.resource,
    );
    assert.equal(decision.allowed, false);
  });

  it("UpsertNotificationPreference creates then updates the caller's preference", async () => {
    const preferences = createMemoryPreferenceRepo();
    const handler = createUpsertNotificationPreferenceHandler(
      notificationsDeps(createMemoryNotificationRepo(), preferences),
    );

    const created = await handler.handle(
      commandOf(NotificationsCommandTypes.UpsertNotificationPreference, {
        companyId: "co-1",
        channel: "in_app",
        enabled: true,
      }),
      makeCtx("user-1", NotificationsPolicyActions.PreferenceUpdate),
    );
    assert.ok(created.ok, created.ok ? "" : created.error.message);
    if (!created.ok) return;
    const { preferenceId } = created.value as UpsertNotificationPreferenceResult;

    const disabled = await handler.handle(
      commandOf(NotificationsCommandTypes.UpsertNotificationPreference, {
        companyId: "co-1",
        channel: "in_app",
        enabled: false,
      }),
      makeCtx("user-1", NotificationsPolicyActions.PreferenceUpdate),
    );
    assert.ok(disabled.ok);
    if (!disabled.ok) return;
    assert.equal(disabled.value.preferenceId, preferenceId);

    const found = await preferences.findByUser("co-1", "user-1");
    assert.ok(found.ok);
    assert.equal(found.value.length, 1);
    assert.equal(found.value[0]?.enabled, false);
  });

  it("GetNotificationPreferences returns only the caller's preferences", async () => {
    const now = "2026-01-01T00:00:00.000Z";
    const preferences = createMemoryPreferenceRepo([
      { id: "p1", companyId: "co-1", userId: "user-1", channel: "in_app", eventType: null, enabled: true, updatedAt: now },
      { id: "p2", companyId: "co-1", userId: "user-2", channel: "in_app", eventType: null, enabled: true, updatedAt: now },
    ]);
    const handler = createGetNotificationPreferencesHandler(
      notificationsDeps(createMemoryNotificationRepo(), preferences),
    );

    const result = await handler.handle(
      queryOf(NotificationsQueryTypes.GetNotificationPreferences, { companyId: "co-1" }),
      makeCtx("user-1", NotificationsPolicyActions.PreferenceRead),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    assert.equal(result.value.preferences.length, 1);
    assert.equal(result.value.preferences[0]?.id, "p1");
  });
});
