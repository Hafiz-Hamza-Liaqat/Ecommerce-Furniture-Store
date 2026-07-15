/**
 * CMS domain event contracts — no publishers, no Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type ContentCreatedPayload = {
  readonly contentId: string;
  readonly companyId: string | null;
  readonly kind: string;
};

export type ContentUpdatedPayload = {
  readonly contentId: string;
  readonly companyId: string | null;
};

export type ContentPublishedPayload = {
  readonly contentId: string;
  readonly companyId: string | null;
  readonly revisionId: string | null;
};

export type ContentArchivedPayload = {
  readonly contentId: string;
  readonly companyId: string | null;
};

export type MenuUpdatedPayload = {
  readonly menuId: string;
  readonly companyId: string | null;
};

export const CmsEventTypes = {
  ContentCreated: "cms.content.created",
  ContentUpdated: "cms.content.updated",
  ContentPublished: "cms.content.published",
  ContentArchived: "cms.content.archived",
  MenuUpdated: "cms.menu.updated",
} as const;

export type CmsEventType = (typeof CmsEventTypes)[keyof typeof CmsEventTypes];

export type CmsDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: CmsEventType | string;
  };
};

export type ContentCreatedEvent = CmsDomainEvent<ContentCreatedPayload>;
export type ContentUpdatedEvent = CmsDomainEvent<ContentUpdatedPayload>;
export type ContentPublishedEvent = CmsDomainEvent<ContentPublishedPayload>;
export type ContentArchivedEvent = CmsDomainEvent<ContentArchivedPayload>;
export type MenuUpdatedEvent = CmsDomainEvent<MenuUpdatedPayload>;
