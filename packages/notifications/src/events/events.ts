/**
 * Notification event contracts — no publishers, consumers, or Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type NotificationQueuedPayload = {
  readonly notificationId: string;
  readonly companyId: string | null;
  readonly channel: string;
};

export type NotificationSentPayload = {
  readonly notificationId: string;
  readonly companyId: string | null;
  readonly channel: string;
  readonly attemptId: string | null;
};

export type NotificationFailedPayload = {
  readonly notificationId: string;
  readonly companyId: string | null;
  readonly channel: string;
  readonly attemptId: string | null;
  readonly errorCode: string | null;
};

export const NotificationEventTypes = {
  NotificationQueued: "notifications.notification.queued",
  NotificationSent: "notifications.notification.sent",
  NotificationFailed: "notifications.notification.failed",
} as const;

export type NotificationEventType =
  (typeof NotificationEventTypes)[keyof typeof NotificationEventTypes];

export type NotificationDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: NotificationEventType | string;
  };
};

export type NotificationQueuedEvent =
  NotificationDomainEvent<NotificationQueuedPayload>;
export type NotificationSentEvent =
  NotificationDomainEvent<NotificationSentPayload>;
export type NotificationFailedEvent =
  NotificationDomainEvent<NotificationFailedPayload>;
