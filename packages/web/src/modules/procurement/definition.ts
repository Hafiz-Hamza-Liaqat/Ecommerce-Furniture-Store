import type { EntityDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

const filters = [
  { key: "supplier", label: "Supplier" },
  { key: "status", label: "Status", options: ["Draft", "Open", "Submitted", "Issued", "Closed", "Cancelled"] },
  { key: "warehouse", label: "Warehouse", options: ["Lahore DC", "Karachi DC", "Factory"] },
  { key: "date", label: "Date" },
  { key: "amount", label: "Amount" },
  { key: "branch", label: "Branch", options: ["Lahore HQ", "Karachi Showroom", "Factory"] },
  { key: "category", label: "Category", options: ["Timber", "Hardware", "Fabric", "Services"] },
];

function e(partial: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...partial };
}

const suppliers = makeRows(
  "SUP",
  ["Punjab Timber Co", "Coastal Hardware", "Loom & Weave", "FinishChem PK", "PackRight Logistics"],
  (i) => ({
    Category: ["Timber", "Hardware", "Fabric", "Services", "Services"][i % 5]!,
    Score: (78 + i).toString(),
    LeadTime: `${5 + i}d`,
    Branch: "Factory",
  }),
);

export const PROCUREMENT_MODULE: ModuleDefinition = {
  id: "procurement",
  title: "Procurement",
  lead: "Suppliers, requisitions, and purchase orders through Procurement Application APIs.",
  basePath: "/app/procurement",
  summaryQueryType: "procurement.GetProcurementSummary",
  buildSummaryPayload: (companyId) => ({ companyId }),
  kpis: [
    { label: "Open PRs", value: "28", trend: -2.0, href: "requests" },
    { label: "Open POs", value: "148", trend: 4.5, href: "orders" },
    { label: "Suppliers", value: "86", trend: 1.2, href: "suppliers" },
    { label: "On-time delivery", value: "92%", trend: 1.8, href: "analytics" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "suppliers", label: "Suppliers", entityKey: "suppliers" },
    { to: "requests", label: "Purchase requests", entityKey: "requests" },
    { to: "orders", label: "Purchase orders", entityKey: "orders" },
    { to: "rfqs", label: "RFQs", entityKey: "rfqs" },
    { to: "comparisons", label: "Vendor comparison", entityKey: "comparisons" },
    { to: "contracts", label: "Contracts", entityKey: "contracts" },
    { to: "bills", label: "Bills", entityKey: "bills" },
    { to: "payments", label: "Payments", entityKey: "payments" },
    { to: "scorecards", label: "Supplier scorecards", entityKey: "scorecards" },
    { to: "deliveries", label: "Delivery tracking", entityKey: "deliveries" },
    { to: "quality", label: "Quality tracking", entityKey: "quality" },
    { to: "history", label: "Vendor history", entityKey: "history" },
    { to: "approvals", label: "Approval tracking", entityKey: "approvals" },
    { to: "analytics", label: "Analytics", entityKey: "analytics" },
  ],
  entities: [
    e({
      key: "suppliers",
      label: "Supplier",
      plural: "Suppliers",
      description: "Vendor master and scorecard links.",
      columns: [
        { key: "title", label: "Supplier", sortable: true },
        { key: "status", label: "Status" },
        { key: "Category", label: "Category" },
        { key: "Score", label: "Score", sortable: true },
        { key: "LeadTime", label: "Lead time" },
      ],
      fields: [
        { name: "code", label: "Code", type: "text", required: true },
        { name: "name", label: "Supplier name", type: "text", required: true },
      ],
      records: suppliers,
      api: {
        createCommandType: "procurement.CreateSupplier",
        updateCommandType: "procurement.UpdateSupplier",
        getQueryType: "procurement.GetSupplier",
        listQueryType: "procurement.ListSupplier",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          name: v.name,
          code: v.code || `SUP-${Date.now()}`,
        }),
        buildUpdatePayload: (companyId, supplierId, v) => ({
          companyId,
          supplierId,
          name: v.name || null,
          code: v.code || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, supplierId: id }),
        extractCreateId: (data) => (data as { supplierId?: string }).supplierId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; name?: string; status?: string; code?: string };
          if (!d.id) return null;
          return row(d.id, d.name ?? d.id, d.status ?? "Active", { Code: d.code ?? "—" }, { source: "api" });
        },
      },
    }),
    e({
      key: "requests",
      label: "Purchase request",
      plural: "Purchase requests",
      description: "Internal purchase requisitions.",
      collaborationEntityType: "procurement.purchase_requisition",
      columns: [
        { key: "title", label: "PR", sortable: true },
        { key: "status", label: "Status" },
        { key: "Requester", label: "Requester" },
        { key: "Warehouse", label: "Warehouse" },
        { key: "amount", label: "Amount" },
      ],
      fields: [
        { name: "number", label: "PR number", type: "text", required: true },
        { name: "lineDescription", label: "Line description", type: "text", required: true },
        { name: "quantity", label: "Quantity", type: "number", required: true },
      ],
      records: makeRows("PR", ["PR-1041", "PR-1048", "PR-1055", "PR-1060"], (i) => ({
        Requester: ["Ops", "Factory", "Showroom"][i % 3]!,
        Warehouse: ["Lahore DC", "Factory"][i % 2]!,
        Category: ["Hardware", "Timber", "Fabric"][i % 3]!,
      })),
      api: {
        createCommandType: "procurement.CreatePurchaseRequisition",
        getQueryType: "procurement.GetPurchaseRequisition",
        listQueryType: "procurement.ListPurchaseRequisition",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          number: v.number,
          lines: [{ description: v.lineDescription || "Item", quantity: Number(v.quantity || 1) }],
        }),
        buildGetPayload: (companyId, id) => ({ companyId, requisitionId: id, includeLines: true }),
        extractCreateId: (data) => (data as { requisitionId?: string }).requisitionId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; number?: string; status?: string };
          if (!d.id) return null;
          return row(d.id, d.number ?? d.id, d.status ?? "Draft", {}, { source: "api" });
        },
        lifecycleActions: [
          {
            id: "submit",
            label: "Submit requisition",
            commandType: "procurement.SubmitPurchaseRequisition",
            buildPayload: (companyId, requisitionId) => ({
              companyId,
              requisitionId,
              requireApproval: true,
            }),
          },
        ],
      },
    }),
    e({
      key: "orders",
      label: "Purchase order",
      plural: "Purchase orders",
      description: "Issued and draft purchase orders.",
      collaborationEntityType: "procurement.purchase_order",
      columns: [
        { key: "title", label: "PO", sortable: true },
        { key: "status", label: "Status" },
        { key: "Supplier", label: "Supplier" },
        { key: "amount", label: "Amount" },
        { key: "Warehouse", label: "Warehouse" },
      ],
      fields: [
        { name: "number", label: "PO number", type: "text", required: true },
        { name: "supplierId", label: "Supplier ID", type: "text", required: true },
        { name: "currencyCode", label: "Currency", type: "text", required: true },
        { name: "lineDescription", label: "Line description", type: "text", required: true },
        { name: "quantity", label: "Quantity", type: "number", required: true },
      ],
      records: makeRows("PO", ["PO-10482", "PO-10501", "PO-10518", "PO-10530"], (i) => ({
        Supplier: suppliers[i % suppliers.length]!.title,
        Warehouse: "Factory",
        Category: "Timber",
      })),
      api: {
        createCommandType: "procurement.CreatePurchaseOrder",
        getQueryType: "procurement.GetPurchaseOrder",
        listQueryType: "procurement.ListPurchaseOrder",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          number: v.number,
          supplierId: v.supplierId,
          currencyCode: v.currencyCode || "PKR",
          lines: [{ description: v.lineDescription || "Item", quantity: Number(v.quantity || 1) }],
        }),
        buildGetPayload: (companyId, id) => ({ companyId, purchaseOrderId: id, includeLines: true }),
        extractCreateId: (data) => (data as { purchaseOrderId?: string }).purchaseOrderId ?? null,
        mapEntity: (data) => {
          const wrap = data as { purchaseOrder?: { id?: string; number?: string; status?: string } };
          const po = wrap.purchaseOrder ?? (data as { id?: string; number?: string; status?: string });
          if (!po.id) return null;
          return row(po.id, po.number ?? po.id, po.status ?? "Draft", {}, { source: "api" });
        },
        lifecycleActions: [
          {
            id: "issue",
            label: "Issue PO",
            commandType: "procurement.IssuePurchaseOrder",
            buildPayload: (companyId, purchaseOrderId) => ({
              companyId,
              purchaseOrderId,
              requireApproval: true,
            }),
          },
          {
            id: "cancel",
            label: "Cancel PO",
            commandType: "procurement.CancelPurchaseOrder",
            tone: "danger",
            buildPayload: (companyId, purchaseOrderId) => ({
              companyId,
              purchaseOrderId,
              reason: "Cancelled from operator console",
              requireApproval: true,
            }),
          },
        ],
      },
    }),
    e({
      key: "rfqs",
      label: "RFQ",
      plural: "RFQs",
      description: "Request for quotation events.",
      columns: [
        { key: "title", label: "RFQ" },
        { key: "status", label: "Status" },
        { key: "Category", label: "Category" },
        { key: "Bids", label: "Bids" },
      ],
      fields: [
        { name: "title", label: "RFQ title", type: "text", required: true },
        { name: "category", label: "Category", type: "select", options: ["Timber", "Hardware", "Fabric", "Services"] },
      ],
      records: makeRows("RFQ", ["Oak panels Q3", "Hardware pack", "Upholstery foam"], (i) => ({
        Category: ["Timber", "Hardware", "Fabric"][i % 3]!,
        Bids: 2 + i,
      })),
    }),
    e({
      key: "comparisons",
      label: "Vendor comparison",
      plural: "Vendor comparisons",
      description: "Side-by-side bid comparison worksheets.",
      columns: [
        { key: "title", label: "Comparison" },
        { key: "status", label: "Status" },
        { key: "Winner", label: "Preferred" },
        { key: "amount", label: "Best bid" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "winner", label: "Preferred supplier", type: "text" },
      ],
      records: makeRows("VC", ["Oak panels matrix", "Foam bid sheet"], (i) => ({
        Winner: suppliers[i % suppliers.length]!.title,
      })),
    }),
    e({
      key: "contracts",
      label: "Contract",
      plural: "Contracts",
      description: "Supplier framework agreements.",
      columns: [
        { key: "title", label: "Contract" },
        { key: "status", label: "Status" },
        { key: "Supplier", label: "Supplier" },
        { key: "Expires", label: "Expires" },
      ],
      fields: [
        { name: "title", label: "Contract ref", type: "text", required: true },
        { name: "supplier", label: "Supplier", type: "text" },
      ],
      records: makeRows("CTR", ["CTR-Timber-26", "CTR-Hardware-26"], (i) => ({
        Supplier: suppliers[i % suppliers.length]!.title,
        Expires: "2026-12-31",
      })),
    }),
    e({
      key: "bills",
      label: "Bill",
      plural: "Bills",
      description: "Supplier bills awaiting payment.",
      columns: [
        { key: "title", label: "Bill" },
        { key: "status", label: "Status" },
        { key: "Supplier", label: "Supplier" },
        { key: "amount", label: "Amount" },
      ],
      fields: [
        { name: "title", label: "Bill number", type: "text", required: true },
        { name: "amount", label: "Amount", type: "currency" },
      ],
      records: makeRows("BILL", ["BILL-2201", "BILL-2210", "BILL-2218"], (i) => ({
        Supplier: suppliers[i % suppliers.length]!.title,
      })),
    }),
    e({
      key: "payments",
      label: "Payment",
      plural: "Payments",
      description: "Outbound supplier payments.",
      columns: [
        { key: "title", label: "Payment" },
        { key: "status", label: "Status" },
        { key: "Supplier", label: "Supplier" },
        { key: "amount", label: "Amount" },
      ],
      fields: [
        { name: "title", label: "Payment ref", type: "text", required: true },
        { name: "amount", label: "Amount", type: "currency" },
      ],
      records: makeRows("PAY-P", ["PAY-4401", "PAY-4412"], (i) => ({
        Supplier: suppliers[i % suppliers.length]!.title,
        Method: "Bank transfer",
      })),
    }),
    e({
      key: "scorecards",
      label: "Scorecard",
      plural: "Supplier scorecards",
      description: "Quality, delivery, and cost scores.",
      columns: [
        { key: "title", label: "Supplier" },
        { key: "status", label: "Period" },
        { key: "Quality", label: "Quality" },
        { key: "Delivery", label: "Delivery" },
        { key: "Cost", label: "Cost" },
      ],
      fields: [{ name: "title", label: "Supplier", type: "text", required: true }],
      records: suppliers.map((s, i) =>
        row(`SC-${i}`, s.title, "2026 Q2", {
          Quality: 80 + i,
          Delivery: 85 + (i % 5),
          Cost: 75 + i,
        }),
      ),
    }),
    e({
      key: "deliveries",
      label: "Delivery",
      plural: "Deliveries",
      description: "Inbound delivery tracking against POs.",
      columns: [
        { key: "title", label: "ASN" },
        { key: "status", label: "Status" },
        { key: "PO", label: "PO" },
        { key: "ETA", label: "ETA" },
      ],
      fields: [
        { name: "title", label: "ASN / delivery", type: "text", required: true },
        { name: "eta", label: "ETA", type: "date" },
      ],
      records: makeRows("ASN", ["ASN-901", "ASN-914", "ASN-922"], (i) => ({
        PO: `PO-10${482 + i}`,
        ETA: `2026-07-${12 + i}`,
        Warehouse: "Factory",
      })),
    }),
    e({
      key: "quality",
      label: "Quality record",
      plural: "Quality tracking",
      description: "Incoming inspection and NCRs.",
      columns: [
        { key: "title", label: "NCR / IQC" },
        { key: "status", label: "Status" },
        { key: "Supplier", label: "Supplier" },
        { key: "Result", label: "Result" },
      ],
      fields: [
        { name: "title", label: "Record", type: "text", required: true },
        { name: "result", label: "Result", type: "select", options: ["Pass", "Fail", "Conditional"] },
      ],
      records: makeRows("IQC", ["IQC-301", "IQC-308"], (i) => ({
        Supplier: suppliers[i % suppliers.length]!.title,
        Result: i ? "Conditional" : "Pass",
      })),
    }),
    e({
      key: "history",
      label: "Vendor history",
      plural: "Vendor history",
      description: "Historical PO and performance events.",
      columns: [
        { key: "title", label: "Event" },
        { key: "status", label: "When" },
        { key: "Supplier", label: "Supplier" },
      ],
      fields: [{ name: "title", label: "Event", type: "text", required: true }],
      records: makeRows("VH", ["PO issued", "Delivery accepted", "Scorecard published"], (i) => ({
        Supplier: suppliers[i % suppliers.length]!.title,
      })),
    }),
    e({
      key: "approvals",
      label: "Approval",
      plural: "Approval tracking",
      description: "Procurement approvals awaiting decision.",
      columns: [
        { key: "title", label: "Item" },
        { key: "status", label: "Status" },
        { key: "Owner", label: "Owner" },
        { key: "Due", label: "Due" },
      ],
      fields: [
        { name: "title", label: "Subject", type: "text", required: true },
        { name: "owner", label: "Owner", type: "text" },
      ],
      records: makeRows("PAP", ["PR-1055 submit", "PO-10518 issue", "Capex cancel"], (i) => ({
        Owner: ["Finance", "Ops", "CFO"][i % 3]!,
        Due: ["Today", "Tomorrow", "Fri"][i % 3]!,
      })),
    }),
    e({
      key: "analytics",
      label: "Analytics view",
      plural: "Procurement analytics",
      description: "Spend and supplier analytics presentation.",
      analytics: true,
      columns: [
        { key: "title", label: "View" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "View name", type: "text", required: true }],
      records: makeRows("PA", ["Spend by category", "OTIF by supplier", "PR cycle time"], (i) => ({
        Value: ["₨ 12.4M", "92%", "4.2d"][i % 3]!,
      })),
    }),
  ],
};
