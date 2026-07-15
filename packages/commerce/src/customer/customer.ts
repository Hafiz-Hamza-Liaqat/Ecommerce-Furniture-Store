/**
 * Customer foundation — no CRM, marketing, or campaigns.
 */

export type CustomerStatus =
  | "prospect"
  | "active"
  | "inactive"
  | "blocked"
  | "archived";

export type CustomerType = "individual" | "household" | "business_contact";

export type CustomerClassification =
  | "standard"
  | "vip"
  | "wholesale_linked"
  | "internal"
  | "other";

export type CustomerProfile = {
  readonly displayName: string;
  readonly preferredLocale: string | null;
  readonly preferredCurrencyCode: string | null;
  readonly notes: string | null;
};

export type Customer = {
  readonly id: string;
  readonly companyId: string;
  /** Link to Phase 2A identity user when present */
  readonly userId: string | null;
  readonly status: CustomerStatus;
  readonly type: CustomerType;
  readonly classification: CustomerClassification;
  readonly profile: CustomerProfile;
  /** Primary contact reference ids (Contact foundation) */
  readonly primaryContactIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
};
