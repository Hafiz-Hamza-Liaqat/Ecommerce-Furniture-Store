/**
 * Customer sales context — references only. No CRM behavior.
 */

export type SalesCustomerReference = {
  readonly customerId: string;
  readonly companyId: string;
  readonly displayName: string | null;
};

export type CustomerAccountReference = {
  readonly accountId: string;
  readonly companyId: string;
  readonly customerId: string | null;
  readonly organizationId: string | null;
};

export type SalesRepresentativeReference = {
  readonly userId: string;
  readonly companyId: string;
  readonly employeeId: string | null;
  readonly displayName: string | null;
};

export type TerritoryReference = {
  readonly territoryId: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly name: string | null;
};
