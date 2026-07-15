/**
 * Bill of Materials — models only.
 * No explosion, costing, or quantity calculations.
 */

export type BomStatus = "draft" | "active" | "obsolete" | "archived";

export type BomVersionReference = {
  readonly versionId: string;
  readonly versionNumber: number;
  readonly bomId: string;
};

export type BomItem = {
  readonly id: string;
  readonly bomId: string;
  readonly versionId: string;
  readonly companyId: string;
  readonly lineNumber: number;
  readonly inventoryItemId: string | null;
  readonly productId: string | null;
  readonly variantId: string | null;
  readonly description: string;
  /** Declared quantity — no calculation engine here */
  readonly quantity: number;
  readonly unitCode: string | null;
};

export type BillOfMaterials = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly status: BomStatus;
  readonly finishedInventoryItemId: string | null;
  readonly finishedProductId: string | null;
  readonly finishedVariantId: string | null;
  readonly currentVersionId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type BomReference = {
  readonly bomId: string;
  readonly companyId: string;
  readonly code: string | null;
};
