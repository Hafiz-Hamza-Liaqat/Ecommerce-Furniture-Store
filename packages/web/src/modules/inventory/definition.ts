import type { EntityDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

const filters = [
  { key: "warehouse", label: "Warehouse", options: ["Lahore DC", "Karachi DC", "Factory"] },
  { key: "brand", label: "Brand", options: ["AFH", "Atelier", "Heritage", "Studio"] },
  { key: "supplier", label: "Supplier" },
  { key: "category", label: "Category", options: ["Finished", "Raw", "WIP", "Consumable"] },
  { key: "location", label: "Location" },
  { key: "stock", label: "Stock level", options: ["Healthy", "Low", "Out", "Overstock"] },
  { key: "expiry", label: "Expiry" },
  { key: "batch", label: "Batch" },
  { key: "serial", label: "Serial" },
  { key: "status", label: "Status", options: ["Active", "Draft", "Hold", "Closed"] },
];

function e(partial: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...partial };
}

const products = makeRows(
  "SKU",
  ["Meridian Sofa frame", "Harbor Table top", "Oak panel A", "Foam grade B", "Hardware pack H12"],
  (i) => ({
    SKU: `AFH-${300 + i}`,
    Category: ["Finished", "Finished", "Raw", "Consumable", "Consumable"][i % 5]!,
    Brand: ["Atelier", "Heritage", "AFH", "AFH", "Studio"][i % 5]!,
    OnHand: 40 + i * 12,
    Warehouse: ["Lahore DC", "Factory"][i % 2]!,
  }),
);

export const INVENTORY_MODULE: ModuleDefinition = {
  id: "inventory",
  title: "Inventory",
  lead: "Items, warehouses, and stock movements via Inventory Application — valuation stays server-side.",
  basePath: "/app/inventory",
  summaryQueryType: "inventory.GetInventorySummary",
  buildSummaryPayload: (companyId) => ({ companyId }),
  kpis: [
    { label: "Inventory value", value: "₨ 22.7M", trend: 1.8, href: "valuation" },
    { label: "SKUs", value: "1,842", trend: 2.4, href: "products" },
    { label: "Low stock", value: "37", trend: -5.0, href: "stock" },
    { label: "Transfers open", value: "11", trend: 0, href: "transfers" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "products", label: "Products", entityKey: "products" },
    { to: "categories", label: "Categories", entityKey: "categories" },
    { to: "brands", label: "Brands", entityKey: "brands" },
    { to: "units", label: "Units", entityKey: "units" },
    { to: "warehouses", label: "Warehouses", entityKey: "warehouses" },
    { to: "locations", label: "Locations", entityKey: "locations" },
    { to: "stock", label: "Stock", entityKey: "stock" },
    { to: "transfers", label: "Transfers", entityKey: "transfers" },
    { to: "reservations", label: "Reservations", entityKey: "reservations" },
    { to: "adjustments", label: "Adjustments", entityKey: "adjustments" },
    { to: "batches", label: "Batch", entityKey: "batches" },
    { to: "lots", label: "Lot", entityKey: "lots" },
    { to: "serials", label: "Serial", entityKey: "serials" },
    { to: "barcodes", label: "Barcode", entityKey: "barcodes" },
    { to: "qr", label: "QR", entityKey: "qr" },
    { to: "cycle-counts", label: "Cycle count", entityKey: "cycle-counts" },
    { to: "reorders", label: "Reorder", entityKey: "reorders" },
    { to: "valuation", label: "Stock valuation", entityKey: "valuation" },
    { to: "abc", label: "ABC analysis", entityKey: "abc" },
    { to: "dead-stock", label: "Dead stock", entityKey: "dead-stock" },
    { to: "fast-moving", label: "Fast moving", entityKey: "fast-moving" },
    { to: "slow-moving", label: "Slow moving", entityKey: "slow-moving" },
    { to: "expiry", label: "Expiry tracking", entityKey: "expiry" },
    { to: "forecast", label: "Forecasting", entityKey: "forecast" },
    { to: "analytics", label: "Analytics", entityKey: "analytics" },
  ],
  entities: [
    e({
      key: "products",
      label: "Product",
      plural: "Products",
      description: "Inventory items / SKUs.",
      columns: [
        { key: "title", label: "Item", sortable: true },
        { key: "status", label: "Status" },
        { key: "SKU", label: "SKU" },
        { key: "Category", label: "Category" },
        { key: "OnHand", label: "On hand", sortable: true },
      ],
      fields: [
        { name: "code", label: "Code", type: "text", required: true },
        { name: "name", label: "Name", type: "text", required: true },
        { name: "sku", label: "SKU", type: "text", required: true },
        { name: "classification", label: "Classification", type: "select", options: ["finished_good", "raw_material", "component", "consumable", "tooling", "other"] },
        { name: "itemType", label: "Item type", type: "select", options: ["stocked", "non_stocked", "serialized", "batch_tracked", "service_linked"] },
      ],
      records: products,
      api: {
        createCommandType: "inventory.CreateInventoryItem",
        updateCommandType: "inventory.UpdateInventoryItem",
        getQueryType: "inventory.GetInventoryItem",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          code: v.code,
          name: v.name,
          sku: v.sku,
          classification: v.classification || "finished_good",
          itemType: v.itemType || "stocked",
        }),
        buildUpdatePayload: (companyId, inventoryItemId, v) => ({
          companyId,
          inventoryItemId,
          code: v.code || null,
          name: v.name || null,
          sku: v.sku || null,
          classification: v.classification || null,
          itemType: v.itemType || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, inventoryItemId: id }),
        extractCreateId: (data) => (data as { inventoryItemId?: string }).inventoryItemId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; name?: string; sku?: string; status?: string; code?: string };
          if (!d.id) return null;
          return row(d.id, d.name ?? d.id, d.status ?? "Active", { SKU: d.sku ?? "—", Code: d.code ?? "—" }, { source: "api" });
        },
        lifecycleActions: [
          {
            id: "receive",
            label: "Receive stock",
            commandType: "inventory.ReceiveStock",
            buildPayload: (companyId, inventoryItemId, r) => ({
              companyId,
              inventoryItemId,
              warehouseId: String(r.meta.warehouseId ?? r.meta.WarehouseId ?? ""),
              quantity: Number(r.meta.quantity ?? 1),
              unitCode: String(r.meta.unitCode ?? "ea"),
            }),
          },
        ],
      },
    }),
    e({
      key: "categories",
      label: "Category",
      plural: "Categories",
      description: "Item classification tree.",
      columns: [
        { key: "title", label: "Category" },
        { key: "status", label: "Status" },
        { key: "Items", label: "Items" },
      ],
      fields: [{ name: "title", label: "Category", type: "text", required: true }],
      records: makeRows("ICAT", ["Finished", "Raw", "WIP", "Consumable"], (i) => ({ Items: 120 + i * 40 })),
    }),
    e({
      key: "brands",
      label: "Brand",
      plural: "Brands",
      description: "Brand attributions for catalogue items.",
      columns: [
        { key: "title", label: "Brand" },
        { key: "status", label: "Status" },
        { key: "SKUs", label: "SKUs" },
      ],
      fields: [{ name: "title", label: "Brand", type: "text", required: true }],
      records: makeRows("BR", ["AFH", "Atelier", "Heritage", "Studio"], (i) => ({ SKUs: 80 + i * 25 })),
    }),
    e({
      key: "units",
      label: "Unit",
      plural: "Units",
      description: "Units of measure.",
      columns: [
        { key: "title", label: "Unit" },
        { key: "status", label: "Status" },
        { key: "Symbol", label: "Symbol" },
      ],
      fields: [
        { name: "title", label: "Unit name", type: "text", required: true },
        { name: "symbol", label: "Symbol", type: "text" },
      ],
      records: makeRows("UOM", ["Each", "Set", "Meter", "Kilogram"], (i, t) => ({
        Symbol: ["EA", "SET", "M", "KG"][i] ?? t.slice(0, 2),
      })),
    }),
    e({
      key: "warehouses",
      label: "Warehouse",
      plural: "Warehouses",
      description: "Warehouse master.",
      columns: [
        { key: "title", label: "Warehouse" },
        { key: "status", label: "Status" },
        { key: "Code", label: "Code" },
        { key: "City", label: "City" },
      ],
      fields: [
        { name: "code", label: "Code", type: "text", required: true },
        { name: "name", label: "Name", type: "text", required: true },
        { name: "warehouseType", label: "Type", type: "select", options: ["central", "branch", "showroom", "workshop", "virtual", "partner", "other"], required: true },
      ],
      records: makeRows("WH", ["Lahore DC", "Karachi DC", "Factory Stores"], (i) => ({
        Code: ["LHE-DC", "KHI-DC", "FTY"][i]!,
        City: ["Lahore", "Karachi", "Lahore"][i]!,
      })),
      api: {
        createCommandType: "inventory.CreateWarehouse",
        getQueryType: "inventory.GetWarehouse",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          code: v.code,
          name: v.name,
          warehouseType: v.warehouseType || "central",
        }),
        buildGetPayload: (companyId, id) => ({ companyId, warehouseId: id }),
        extractCreateId: (data) => (data as { warehouseId?: string }).warehouseId ?? null,
        mapEntity: (data) => {
          const wrap = data as { warehouse?: { id?: string; name?: string; code?: string; status?: string } };
          const w = wrap.warehouse ?? (data as { id?: string; name?: string; code?: string; status?: string });
          if (!w.id) return null;
          return row(w.id, w.name ?? w.id, w.status ?? "Active", { Code: w.code ?? "—" }, { source: "api" });
        },
      },
    }),
    e({
      key: "locations",
      label: "Location",
      plural: "Locations",
      description: "Bins and storage locations.",
      columns: [
        { key: "title", label: "Location" },
        { key: "status", label: "Status" },
        { key: "Warehouse", label: "Warehouse" },
        { key: "Type", label: "Type" },
      ],
      fields: [
        { name: "warehouseId", label: "Warehouse ID", type: "text", required: true },
        { name: "code", label: "Location code", type: "text", required: true },
        { name: "name", label: "Name", type: "text", required: true },
        { name: "kind", label: "Kind", type: "select", options: ["zone", "aisle", "rack", "shelf", "bin", "other"], required: true },
        { name: "path", label: "Path", type: "text", required: true, placeholder: "/A/01/01" },
      ],
      records: makeRows("LOC", ["A-01-01", "A-01-02", "B-02-04", "RECV-01"], (i) => ({
        Warehouse: ["Lahore DC", "Factory"][i % 2]!,
        Type: i === 3 ? "Receiving" : "Pick",
      })),
      api: {
        createCommandType: "inventory.CreateStorageLocation",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          warehouseId: v.warehouseId,
          code: v.code,
          name: v.name,
          kind: v.kind || "bin",
          path: v.path || `/${v.code}`,
        }),
        extractCreateId: (data) => (data as { storageLocationId?: string }).storageLocationId ?? null,
      },
    }),
    e({
      key: "stock",
      label: "Stock position",
      plural: "Stock",
      description: "On-hand / reserved / available positions.",
      columns: [
        { key: "title", label: "Item" },
        { key: "status", label: "Level" },
        { key: "Warehouse", label: "Warehouse" },
        { key: "OnHand", label: "On hand" },
        { key: "Reserved", label: "Reserved" },
      ],
      fields: [
        { name: "inventoryItemId", label: "Item ID", type: "text", required: true },
        { name: "warehouseId", label: "Warehouse ID", type: "text" },
      ],
      records: products.map((p) =>
        row(p.id, p.title, Number(p.meta.OnHand ?? 0) < 50 ? "Low" : "Healthy", {
          Warehouse: String(p.meta.Warehouse ?? "—"),
          OnHand: p.meta.OnHand ?? 0,
          Reserved: Math.floor(Number(p.meta.OnHand ?? 0) * 0.1),
        }),
      ),
      api: {
        getQueryType: "inventory.GetStock",
        buildGetPayload: (companyId, id) => ({ companyId, inventoryItemId: id }),
      },
    }),
    e({
      key: "transfers",
      label: "Transfer",
      plural: "Transfers",
      description: "Inter-warehouse transfers.",
      columns: [
        { key: "title", label: "Transfer" },
        { key: "status", label: "Status" },
        { key: "From", label: "From" },
        { key: "To", label: "To" },
      ],
      fields: [
        { name: "inventoryItemId", label: "Item ID", type: "text", required: true },
        { name: "fromWarehouseId", label: "From warehouse", type: "text", required: true },
        { name: "toWarehouseId", label: "To warehouse", type: "text", required: true },
        { name: "quantity", label: "Quantity", type: "number", required: true },
      ],
      records: makeRows("TR", ["TR-701", "TR-708", "TR-715"], (i) => ({
        From: "Lahore DC",
        To: i ? "Factory" : "Karachi DC",
      })),
      api: {
        createCommandType: "inventory.TransferStock",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          inventoryItemId: v.inventoryItemId,
          fromWarehouseId: v.fromWarehouseId,
          toWarehouseId: v.toWarehouseId,
          quantity: Number(v.quantity || 1),
        }),
        extractCreateId: (data) => (data as { movementId?: string }).movementId ?? `TR-local-${Date.now()}`,
      },
    }),
    e({
      key: "reservations",
      label: "Reservation",
      plural: "Reservations",
      description: "Stock reserved for orders.",
      columns: [
        { key: "title", label: "Reservation" },
        { key: "status", label: "Status" },
        { key: "Item", label: "Item" },
        { key: "Qty", label: "Qty" },
      ],
      fields: [
        { name: "inventoryItemId", label: "Item ID", type: "text", required: true },
        { name: "warehouseId", label: "Warehouse ID", type: "text", required: true },
        { name: "quantity", label: "Quantity", type: "number", required: true },
        { name: "subjectType", label: "Subject type", type: "text", required: true, placeholder: "sales.order" },
        { name: "subjectId", label: "Subject ID", type: "text", required: true },
      ],
      records: makeRows("RSV", ["RSV-SO-31001", "RSV-SO-31014"], (i) => ({
        Item: products[i % products.length]!.title,
        Qty: 4 + i,
      })),
      api: {
        createCommandType: "inventory.ReserveStock",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          inventoryItemId: v.inventoryItemId,
          warehouseId: v.warehouseId,
          quantity: Number(v.quantity || 1),
          subjectType: v.subjectType || "sales.order",
          subjectId: v.subjectId || `subject-${Date.now()}`,
        }),
        extractCreateId: (data) => (data as { reservationId?: string }).reservationId ?? `RSV-${Date.now()}`,
      },
    }),
    e({
      key: "adjustments",
      label: "Adjustment",
      plural: "Adjustments",
      description: "Stock adjustments (approval may apply).",
      columns: [
        { key: "title", label: "Adjustment" },
        { key: "status", label: "Status" },
        { key: "Reason", label: "Reason" },
        { key: "Delta", label: "Delta" },
      ],
      fields: [
        { name: "inventoryItemId", label: "Item ID", type: "text", required: true },
        { name: "warehouseId", label: "Warehouse ID", type: "text", required: true },
        { name: "quantityDelta", label: "Quantity delta", type: "number", required: true },
        { name: "reason", label: "Reason", type: "text", required: true },
      ],
      records: makeRows("ADJ", ["ADJ-88 damage", "ADJ-92 count", "ADJ-95 scrap"], (i) => ({
        Reason: ["damage", "cycle_count", "scrap"][i % 3]!,
        Delta: i === 1 ? "+2" : "-1",
      })),
      api: {
        createCommandType: "inventory.AdjustStock",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          inventoryItemId: v.inventoryItemId,
          warehouseId: v.warehouseId,
          quantityDelta: Number(v.quantityDelta || 0),
          reason: v.reason || "adjustment",
        }),
        extractCreateId: (data) => (data as { movementId?: string }).movementId ?? `ADJ-${Date.now()}`,
      },
    }),
    e({
      key: "batches",
      label: "Batch",
      plural: "Batches",
      description: "Batch-tracked inventory.",
      columns: [
        { key: "title", label: "Batch" },
        { key: "status", label: "Status" },
        { key: "Item", label: "Item" },
        { key: "Qty", label: "Qty" },
      ],
      fields: [
        { name: "title", label: "Batch code", type: "text", required: true },
        { name: "item", label: "Item", type: "text" },
      ],
      records: makeRows("BAT", ["BAT-OAK-01", "BAT-FOAM-04"], (i) => ({
        Item: products[i + 2]!.title,
        Qty: 200 + i * 40,
      })),
      api: {
        getQueryType: "inventory.GetBatch",
        buildGetPayload: (companyId, id) => ({ companyId, batchId: id }),
      },
    }),
    e({
      key: "lots",
      label: "Lot",
      plural: "Lots",
      description: "Lot-tracked inventory.",
      columns: [
        { key: "title", label: "Lot" },
        { key: "status", label: "Status" },
        { key: "Item", label: "Item" },
        { key: "Expiry", label: "Expiry" },
      ],
      fields: [{ name: "title", label: "Lot code", type: "text", required: true }],
      records: makeRows("LOT", ["LOT-FIN-11", "LOT-FIN-18"], (i) => ({
        Item: "FinishChem lacquer",
        Expiry: `2027-0${3 + i}-01`,
      })),
      api: {
        getQueryType: "inventory.GetLot",
        buildGetPayload: (companyId, id) => ({ companyId, lotId: id }),
      },
    }),
    e({
      key: "serials",
      label: "Serial",
      plural: "Serials",
      description: "Serialized units.",
      columns: [
        { key: "title", label: "Serial" },
        { key: "status", label: "Status" },
        { key: "Item", label: "Item" },
        { key: "Warehouse", label: "Warehouse" },
      ],
      fields: [{ name: "title", label: "Serial number", type: "text", required: true }],
      records: makeRows("SN", ["SN-ATELIER-1001", "SN-ATELIER-1002", "SN-HERITAGE-440"], (i) => ({
        Item: products[i % 2]!.title,
        Warehouse: "Lahore DC",
      })),
      api: {
        getQueryType: "inventory.GetSerial",
        buildGetPayload: (companyId, id) => ({ companyId, serialId: id }),
      },
    }),
    e({
      key: "barcodes",
      label: "Barcode",
      plural: "Barcodes",
      description: "Barcode labels and scan registry.",
      columns: [
        { key: "title", label: "Barcode" },
        { key: "status", label: "Status" },
        { key: "SKU", label: "SKU" },
      ],
      fields: [
        { name: "title", label: "Barcode", type: "text", required: true },
        { name: "sku", label: "SKU", type: "text" },
      ],
      records: makeRows("BC", ["8901001001", "8901001002", "8901001010"], (i) => ({
        SKU: String(products[i % products.length]!.meta.SKU ?? "—"),
      })),
    }),
    e({
      key: "qr",
      label: "QR code",
      plural: "QR codes",
      description: "QR identifiers for locations and assets.",
      columns: [
        { key: "title", label: "QR" },
        { key: "status", label: "Status" },
        { key: "Target", label: "Target" },
      ],
      fields: [
        { name: "title", label: "QR id", type: "text", required: true },
        { name: "target", label: "Target", type: "text" },
      ],
      records: makeRows("QR", ["QR-LOC-A01", "QR-LOC-RECV", "QR-ASSET-CNC1"], (i) => ({
        Target: ["Location A-01-01", "Receiving", "CNC-01"][i]!,
      })),
    }),
    e({
      key: "cycle-counts",
      label: "Cycle count",
      plural: "Cycle counts",
      description: "Scheduled cycle count sheets.",
      columns: [
        { key: "title", label: "Count" },
        { key: "status", label: "Status" },
        { key: "Warehouse", label: "Warehouse" },
        { key: "Variance", label: "Variance" },
      ],
      fields: [
        { name: "title", label: "Count sheet", type: "text", required: true },
        { name: "warehouse", label: "Warehouse", type: "text" },
      ],
      records: makeRows("CC", ["CC-July-A", "CC-July-B"], (i) => ({
        Warehouse: ["Lahore DC", "Factory"][i]!,
        Variance: i ? "0.4%" : "0.1%",
      })),
    }),
    e({
      key: "reorders",
      label: "Reorder",
      plural: "Reorders",
      description: "Reorder suggestions (rules evaluated server-side).",
      columns: [
        { key: "title", label: "Item" },
        { key: "status", label: "Status" },
        { key: "ROP", label: "Reorder point" },
        { key: "Suggest", label: "Suggest qty" },
      ],
      fields: [{ name: "title", label: "Item", type: "text", required: true }],
      records: makeRows("ROP", ["Hardware pack H12", "Foam grade B"], (i) => ({
        ROP: 80 + i * 10,
        Suggest: 120 + i * 20,
      })),
    }),
    e({
      key: "valuation",
      label: "Valuation row",
      plural: "Stock valuation",
      description: "Presentation of valuation snapshots from Reporting.",
      analytics: true,
      columns: [
        { key: "title", label: "Bucket" },
        { key: "status", label: "Method" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "Bucket", type: "text", required: true }],
      records: makeRows("VAL", ["Finished goods", "Raw materials", "WIP"], (i) => ({
        Value: [`₨ 14.2M`, `₨ 6.1M`, `₨ 2.4M`][i]!,
      })),
    }),
    e({
      key: "abc",
      label: "ABC class",
      plural: "ABC analysis",
      description: "ABC classification presentation.",
      analytics: true,
      columns: [
        { key: "title", label: "Class" },
        { key: "status", label: "Share" },
        { key: "SKUs", label: "SKUs" },
      ],
      fields: [{ name: "title", label: "Class", type: "text", required: true }],
      records: [
        row("ABC-A", "Class A", "70% value", { SKUs: 120 }),
        row("ABC-B", "Class B", "20% value", { SKUs: 410 }),
        row("ABC-C", "Class C", "10% value", { SKUs: 1312 }),
      ],
    }),
    e({
      key: "dead-stock",
      label: "Dead stock",
      plural: "Dead stock",
      description: "Items with no movement in the analysis window.",
      analytics: true,
      columns: [
        { key: "title", label: "Item" },
        { key: "status", label: "Idle days" },
        { key: "OnHand", label: "On hand" },
      ],
      fields: [{ name: "title", label: "Item", type: "text", required: true }],
      records: makeRows("DEAD", ["Legacy fabric roll", "Old finish kit"], (i) => ({
        OnHand: 18 + i * 4,
      })),
    }),
    e({
      key: "fast-moving",
      label: "Fast mover",
      plural: "Fast moving",
      description: "High-velocity SKUs.",
      analytics: true,
      columns: [
        { key: "title", label: "Item" },
        { key: "status", label: "Velocity" },
        { key: "Turns", label: "Turns" },
      ],
      fields: [{ name: "title", label: "Item", type: "text", required: true }],
      records: makeRows("FAST", ["Hardware pack H12", "Meridian Sofa frame"], (i) => ({
        Turns: 8 + i,
      })),
    }),
    e({
      key: "slow-moving",
      label: "Slow mover",
      plural: "Slow moving",
      description: "Low-velocity SKUs.",
      analytics: true,
      columns: [
        { key: "title", label: "Item" },
        { key: "status", label: "Velocity" },
        { key: "Turns", label: "Turns" },
      ],
      fields: [{ name: "title", label: "Item", type: "text", required: true }],
      records: makeRows("SLOW", ["Custom veneer sample", "Showroom prototype"], () => ({
        Turns: 1,
      })),
    }),
    e({
      key: "expiry",
      label: "Expiry watch",
      plural: "Expiry tracking",
      description: "Lots approaching expiry.",
      columns: [
        { key: "title", label: "Lot" },
        { key: "status", label: "Risk" },
        { key: "Expiry", label: "Expiry" },
      ],
      fields: [{ name: "title", label: "Lot", type: "text", required: true }],
      records: makeRows("EXP", ["LOT-FIN-11", "LOT-ADH-03"], (i) => ({
        Expiry: `2026-0${8 + i}-15`,
      })),
    }),
    e({
      key: "forecast",
      label: "Forecast",
      plural: "Inventory forecasting",
      description: "Demand forecast presentation (models are server-owned).",
      analytics: true,
      columns: [
        { key: "title", label: "SKU" },
        { key: "status", label: "Horizon" },
        { key: "Forecast", label: "Forecast qty" },
      ],
      fields: [{ name: "title", label: "SKU", type: "text", required: true }],
      records: makeRows("FC", ["AFH-300", "AFH-304"], (i) => ({
        Forecast: 90 + i * 20,
      })),
    }),
    e({
      key: "analytics",
      label: "Analytics view",
      plural: "Inventory analytics",
      description: "Inventory analytics gallery.",
      analytics: true,
      columns: [
        { key: "title", label: "View" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "View", type: "text", required: true }],
      records: makeRows("IA", ["Fill rate", "Aging stock", "Transfer cycle"], (i) => ({
        Value: ["96%", "₨ 1.1M", "2.4d"][i]!,
      })),
    }),
  ],
};
