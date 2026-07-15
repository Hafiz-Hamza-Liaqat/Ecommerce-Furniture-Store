/**
 * Notification foundation — transport-independent contracts.
 * Domains emit events; handlers (later) consume via Event Bus + Settings templates.
 * No email/SMS/push providers or delivery workers.
 */

export type NotificationChannel =
  | "email"
  | "sms"
  | "whatsapp"
  | "push"
  | "in_app"
  | "other";

export type DeliveryStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "cancelled";

export type Recipient = {
  readonly id: string;
  readonly userId: string | null;
  readonly address: string | null;
  readonly displayName: string | null;
  readonly channel: NotificationChannel;
};

export type NotificationTemplate = {
  readonly id: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly channel: NotificationChannel;
  /** Opaque Settings template reference — not rendered here */
  readonly settingsTemplateRef: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type NotificationPreference = {
  readonly id: string;
  readonly companyId: string | null;
  readonly userId: string;
  readonly channel: NotificationChannel;
  readonly eventType: string | null;
  readonly enabled: boolean;
  readonly updatedAt: string;
};

export type Notification = {
  readonly id: string;
  readonly companyId: string | null;
  readonly channel: NotificationChannel;
  readonly templateId: string | null;
  readonly recipient: Recipient;
  readonly status: DeliveryStatus;
  readonly subject: string | null;
  readonly bodyPreview: string | null;
  readonly correlationId: string | null;
  readonly causationEventType: string | null;
  readonly causationEventId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DeliveryAttempt = {
  readonly id: string;
  readonly notificationId: string;
  readonly companyId: string | null;
  readonly attemptNumber: number;
  readonly status: DeliveryStatus;
  readonly providerRef: string | null;
  readonly errorCode: string | null;
  readonly attemptedAt: string;
};
