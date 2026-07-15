/**
 * Reporting event contracts — no publishers, no Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type ReportGeneratedPayload = {
  readonly reportDefinitionId: string;
  readonly executionId: string;
  readonly companyId: string | null;
  readonly snapshotId: string | null;
};

export const ReportingEventTypes = {
  ReportGenerated: "reporting.report.generated",
} as const;

export type ReportingEventType =
  (typeof ReportingEventTypes)[keyof typeof ReportingEventTypes];

export type ReportingDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: ReportingEventType | string;
  };
};

export type ReportGeneratedEvent =
  ReportingDomainEvent<ReportGeneratedPayload>;
