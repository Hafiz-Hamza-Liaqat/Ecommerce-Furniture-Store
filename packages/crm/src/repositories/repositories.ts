/**
 * CRM repository interfaces only — no persistence implementations.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type { Lead } from "../lead/lead.js";
import type { Contact, ContactMethod } from "../contact/contact.js";
import type { Account, AccountRelationship } from "../account/account.js";
import type { Activity } from "../activity/activity.js";
import type { Campaign } from "../campaign/campaign.js";
import type { CommunicationRecord } from "../communication/communication.js";

export type CompanyScopedId = {
  readonly companyId: string;
  readonly id: string;
};

export interface LeadRepository {
  findById(key: CompanyScopedId): Promise<Result<Lead | null, PlatformError>>;
  save(lead: Lead): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Lead>, PlatformError>>;
}

export interface ContactRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Contact | null, PlatformError>>;
  save(contact: Contact): Promise<Result<void, PlatformError>>;
  saveMethod(method: ContactMethod): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Contact>, PlatformError>>;
}

export interface AccountRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Account | null, PlatformError>>;
  save(account: Account): Promise<Result<void, PlatformError>>;
  saveRelationship(
    relationship: AccountRelationship,
  ): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Account>, PlatformError>>;
}

export interface ActivityRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Activity | null, PlatformError>>;
  save(activity: Activity): Promise<Result<void, PlatformError>>;
  listBySubject(
    companyId: string,
    subjectType: "lead" | "contact" | "account" | "opportunity",
    subjectId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Activity>, PlatformError>>;
}

export interface CampaignRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Campaign | null, PlatformError>>;
  save(campaign: Campaign): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Campaign>, PlatformError>>;
}

export interface CommunicationRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<CommunicationRecord | null, PlatformError>>;
  save(record: CommunicationRecord): Promise<Result<void, PlatformError>>;
}
