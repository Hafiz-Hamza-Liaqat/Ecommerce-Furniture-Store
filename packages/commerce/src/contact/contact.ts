/**
 * Contact foundation — no notification delivery.
 */

export type ContactChannel = "email" | "phone" | "mobile" | "fax" | "other";

export type ContactKind =
  | "primary"
  | "alternate"
  | "emergency"
  | "business"
  | "billing"
  | "other";

export type Contact = {
  readonly id: string;
  readonly companyId: string;
  readonly kind: ContactKind;
  readonly channel: ContactChannel;
  readonly value: string;
  readonly label: string | null;
  readonly isPrimary: boolean;
  readonly ownerType: "customer" | "organization" | "user" | "other";
  readonly ownerId: string;
};
