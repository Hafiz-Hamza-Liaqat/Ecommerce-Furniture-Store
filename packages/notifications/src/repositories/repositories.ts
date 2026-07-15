/**
 * Notification repository interfaces only.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type {
  DeliveryAttempt,
  Notification,
  NotificationPreference,
  NotificationTemplate,
} from "../models/models.js";

export type CompanyScopedId = {
  readonly companyId: string | null;
  readonly id: string;
};

export interface NotificationRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Notification | null, PlatformError>>;
  save(notification: Notification): Promise<Result<void, PlatformError>>;
  listByRecipient(
    companyId: string | null,
    userId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Notification>, PlatformError>>;
}

export interface NotificationTemplateRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<NotificationTemplate | null, PlatformError>>;
  findByCode(
    companyId: string | null,
    code: string,
  ): Promise<Result<NotificationTemplate | null, PlatformError>>;
  save(template: NotificationTemplate): Promise<Result<void, PlatformError>>;
}

export interface NotificationPreferenceRepository {
  findByUser(
    companyId: string | null,
    userId: string,
  ): Promise<Result<readonly NotificationPreference[], PlatformError>>;
  save(
    preference: NotificationPreference,
  ): Promise<Result<void, PlatformError>>;
}

export interface DeliveryAttemptRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<DeliveryAttempt | null, PlatformError>>;
  save(attempt: DeliveryAttempt): Promise<Result<void, PlatformError>>;
  listByNotification(
    companyId: string | null,
    notificationId: string,
  ): Promise<Result<readonly DeliveryAttempt[], PlatformError>>;
}
