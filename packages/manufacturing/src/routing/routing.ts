/**
 * Routing — models only. No optimization.
 */

export type RoutingStatus = "draft" | "active" | "obsolete" | "archived";

export type RoutingVersion = {
  readonly id: string;
  readonly routingId: string;
  readonly companyId: string;
  readonly versionNumber: number;
  readonly createdAt: string;
  readonly notes: string | null;
};

export type Routing = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly status: RoutingStatus;
  readonly bomId: string | null;
  readonly currentVersionId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type RoutingReference = {
  readonly routingId: string;
  readonly companyId: string;
  readonly code: string | null;
};
