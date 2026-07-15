/**
 * Supplier context — references only.
 * Identity / Organization own supplier identities; no onboarding workflow here.
 */

export type SupplierReference = {
  readonly supplierId: string;
  readonly companyId: string;
  /** Phase 2A identity organization id when linked */
  readonly identityOrganizationId: string | null;
  readonly code: string | null;
  readonly displayName: string | null;
};

export type SupplierAccountReference = {
  readonly accountId: string;
  readonly companyId: string;
  readonly supplierId: string;
  readonly accountCode: string | null;
};

export type SupplierContactReference = {
  readonly contactId: string;
  readonly companyId: string;
  readonly supplierId: string;
  readonly label: string | null;
};

export type SupplierCategoryReference = {
  readonly categoryId: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly name: string | null;
};

/**
 * Lightweight supplier registry record for procurement context.
 * Not an identity principal and not an onboarding process.
 */
export type Supplier = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly identityOrganizationId: string | null;
  readonly categoryId: string | null;
  readonly status: "draft" | "active" | "inactive" | "blocked";
  readonly createdAt: string;
  readonly updatedAt: string;
};
