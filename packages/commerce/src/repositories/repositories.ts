/**
 * Commerce repository interfaces only — no persistence implementations.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type { Customer } from "../customer/customer.js";
import type { Product, ProductVariant } from "../product/product.js";
import type {
  BusinessAccount,
  CommerceOrganization,
  OrganizationRelationship,
} from "../organization/organization.js";
import type { Catalog, CatalogEntry } from "../catalog/catalog.js";
import type { Address } from "../address/address.js";
import type { Contact } from "../contact/contact.js";

export type CompanyScopedId = {
  readonly companyId: string;
  readonly id: string;
};

export interface CustomerRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Customer | null, PlatformError>>;
  save(customer: Customer): Promise<Result<void, PlatformError>>;
  remove(key: CompanyScopedId): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Customer>, PlatformError>>;
}

export interface ProductRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Product | null, PlatformError>>;
  findVariantById(
    key: CompanyScopedId,
  ): Promise<Result<ProductVariant | null, PlatformError>>;
  save(product: Product): Promise<Result<void, PlatformError>>;
  saveVariant(variant: ProductVariant): Promise<Result<void, PlatformError>>;
  remove(key: CompanyScopedId): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Product>, PlatformError>>;
}

export interface OrganizationRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<CommerceOrganization | null, PlatformError>>;
  findBusinessAccountById(
    key: CompanyScopedId,
  ): Promise<Result<BusinessAccount | null, PlatformError>>;
  save(
    organization: CommerceOrganization,
  ): Promise<Result<void, PlatformError>>;
  saveBusinessAccount(
    account: BusinessAccount,
  ): Promise<Result<void, PlatformError>>;
  saveRelationship(
    relationship: OrganizationRelationship,
  ): Promise<Result<void, PlatformError>>;
  remove(key: CompanyScopedId): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<CommerceOrganization>, PlatformError>>;
}

export interface CatalogRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Catalog | null, PlatformError>>;
  save(catalog: Catalog): Promise<Result<void, PlatformError>>;
  saveEntry(entry: CatalogEntry): Promise<Result<void, PlatformError>>;
  remove(key: CompanyScopedId): Promise<Result<void, PlatformError>>;
  listEntries(
    catalogId: string,
    page?: PageRequest,
  ): Promise<Result<Page<CatalogEntry>, PlatformError>>;
}

export interface AddressRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Address | null, PlatformError>>;
  save(address: Address): Promise<Result<void, PlatformError>>;
  remove(key: CompanyScopedId): Promise<Result<void, PlatformError>>;
}

export interface ContactRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Contact | null, PlatformError>>;
  save(contact: Contact): Promise<Result<void, PlatformError>>;
  remove(key: CompanyScopedId): Promise<Result<void, PlatformError>>;
  listByOwner(
    companyId: string,
    ownerType: Contact["ownerType"],
    ownerId: string,
  ): Promise<Result<readonly Contact[], PlatformError>>;
}
