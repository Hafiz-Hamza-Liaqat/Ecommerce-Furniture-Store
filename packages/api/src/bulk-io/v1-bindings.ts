import type { BulkIoEntityBinding } from "@afh/application";

/** RC7.7 freeze default opt-in entities. */
export const V1_BULK_IO_BINDINGS: readonly BulkIoEntityBinding[] = [
  {
    allowedEntityType: "inventory.item",
    resourceType: "inventory_item",
    importAction: "inventory.items.import",
    exportAction: "inventory.items.export",
    bulkUpdateAction: "inventory.items.bulk_update",
  },
  {
    allowedEntityType: "crm.lead",
    resourceType: "lead",
    importAction: "crm.leads.import",
    exportAction: "crm.leads.export",
    bulkUpdateAction: "crm.leads.bulk_update",
  },
  {
    allowedEntityType: "procurement.supplier",
    resourceType: "supplier",
    importAction: "procurement.suppliers.import",
    exportAction: "procurement.suppliers.export",
    bulkUpdateAction: "procurement.suppliers.bulk_update",
  },
] as const;

/** Policy action map for catalog coverage tests. */
export const BulkIoPolicyActions = {
  InventoryImport: "inventory.items.import",
  InventoryExport: "inventory.items.export",
  InventoryBulkUpdate: "inventory.items.bulk_update",
  CrmImport: "crm.leads.import",
  CrmExport: "crm.leads.export",
  CrmBulkUpdate: "crm.leads.bulk_update",
  ProcurementImport: "procurement.suppliers.import",
  ProcurementExport: "procurement.suppliers.export",
  ProcurementBulkUpdate: "procurement.suppliers.bulk_update",
} as const;
