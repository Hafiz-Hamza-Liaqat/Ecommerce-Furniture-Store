/**
 * CRM validation — structural only. No business rules.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type { Lead } from "../lead/lead.js";
import type { Contact } from "../contact/contact.js";
import type { Account } from "../account/account.js";
import type { Activity } from "../activity/activity.js";
import type { Campaign } from "../campaign/campaign.js";
import type { CommunicationRecord } from "../communication/communication.js";

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

export const leadStructureValidator: Validator<Lead> = {
  validate(input: Lead): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      validationOk()
    );
  },
};

export const contactStructureValidator: Validator<Contact> = {
  validate(input: Contact): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("displayName", input.displayName) ??
      validationOk()
    );
  },
};

export const accountStructureValidator: Validator<Account> = {
  validate(input: Account): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const activityStructureValidator: Validator<Activity> = {
  validate(input: Activity): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("subject", input.subject) ??
      validationOk()
    );
  },
};

export const campaignStructureValidator: Validator<Campaign> = {
  validate(input: Campaign): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const communicationStructureValidator: Validator<CommunicationRecord> = {
  validate(input: CommunicationRecord): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("occurredAt", input.occurredAt) ??
      validationOk()
    );
  },
};

export type CrmValidators = {
  readonly lead: Validator<Lead>;
  readonly contact: Validator<Contact>;
  readonly account: Validator<Account>;
  readonly activity: Validator<Activity>;
  readonly campaign: Validator<Campaign>;
  readonly communication: Validator<CommunicationRecord>;
};

export function createCrmValidators(): CrmValidators {
  return {
    lead: leadStructureValidator,
    contact: contactStructureValidator,
    account: accountStructureValidator,
    activity: activityStructureValidator,
    campaign: campaignStructureValidator,
    communication: communicationStructureValidator,
  };
}
