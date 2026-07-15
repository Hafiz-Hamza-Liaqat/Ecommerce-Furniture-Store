/**
 * SQL adapters for Notifications domain repositories.
 */

import {
  isOffsetPagination,
  ok,
  type Clock,
  type Page,
  type PageRequest,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type {
  DeliveryAttempt,
  DeliveryAttemptRepository,
  Notification,
  NotificationPreference,
  NotificationPreferenceRepository,
  NotificationRepository,
  NotificationTemplate,
  NotificationTemplateRepository,
} from "@afh/notifications";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlNullableCompanyDocumentRepository } from "../mapping/document-repository.js";

type AggRow = {
  id: string;
  company_id: string | null;
  aggregate_type: string;
  parent_id: string | null;
  version: number;
  payload_json: string;
  created_at: string;
  updated_at: string;
};

function pageBounds(page?: PageRequest): {
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
} {
  if (page && isOffsetPagination(page)) {
    const pageSize = Math.max(1, page.pageSize);
    const pageNum = Math.max(1, page.page);
    return {
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      page: pageNum,
      pageSize,
    };
  }
  return { limit: 100, offset: 0, page: 1, pageSize: 100 };
}

export function createSqlNotificationRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): NotificationRepository {
  const docs = new SqlNullableCompanyDocumentRepository<Notification>(
    client,
    "notifications.notification",
    clock,
  );
  const aggregateType = "notifications.notification";
  return {
    findById: (key) => docs.findById(key.companyId, key.id),
    save: (notification) => docs.save(notification),
    listByRecipient: async (
      companyId,
      userId,
      page,
    ): Promise<Result<Page<Notification>, PlatformError>> => {
      const bounds = pageBounds(page);
      const rows = client.all<AggRow>(
        `SELECT * FROM aggregate_documents
         WHERE aggregate_type = ? AND company_id IS ?
         ORDER BY updated_at DESC`,
        [aggregateType, companyId],
      );
      const all = rows
        .map((r) => JSON.parse(r.payload_json) as Notification)
        .filter((n) => n.recipient.userId === userId);
      const slice = all.slice(bounds.offset, bounds.offset + bounds.limit);
      return ok({
        items: slice,
        totalCount: all.length,
        page: bounds.page,
        pageSize: bounds.pageSize,
        nextCursor: null,
        hasMore: bounds.offset + slice.length < all.length,
      });
    },
  };
}

export function createSqlNotificationTemplateRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): NotificationTemplateRepository {
  const docs = new SqlNullableCompanyDocumentRepository<NotificationTemplate>(
    client,
    "notifications.template",
    clock,
  );
  return {
    findById: (key) => docs.findById(key.companyId, key.id),
    findByCode: async (companyId, code) => {
      const listed = await docs.listByCompany(companyId);
      if (!listed.ok) return listed;
      return ok(listed.value.items.find((t) => t.code === code) ?? null);
    },
    save: (template) => docs.save(template),
  };
}

export function createSqlNotificationPreferenceRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): NotificationPreferenceRepository {
  const docs =
    new SqlNullableCompanyDocumentRepository<NotificationPreference>(
      client,
      "notifications.preference",
      clock,
    );
  return {
    findByUser: async (companyId, userId) => {
      const listed = await docs.listByCompany(companyId);
      if (!listed.ok) return listed;
      return ok(listed.value.items.filter((p) => p.userId === userId));
    },
    save: (preference) => docs.save(preference),
  };
}

export function createSqlDeliveryAttemptRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): DeliveryAttemptRepository {
  const docs = new SqlNullableCompanyDocumentRepository<DeliveryAttempt>(
    client,
    "notifications.delivery_attempt",
    clock,
  );
  const aggregateType = "notifications.delivery_attempt";
  return {
    findById: (key) => docs.findById(key.companyId, key.id),
    save: async (attempt) => {
      const docId = `${aggregateType}:${attempt.companyId ?? "_"}:${attempt.id}`;
      const existing = client.get<AggRow>(
        "SELECT * FROM aggregate_documents WHERE id = ?",
        [docId],
      );
      const now = clock.now().toISOString();
      const payload = JSON.stringify(attempt);
      if (existing) {
        client.run(
          `UPDATE aggregate_documents
           SET payload_json = ?, parent_id = ?, updated_at = ?, version = version + 1
           WHERE id = ?`,
          [payload, attempt.notificationId, now, docId],
        );
      } else {
        client.run(
          `INSERT INTO aggregate_documents
            (id, company_id, aggregate_type, parent_id, version, payload_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
          [
            docId,
            attempt.companyId,
            aggregateType,
            attempt.notificationId,
            payload,
            now,
            now,
          ],
        );
      }
      return ok(undefined);
    },
    listByNotification: async (companyId, notificationId) => {
      const rows = client.all<AggRow>(
        `SELECT * FROM aggregate_documents
         WHERE aggregate_type = ? AND company_id IS ? AND parent_id = ?
         ORDER BY created_at ASC`,
        [aggregateType, companyId, notificationId],
      );
      return ok(rows.map((r) => JSON.parse(r.payload_json) as DeliveryAttempt));
    },
  };
}
