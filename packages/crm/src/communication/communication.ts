/**
 * Communication records — Notifications own delivery.
 * CRM stores references only.
 */

export type CommunicationChannelReference = {
  readonly channel: "email" | "sms" | "whatsapp" | "call" | "in_app" | "other";
  readonly label: string | null;
};

export type ConversationReference = {
  readonly conversationId: string;
  readonly companyId: string;
};

export type CommunicationRecord = {
  readonly id: string;
  readonly companyId: string;
  readonly channel: CommunicationChannelReference;
  readonly direction: "inbound" | "outbound" | "internal";
  readonly subject: string | null;
  readonly summary: string | null;
  readonly leadId: string | null;
  readonly contactId: string | null;
  readonly accountId: string | null;
  /** Notifications package owns delivery — opaque notification id */
  readonly notificationId: string | null;
  readonly conversation: ConversationReference | null;
  readonly occurredAt: string;
  readonly createdAt: string;
};
