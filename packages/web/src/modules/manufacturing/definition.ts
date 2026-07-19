import type { EntityDef, FilterDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

const filters: FilterDef[] = [
  { key: "status", label: "Status", options: ["Draft", "Released", "In progress", "Complete", "Hold"] },
  { key: "workCenter", label: "Work center" },
  { key: "product", label: "Product" },
  { key: "date", label: "Date" },
  { key: "priority", label: "Priority", options: ["High", "Medium", "Low"] },
];

function e(p: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...p };
}

export const MANUFACTURING_MODULE: ModuleDefinition = {
  id: "manufacturing",
  title: "Manufacturing",
  lead: "Production orders via Manufacturing Application CQRS; shop-floor chrome remains presentation until handlers expand.",
  basePath: "/app/manufacturing",
  kpis: [
    { label: "Open production orders", value: "Live", trend: 3.5, href: "production-orders" },
    { label: "Utilization", value: "86%", trend: 2.0, href: "capacity" },
    { label: "QC holds", value: "5", trend: -1.0, href: "quality" },
    { label: "Maintenance due", value: "3", trend: 0, href: "maintenance" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "bom", label: "Bills of materials", entityKey: "bom" },
    { to: "production-orders", label: "Production orders", entityKey: "production-orders" },
    { to: "work-orders", label: "Work orders", entityKey: "work-orders" },
    { to: "work-centers", label: "Work centers", entityKey: "work-centers" },
    { to: "machines", label: "Machines", entityKey: "machines" },
    { to: "capacity", label: "Capacity planning", entityKey: "capacity" },
    { to: "scheduling", label: "Scheduling", entityKey: "scheduling" },
    { to: "maintenance", label: "Maintenance", entityKey: "maintenance" },
    { to: "quality", label: "Quality inspection", entityKey: "quality" },
    { to: "shop-floor", label: "Shop floor", entityKey: "shop-floor" },
    { to: "calendar", label: "Production calendar" },
    { to: "pipeline", label: "Kanban" },
    { to: "consumption", label: "Material consumption", entityKey: "consumption" },
    { to: "finished-goods", label: "Finished goods", entityKey: "finished-goods" },
    { to: "analytics", label: "Analytics", entityKey: "analytics" },
  ],
  entities: [
    e({
      key: "bom",
      label: "BOM",
      plural: "Bills of materials",
      description: "Product structures.",
      columns: [
        { key: "title", label: "BOM" },
        { key: "status", label: "Status" },
        { key: "Product", label: "Product" },
        { key: "Revision", label: "Rev" },
      ],
      fields: [
        { name: "title", label: "BOM", type: "text", required: true },
        { name: "product", label: "Product", type: "text" },
      ],
      records: makeRows("BOM", ["Meridian Sofa BOM", "Harbor Table BOM", "Atelier Lounge BOM"], (i) => ({
        Product: ["Meridian Sofa", "Harbor Table", "Atelier Lounge"][i]!,
        Revision: `R${i + 1}`,
      })),
    }),
    e({
      key: "production-orders",
      label: "Production order",
      plural: "Production orders",
      description: "Manufacturing production orders.",
      kanban: true,
      columns: [
        { key: "title", label: "Order" },
        { key: "status", label: "Status" },
        { key: "Product", label: "Product" },
        { key: "Qty", label: "Qty" },
      ],
      fields: [
        { name: "number", label: "Order number", type: "text", required: true },
        { name: "quantity", label: "Quantity", type: "number" },
        { name: "unitCode", label: "Unit", type: "text" },
        { name: "warehouseId", label: "Warehouse ID", type: "text" },
        { name: "finishedInventoryItemId", label: "Finished item ID", type: "text" },
      ],
      records: makeRows("MO", ["MO-4401", "MO-4412", "MO-4420", "MO-4428"], (i) => ({
        Product: ["Meridian Sofa", "Harbor Table", "Hardware pack", "Atelier Lounge"][i]!,
        Qty: 10 + i * 6,
      })),
      api: {
        createCommandType: "manufacturing.CreateProductionOrder",
        getQueryType: "manufacturing.GetProductionOrder",
        listQueryType: "manufacturing.ListProductionOrder",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          number: v.number,
          quantity: v.quantity ? Number(v.quantity) : null,
          unitCode: v.unitCode || null,
          warehouseId: v.warehouseId || null,
          finishedInventoryItemId: v.finishedInventoryItemId || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, productionOrderId: id }),
        extractCreateId: (data) => (data as { productionOrderId?: string }).productionOrderId ?? null,
        mapEntity: (data) => {
          const wrapped = data as { productionOrder?: Record<string, unknown> };
          const d = (wrapped.productionOrder ?? data) as {
            id?: string;
            number?: string;
            status?: string;
            quantity?: number | null;
            finishedInventoryItemId?: string | null;
          };
          if (!d.id) return null;
          return row(d.id, d.number ?? d.id, d.status ?? "draft", {
            Product: d.finishedInventoryItemId ?? "—",
            Qty: d.quantity ?? "—",
          }, { source: "api" });
        },
      },
    }),
    e({
      key: "work-orders",
      label: "Work order",
      plural: "Work orders",
      description: "Shop work orders / operations.",
      columns: [
        { key: "title", label: "Work order" },
        { key: "status", label: "Status" },
        { key: "Center", label: "Work center" },
        { key: "Op", label: "Operation" },
      ],
      fields: [
        { name: "title", label: "Work order", type: "text", required: true },
        { name: "center", label: "Work center", type: "text" },
      ],
      records: makeRows("MWO", ["Cut oak panels", "CNC nest", "Upholster", "Finish"], (i) => ({
        Center: ["Saw", "CNC", "Upholstery", "Finish"][i]!,
        Op: `OP-${10 + i}`,
      })),
    }),
    e({
      key: "work-centers",
      label: "Work center",
      plural: "Work centers",
      description: "Work centers and cells.",
      columns: [
        { key: "title", label: "Center" },
        { key: "status", label: "Status" },
        { key: "Capacity", label: "Capacity" },
      ],
      fields: [
        { name: "title", label: "Center", type: "text", required: true },
        { name: "capacity", label: "Capacity", type: "text" },
      ],
      records: makeRows("WC", ["Saw cell", "CNC cell", "Upholstery", "Finish line"], (i) => ({
        Capacity: `${80 + i * 5}%`,
      })),
    }),
    e({
      key: "machines",
      label: "Machine",
      plural: "Machines",
      description: "Machines and assets on the floor.",
      columns: [
        { key: "title", label: "Machine" },
        { key: "status", label: "Status" },
        { key: "Center", label: "Center" },
      ],
      fields: [
        { name: "title", label: "Machine", type: "text", required: true },
        { name: "center", label: "Center", type: "text" },
      ],
      records: makeRows("MCH", ["CNC-01", "CNC-02", "Spray booth A", "Edge bander"], (i) => ({
        Center: ["CNC", "CNC", "Finish", "Saw"][i]!,
      })),
    }),
    e({
      key: "capacity",
      label: "Capacity plan",
      plural: "Capacity planning",
      description: "Capacity planning presentation.",
      analytics: true,
      columns: [
        { key: "title", label: "Center" },
        { key: "status", label: "Week" },
        { key: "Load", label: "Load" },
      ],
      fields: [{ name: "title", label: "Center", type: "text", required: true }],
      records: makeRows("CAP", ["CNC cell", "Finish line", "Upholstery"], (i) => ({
        Load: `${75 + i * 6}%`,
      })),
    }),
    e({
      key: "scheduling",
      label: "Schedule",
      plural: "Scheduling",
      description: "Production schedules.",
      columns: [
        { key: "title", label: "Schedule" },
        { key: "status", label: "Status" },
        { key: "Window", label: "Window" },
      ],
      fields: [
        { name: "title", label: "Schedule", type: "text", required: true },
        { name: "window", label: "Window", type: "text" },
      ],
      records: makeRows("SCH", ["Week 29 CNC", "Week 29 Finish"], (i) => ({
        Window: `2026-W${29 + i}`,
      })),
    }),
    e({
      key: "maintenance",
      label: "Maintenance",
      plural: "Maintenance",
      description: "Machine maintenance.",
      columns: [
        { key: "title", label: "Work" },
        { key: "status", label: "Status" },
        { key: "Machine", label: "Machine" },
        { key: "Due", label: "Due" },
      ],
      fields: [
        { name: "title", label: "Work", type: "text", required: true },
        { name: "machine", label: "Machine", type: "text" },
      ],
      records: makeRows("MMN", ["Spindle service", "Filter change"], (i) => ({
        Machine: ["CNC-01", "Spray booth A"][i]!,
        Due: `2026-07-${20 + i}`,
      })),
    }),
    e({
      key: "quality",
      label: "Inspection",
      plural: "Quality inspection",
      description: "In-process and final QC.",
      columns: [
        { key: "title", label: "Inspection" },
        { key: "status", label: "Result" },
        { key: "Order", label: "Order" },
      ],
      fields: [
        { name: "title", label: "Inspection", type: "text", required: true },
        { name: "result", label: "Result", type: "select", options: ["Pass", "Fail", "Hold"] },
      ],
      records: makeRows("IQC", ["Final — MO-4401", "In-process CNC", "Finish adhesion"], (i) => ({
        Order: ["MO-4401", "MO-4412", "MO-4420"][i]!,
      })),
    }),
    e({
      key: "shop-floor",
      label: "Floor board",
      plural: "Shop floor",
      description: "Shop-floor status board.",
      columns: [
        { key: "title", label: "Station" },
        { key: "status", label: "Status" },
        { key: "Job", label: "Current job" },
      ],
      fields: [
        { name: "title", label: "Station", type: "text", required: true },
        { name: "job", label: "Job", type: "text" },
      ],
      records: makeRows("SF", ["CNC-01", "Upholstery 2", "Pack"], (i) => ({
        Job: ["MO-4412", "MO-4401", "MO-4428"][i]!,
      })),
    }),
    e({
      key: "consumption",
      label: "Consumption",
      plural: "Material consumption",
      description: "Material issued to production.",
      columns: [
        { key: "title", label: "Issue" },
        { key: "status", label: "Status" },
        { key: "Material", label: "Material" },
        { key: "Qty", label: "Qty" },
      ],
      fields: [
        { name: "title", label: "Issue", type: "text", required: true },
        { name: "material", label: "Material", type: "text" },
      ],
      records: makeRows("MCN", ["Oak panel issue", "Foam issue", "Hardware issue"], (i) => ({
        Material: ["Oak panel A", "Foam grade B", "Hardware pack H12"][i]!,
        Qty: 40 + i * 10,
      })),
    }),
    e({
      key: "finished-goods",
      label: "Finished good",
      plural: "Finished goods",
      description: "Completed production receipts.",
      columns: [
        { key: "title", label: "Receipt" },
        { key: "status", label: "Status" },
        { key: "Product", label: "Product" },
        { key: "Qty", label: "Qty" },
      ],
      fields: [
        { name: "title", label: "Receipt", type: "text", required: true },
        { name: "product", label: "Product", type: "text" },
      ],
      records: makeRows("FG", ["FG-MO-4401", "FG-MO-4412"], (i) => ({
        Product: ["Meridian Sofa", "Harbor Table"][i]!,
        Qty: 12 + i * 4,
      })),
    }),
    e({
      key: "analytics",
      label: "Analytics view",
      plural: "Manufacturing analytics",
      description: "Manufacturing analytics gallery.",
      analytics: true,
      columns: [
        { key: "title", label: "View" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "View", type: "text", required: true }],
      records: makeRows("MAN", ["OEE", "Scrap rate", "On-time production"], (i) => ({
        Value: ["74%", "1.8%", "91%"][i]!,
      })),
    }),
  ],
};
