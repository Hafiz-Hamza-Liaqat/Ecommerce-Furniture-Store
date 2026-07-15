/**
 * Commerce validation contracts — structural checks only.
 * No business rules. No pricing rules.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type { Customer } from "../customer/customer.js";
import type { Product, ProductVariant } from "../product/product.js";
import type { CommerceOrganization } from "../organization/organization.js";
import type { Address } from "../address/address.js";
import type { Contact } from "../contact/contact.js";
import type { Catalog } from "../catalog/catalog.js";
import type { Money } from "../currency/currency.js";

function requireNonEmpty(
  field: string,
  value: string | null | undefined,
): ValidationOutcome | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const customerStructureValidator: Validator<Customer> = {
  validate(input: Customer): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("profile.displayName", input.profile.displayName) ??
      validationOk()
    );
  },
};

export const productStructureValidator: Validator<Product> = {
  validate(input: Product): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("slug", input.slug) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const productVariantStructureValidator: Validator<ProductVariant> = {
  validate(input: ProductVariant): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("productId", input.productId) ??
      requireNonEmpty("sku", input.sku) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const organizationStructureValidator: Validator<CommerceOrganization> = {
  validate(input: CommerceOrganization): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("identityOrganizationId", input.identityOrganizationId) ??
      requireNonEmpty("legalName", input.legalName) ??
      validationOk()
    );
  },
};

export const addressStructureValidator: Validator<Address> = {
  validate(input: Address): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("line1", input.line1) ??
      requireNonEmpty("city", input.city) ??
      requireNonEmpty("countryCode", input.countryCode) ??
      validationOk()
    );
  },
};

export const contactStructureValidator: Validator<Contact> = {
  validate(input: Contact): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("value", input.value) ??
      requireNonEmpty("ownerId", input.ownerId) ??
      validationOk()
    );
  },
};

export const catalogStructureValidator: Validator<Catalog> = {
  validate(input: Catalog): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const moneyStructureValidator: Validator<Money> = {
  validate(input: Money): ValidationOutcome {
    if (!input.currencyCode || input.currencyCode.trim().length === 0) {
      return validationFail([
        {
          field: "currencyCode",
          code: "required",
          message: "currencyCode is required",
        },
      ]);
    }
    return validationOk();
  },
};

export type CommerceValidators = {
  readonly customer: Validator<Customer>;
  readonly product: Validator<Product>;
  readonly productVariant: Validator<ProductVariant>;
  readonly organization: Validator<CommerceOrganization>;
  readonly address: Validator<Address>;
  readonly contact: Validator<Contact>;
  readonly catalog: Validator<Catalog>;
  readonly money: Validator<Money>;
};

export function createCommerceValidators(): CommerceValidators {
  return {
    customer: customerStructureValidator,
    product: productStructureValidator,
    productVariant: productVariantStructureValidator,
    organization: organizationStructureValidator,
    address: addressStructureValidator,
    contact: contactStructureValidator,
    catalog: catalogStructureValidator,
    money: moneyStructureValidator,
  };
}
