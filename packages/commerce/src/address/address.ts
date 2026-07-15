/**
 * Canonical address model — no delivery routing.
 */

export type AddressKind =
  | "billing"
  | "shipping"
  | "site"
  | "warehouse"
  | "project_location"
  | "other";

export type Address = {
  readonly id: string;
  readonly companyId: string;
  readonly kind: AddressKind;
  readonly label: string | null;
  readonly line1: string;
  readonly line2: string | null;
  readonly city: string;
  readonly region: string | null;
  readonly postalCode: string | null;
  readonly countryCode: string;
  /** Optional warehouse / location reference (identity of place, not routing) */
  readonly warehouseLocationId: string | null;
  /** Optional project site reference */
  readonly projectId: string | null;
  readonly isDefault: boolean;
};
