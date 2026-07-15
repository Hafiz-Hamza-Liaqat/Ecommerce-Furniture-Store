/**
 * Quality references — no quality execution engine.
 */

export type InspectionReference = {
  readonly inspectionId: string;
  readonly companyId: string;
  readonly productionOrderId: string | null;
  readonly operationId: string | null;
  readonly code: string | null;
};

export type QualityCheckReference = {
  readonly qualityCheckId: string;
  readonly companyId: string;
  readonly inspectionId: string | null;
  readonly productionOrderId: string | null;
  readonly resultRef: string | null;
};
