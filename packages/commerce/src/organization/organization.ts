/**
 * Organization commerce models — reuses Phase 2A identity concepts by reference.
 * No onboarding workflow. No approval implementation.
 */

export type CommerceOrganizationKind =
  | "b2b_buyer"
  | "furniture_shop"
  | "wholesaler"
  | "contractor_firm"
  | "partner"
  | "other";

export type BusinessAccountStatus =
  | "draft"
  | "active"
  | "suspended"
  | "closed";

/**
 * Commerce-facing organization reference. Identity org id is the system of record
 * for membership; this model holds commercial classification metadata.
 */
export type CommerceOrganization = {
  readonly id: string;
  readonly companyId: string;
  /** Phase 2A organization id */
  readonly identityOrganizationId: string;
  readonly kind: CommerceOrganizationKind;
  readonly legalName: string;
  readonly tradeName: string | null;
  readonly status: BusinessAccountStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type BusinessAccount = {
  readonly id: string;
  readonly companyId: string;
  readonly commerceOrganizationId: string;
  readonly accountCode: string;
  readonly status: BusinessAccountStatus;
  readonly defaultCurrencyCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type OrganizationRelationshipType =
  | "parent"
  | "subsidiary"
  | "billing_parent"
  | "partner_of"
  | "other";

export type OrganizationRelationship = {
  readonly id: string;
  readonly companyId: string;
  readonly fromOrganizationId: string;
  readonly toOrganizationId: string;
  readonly type: OrganizationRelationshipType;
};
