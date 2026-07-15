/**
 * SQL adapters for Commerce domain repositories.
 */

import { ok, type Clock } from "@afh/shared-kernel";
import type {
  Address,
  AddressRepository,
  BusinessAccount,
  Catalog,
  CatalogEntry,
  CatalogRepository,
  CommerceOrganization,
  Contact,
  ContactRepository,
  Customer,
  CustomerRepository,
  OrganizationRelationship,
  OrganizationRepository,
  Product,
  ProductRepository,
  ProductVariant,
} from "@afh/commerce";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlDocumentRepository } from "../mapping/document-repository.js";

type CatalogEntryDoc = CatalogEntry & { readonly companyId: string };

export function createSqlCustomerRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): CustomerRepository {
  const docs = new SqlDocumentRepository<Customer>(
    client,
    "commerce.customer",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    remove: (key) => docs.remove(key),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlProductRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ProductRepository {
  const docs = new SqlDocumentRepository<Product>(
    client,
    "commerce.product",
    clock,
  );
  const variants = new SqlDocumentRepository<ProductVariant>(
    client,
    "commerce.product_variant",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    findVariantById: (key) => variants.findById(key),
    save: (e) => docs.save(e),
    saveVariant: (variant) => variants.save(variant, variant.productId),
    remove: (key) => docs.remove(key),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlOrganizationRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): OrganizationRepository {
  const docs = new SqlDocumentRepository<CommerceOrganization>(
    client,
    "commerce.organization",
    clock,
  );
  const accounts = new SqlDocumentRepository<BusinessAccount>(
    client,
    "commerce.business_account",
    clock,
  );
  const relationships = new SqlDocumentRepository<OrganizationRelationship>(
    client,
    "commerce.organization_relationship",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    findBusinessAccountById: (key) => accounts.findById(key),
    save: (e) => docs.save(e),
    saveBusinessAccount: (account) =>
      accounts.save(account, account.commerceOrganizationId),
    saveRelationship: (relationship) =>
      relationships.save(relationship, relationship.fromOrganizationId),
    remove: (key) => docs.remove(key),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlCatalogRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): CatalogRepository {
  const docs = new SqlDocumentRepository<Catalog>(
    client,
    "commerce.catalog",
    clock,
  );
  const entries = new SqlDocumentRepository<CatalogEntryDoc>(
    client,
    "commerce.catalog_entry",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveEntry: (entry) =>
      entries.save({ ...entry, companyId: entry.catalogId }, entry.catalogId),
    remove: (key) => docs.remove(key),
    listEntries: async (catalogId, page) => {
      const listed = await entries.listByParentScoped(
        catalogId,
        catalogId,
        page,
      );
      if (!listed.ok) return listed;
      return ok({
        ...listed.value,
        items: listed.value.items.map((entry) => {
          const { companyId, ...rest } = entry;
          void companyId;
          return rest;
        }),
      });
    },
  };
}

export function createSqlAddressRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): AddressRepository {
  const docs = new SqlDocumentRepository<Address>(
    client,
    "commerce.address",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    remove: (key) => docs.remove(key),
  };
}

export function createSqlCommerceContactRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ContactRepository {
  const docs = new SqlDocumentRepository<Contact>(
    client,
    "commerce.contact",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (contact) =>
      docs.save(contact, `${contact.ownerType}:${contact.ownerId}`),
    remove: (key) => docs.remove(key),
    listByOwner: (companyId, ownerType, ownerId) =>
      docs.listByParent(companyId, `${ownerType}:${ownerId}`),
  };
}
