/**
 * Manufacturing application constants.
 */

export const ManufacturingCommandTypes = {
  CreateProductionOrder: "manufacturing.CreateProductionOrder",
} as const;

export const ManufacturingQueryTypes = {
  GetProductionOrder: "manufacturing.GetProductionOrder",
  ListProductionOrder: "manufacturing.ListProductionOrder",
} as const;

export const ManufacturingPolicyActions = {
  ProductionOrderCreate: "manufacturing.production_orders.create",
  ProductionOrderRead: "manufacturing.production_orders.read",
} as const;
