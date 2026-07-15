/**
 * CRM account — commercial relationship view.
 * Organization ownership remains with Identity.
 */

export type AccountType =
  | "prospect"
  | "customer"
  | "partner"
  | "vendor_linked"
  | "other";

export type AccountRelationshipKind =
  | "parent"
  | "subsidiary"
  | "partner_of"
  | "billing_parent"
  | "other";

export type Account = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly name: string;
  readonly accountType: AccountType;
  /** Identity organization id — Identity remains owner */
  readonly identityOrganizationId: string | null;
  readonly primaryContactId: string | null;
  readonly ownerUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type AccountReference = {
  readonly accountId: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly name: string | null;
};

export type AccountRelationship = {
  readonly id: string;
  readonly companyId: string;
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly kind: AccountRelationshipKind;
};
