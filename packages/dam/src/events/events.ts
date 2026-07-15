/**
 * DAM domain event contracts — no publishers, no Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type AssetCreatedPayload = {
  readonly assetId: string;
  readonly companyId: string;
};

export type AssetVersionAddedPayload = {
  readonly assetId: string;
  readonly versionId: string;
  readonly companyId: string;
  readonly versionNumber: number;
};

export type AssetClassifiedPayload = {
  readonly assetId: string;
  readonly companyId: string;
  readonly classification: string;
};

export type DocumentAttachedPayload = {
  readonly attachmentId: string;
  readonly assetId: string;
  readonly companyId: string;
  readonly entityType: string;
  readonly entityId: string;
};

export type AssetArchivedPayload = {
  readonly assetId: string;
  readonly companyId: string;
};

export const DamEventTypes = {
  AssetCreated: "dam.asset.created",
  AssetVersionAdded: "dam.asset.version_added",
  AssetClassified: "dam.asset.classified",
  DocumentAttached: "dam.document.attached",
  AssetArchived: "dam.asset.archived",
} as const;

export type DamEventType = (typeof DamEventTypes)[keyof typeof DamEventTypes];

export type DamDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: DamEventType | string;
  };
};

export type AssetCreatedEvent = DamDomainEvent<AssetCreatedPayload>;
export type AssetVersionAddedEvent = DamDomainEvent<AssetVersionAddedPayload>;
export type AssetClassifiedEvent = DamDomainEvent<AssetClassifiedPayload>;
export type DocumentAttachedEvent = DamDomainEvent<DocumentAttachedPayload>;
export type AssetArchivedEvent = DamDomainEvent<AssetArchivedPayload>;
