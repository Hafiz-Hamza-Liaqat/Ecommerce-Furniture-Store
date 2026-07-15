/**
 * Operation & routing step — models only. No routing engine.
 */

export type Operation = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly defaultWorkCenterId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type OperationReference = {
  readonly operationId: string;
  readonly companyId: string;
  readonly code: string | null;
};

export type RoutingStep = {
  readonly id: string;
  readonly routingId: string;
  readonly versionId: string;
  readonly companyId: string;
  readonly stepNumber: number;
  readonly operationId: string;
  readonly workCenterId: string | null;
  readonly notes: string | null;
};
