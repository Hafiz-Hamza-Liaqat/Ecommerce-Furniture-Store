/**
 * RC10.7 — Inventory, procurement & manufacturing ops (local CX layer).
 * Parallel to ERP Inventory/Procurement/Manufacturing chrome; does not mutate
 * CRM, quotations, sales orders, planner, sync engine, or analytics engine.
 */

export const INVENTORY_CATEGORIES = [
  "furniture_product",
  "raw_material",
  "accessory",
  "hardware",
  "fabric",
  "wood",
  "glass",
  "metal",
  "packaging",
  "foam",
  "other",
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  furniture_product: "Furniture product",
  raw_material: "Raw material",
  accessory: "Accessory",
  hardware: "Hardware",
  fabric: "Fabric",
  wood: "Wood",
  glass: "Glass",
  metal: "Metal",
  packaging: "Packaging",
  foam: "Foam",
  other: "Other",
};

export const ITEM_STATUSES = ["active", "inactive", "discontinued"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export type InventoryItem = {
  readonly id: string;
  readonly sku: string;
  readonly category: InventoryCategory;
  readonly name: string;
  readonly description: string;
  readonly unit: string;
  readonly stockOnHand: number;
  readonly reserved: number;
  readonly minStock: number;
  readonly supplierId?: string;
  readonly unitCostPkr: number;
  readonly status: ItemStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type BomLine = {
  readonly itemId: string;
  readonly qtyPerUnit: number;
};

export type BillOfMaterials = {
  readonly id: string;
  readonly productItemId: string;
  readonly label: string;
  readonly lines: readonly BomLine[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SupplierStatus = "active" | "inactive";

export type Supplier = {
  readonly id: string;
  readonly company: string;
  readonly contactPerson: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly categories: readonly InventoryCategory[];
  readonly performanceNotes: string;
  readonly status: SupplierStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const PROCUREMENT_STAGES = [
  "draft",
  "requested",
  "approved",
  "ordered",
  "received",
  "closed",
] as const;

export type ProcurementStage = (typeof PROCUREMENT_STAGES)[number];

export const PROCUREMENT_STAGE_LABELS: Record<ProcurementStage, string> = {
  draft: "Draft",
  requested: "Requested",
  approved: "Approved",
  ordered: "Ordered",
  received: "Received",
  closed: "Closed",
};

export type ProcurementLine = {
  readonly itemId: string;
  readonly qtyOrdered: number;
  readonly qtyReceived: number;
};

export type ProcurementRequest = {
  readonly id: string;
  readonly supplierId: string;
  readonly stage: ProcurementStage;
  readonly lines: readonly ProcurementLine[];
  readonly expectedDelivery?: string;
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const MOVEMENT_TYPES = [
  "purchase_received",
  "production_allocation",
  "production_consumption",
  "allocation_release",
  "manual_adjustment",
  "return",
  "correction",
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

export type StockMovement = {
  readonly id: string;
  readonly itemId: string;
  readonly type: MovementType;
  readonly qtyDelta: number;
  readonly reservedDelta: number;
  readonly note: string;
  readonly refType?: string;
  readonly refId?: string;
  readonly at: string;
};

export const PRODUCTION_STAGES = [
  "queued",
  "material_ready",
  "in_production",
  "quality_check",
  "packaging",
  "ready",
  "dispatched",
  "delivered",
] as const;

export type ProductionStage = (typeof PRODUCTION_STAGES)[number];

export const PRODUCTION_STAGE_LABELS: Record<ProductionStage, string> = {
  queued: "Queued",
  material_ready: "Material Ready",
  in_production: "In Production",
  quality_check: "Quality Check",
  packaging: "Packaging",
  ready: "Ready",
  dispatched: "Dispatched",
  delivered: "Delivered",
};

export type MaterialAllocationLine = {
  readonly itemId: string;
  readonly required: number;
  readonly allocated: number;
  readonly shortage: number;
};

export type ProductionJob = {
  readonly id: string;
  readonly label: string;
  /** Optional reference to CX sales order — never mutates sales store. */
  readonly salesOrderId?: string;
  readonly bomId: string;
  readonly qty: number;
  readonly stage: ProductionStage;
  readonly allocations: readonly MaterialAllocationLine[];
  readonly pendingProcurement: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type OpsWorkspaceState = {
  readonly version: 1;
  readonly items: readonly InventoryItem[];
  readonly boms: readonly BillOfMaterials[];
  readonly suppliers: readonly Supplier[];
  readonly procurements: readonly ProcurementRequest[];
  readonly movements: readonly StockMovement[];
  readonly jobs: readonly ProductionJob[];
};

/** Extension hooks for RC10.8+ — reserved, unused in RC10.7. */
export type OpsExtensionHooks = {
  readonly onBarcodeScan?: () => void;
  readonly onQrLabels?: () => void;
  readonly onWarehouseLocations?: () => void;
  readonly onMultiWarehouse?: () => void;
  readonly onPurchaseInvoices?: () => void;
  readonly onCostAccounting?: () => void;
  readonly onMrp?: () => void;
  readonly onErpIntegration?: () => void;
};

export type OpsSearchFilters = {
  readonly sku?: string;
  readonly supplierId?: string;
  readonly category?: InventoryCategory | "all";
  readonly stockStatus?: "all" | "ok" | "low" | "out";
  readonly productionStage?: ProductionStage | "all";
  readonly procurementStage?: ProcurementStage | "all";
  readonly material?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
};
