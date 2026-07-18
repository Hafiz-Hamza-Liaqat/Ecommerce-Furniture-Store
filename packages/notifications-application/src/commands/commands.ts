/**
 * Notifications application commands — no transport DTOs.
 */

export type UpsertNotificationPreferencePayload = {
  readonly companyId: string;
  readonly channel: string;
  readonly eventType?: string | null;
  readonly enabled: boolean;
};
