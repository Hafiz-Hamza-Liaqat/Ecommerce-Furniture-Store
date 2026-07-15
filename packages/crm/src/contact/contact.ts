/**
 * CRM contact — party record. Identity owns users; CRM references user IDs only.
 * Distinct from commerce Contact (channel values on an owner).
 */

export type ContactType =
  | "person"
  | "decision_maker"
  | "influencer"
  | "billing"
  | "other";

export type ContactMethodKind =
  | "email"
  | "phone"
  | "mobile"
  | "whatsapp"
  | "other";

export type ContactMethod = {
  readonly id: string;
  readonly contactId: string;
  readonly kind: ContactMethodKind;
  readonly value: string;
  readonly isPrimary: boolean;
};

export type Contact = {
  readonly id: string;
  readonly companyId: string;
  readonly displayName: string;
  readonly contactType: ContactType;
  readonly email: string | null;
  readonly phone: string | null;
  /** Identity user id when linked */
  readonly userId: string | null;
  readonly accountId: string | null;
  readonly leadId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ContactReference = {
  readonly contactId: string;
  readonly companyId: string;
  readonly displayName: string | null;
};
