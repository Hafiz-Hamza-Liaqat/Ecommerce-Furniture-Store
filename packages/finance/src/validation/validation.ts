/**
 * Financial validation contracts — structural checks only.
 * No accounting, posting, or payment rules.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type { Money } from "../money/money.js";
import type { FinancialAccount } from "../account/account.js";
import type {
  FinancialLedger,
  FinancialLedgerEntry,
} from "../ledger/ledger.js";
import type { Invoice, InvoiceLine } from "../invoice/invoice.js";
import type { Payment } from "../payment/payment.js";
import type {
  CreditAccount,
  CreditAdjustment,
  CreditLimit,
} from "../credit/credit.js";
import type { TaxProfile, TaxRegistration } from "../tax/tax.js";

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

export const moneyStructureValidator: Validator<Money> = {
  validate(input: Money): ValidationOutcome {
    return requireNonEmpty("currencyCode", input.currencyCode) ?? validationOk();
  },
};

export const accountStructureValidator: Validator<FinancialAccount> = {
  validate(input: FinancialAccount): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const ledgerStructureValidator: Validator<FinancialLedger> = {
  validate(input: FinancialLedger): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const ledgerEntryStructureValidator: Validator<FinancialLedgerEntry> = {
  validate(input: FinancialLedgerEntry): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("ledgerId", input.ledgerId) ??
      requireNonEmpty("accountId", input.accountId) ??
      requireNonEmpty("amount.currencyCode", input.amount.currencyCode) ??
      requireNonEmpty("occurredAt", input.occurredAt) ??
      requireNonEmpty("recordedAt", input.recordedAt) ??
      validationOk()
    );
  },
};

export const invoiceStructureValidator: Validator<Invoice> = {
  validate(input: Invoice): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("number", input.number) ??
      requireNonEmpty("currencyCode", input.currencyCode) ??
      validationOk()
    );
  },
};

export const invoiceLineStructureValidator: Validator<InvoiceLine> = {
  validate(input: InvoiceLine): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("invoiceId", input.invoiceId) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("description", input.description) ??
      validationOk()
    );
  },
};

export const paymentStructureValidator: Validator<Payment> = {
  validate(input: Payment): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("amount.currencyCode", input.amount.currencyCode) ??
      requireNonEmpty("recordedAt", input.recordedAt) ??
      validationOk()
    );
  },
};

export const creditAccountStructureValidator: Validator<CreditAccount> = {
  validate(input: CreditAccount): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("ownerId", input.ownerId) ??
      requireNonEmpty("currencyCode", input.currencyCode) ??
      validationOk()
    );
  },
};

export const creditLimitStructureValidator: Validator<CreditLimit> = {
  validate(input: CreditLimit): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("creditAccountId", input.creditAccountId) ??
      requireNonEmpty(
        "limitAmount.currencyCode",
        input.limitAmount.currencyCode,
      ) ??
      validationOk()
    );
  },
};

export const creditAdjustmentStructureValidator: Validator<CreditAdjustment> = {
  validate(input: CreditAdjustment): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("creditAccountId", input.creditAccountId) ??
      requireNonEmpty("amount.currencyCode", input.amount.currencyCode) ??
      requireNonEmpty("occurredAt", input.occurredAt) ??
      validationOk()
    );
  },
};

export const taxProfileStructureValidator: Validator<TaxProfile> = {
  validate(input: TaxProfile): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const taxRegistrationStructureValidator: Validator<TaxRegistration> = {
  validate(input: TaxRegistration): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("taxIdentifierId", input.taxIdentifierId) ??
      requireNonEmpty("countryCode", input.countryCode) ??
      validationOk()
    );
  },
};

export type FinancialValidators = {
  readonly money: Validator<Money>;
  readonly account: Validator<FinancialAccount>;
  readonly ledger: Validator<FinancialLedger>;
  readonly ledgerEntry: Validator<FinancialLedgerEntry>;
  readonly invoice: Validator<Invoice>;
  readonly invoiceLine: Validator<InvoiceLine>;
  readonly payment: Validator<Payment>;
  readonly creditAccount: Validator<CreditAccount>;
  readonly creditLimit: Validator<CreditLimit>;
  readonly creditAdjustment: Validator<CreditAdjustment>;
  readonly taxProfile: Validator<TaxProfile>;
  readonly taxRegistration: Validator<TaxRegistration>;
};

export function createFinancialValidators(): FinancialValidators {
  return {
    money: moneyStructureValidator,
    account: accountStructureValidator,
    ledger: ledgerStructureValidator,
    ledgerEntry: ledgerEntryStructureValidator,
    invoice: invoiceStructureValidator,
    invoiceLine: invoiceLineStructureValidator,
    payment: paymentStructureValidator,
    creditAccount: creditAccountStructureValidator,
    creditLimit: creditLimitStructureValidator,
    creditAdjustment: creditAdjustmentStructureValidator,
    taxProfile: taxProfileStructureValidator,
    taxRegistration: taxRegistrationStructureValidator,
  };
}
