/**
 * Search event contracts — no publishers, no Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type SearchIndexedPayload = {
  readonly indexCode: string;
  readonly documentId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly companyId: string | null;
};

export const SearchEventTypes = {
  SearchIndexed: "search.document.indexed",
} as const;

export type SearchEventType =
  (typeof SearchEventTypes)[keyof typeof SearchEventTypes];

export type SearchDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: SearchEventType | string;
  };
};

export type SearchIndexedEvent = SearchDomainEvent<SearchIndexedPayload>;
