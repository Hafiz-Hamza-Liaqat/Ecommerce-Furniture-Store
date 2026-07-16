import type { EntityDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

const commonFilters = [
  { key: "status", label: "Status", options: ["Draft", "Open", "In progress", "Approved", "Issued", "Closed"] },
  { key: "branch", label: "Branch", options: ["Lahore HQ", "Karachi Showroom", "Factory"] },
  { key: "region", label: "Region", options: ["North", "South", "Central", "Export"] },
  { key: "date", label: "Date" },
  { key: "priority", label: "Priority", options: ["High", "Medium", "Low"] },
  { key: "tags", label: "Tags" },
];

const salesFilters = [
  ...commonFilters,
  { key: "customer", label: "Customer" },
  { key: "salesperson", label: "Salesperson" },
  { key: "product", label: "Product" },
  { key: "category", label: "Category", options: ["Seating", "Tables", "Storage", "Systems"] },
  { key: "revenue", label: "Revenue" },
];

function entity(
  partial: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] },
): EntityDef {
  return { filters: salesFilters, ...partial };
}

const customers = makeRows(
  "CUS",
  ["Indus Group", "Marina Hospitality", "Cedar Club", "Horizon Hotels", "Northline Capital", "Studio Kite"],
  (i) => ({
    Customer: `CUS-${1000 + i}`,
    Segment: i % 2 ? "Enterprise" : "Hospitality",
    Salesperson: i % 2 ? "A. Khan" : "S. Malik",
    Branch: i % 2 ? "Lahore HQ" : "Karachi Showroom",
    Region: i % 2 ? "North" : "South",
    Revenue: `₨ ${(2_400_000 + i * 350_000).toLocaleString()}`,
  }),
);

const opportunities = makeRows(
  "OPP",
  [
    "Marina lobby refresh",
    "Indus HQ phase 2",
    "Cedar dining program",
    "Horizon guest rooms",
    "Northline board suite",
  ],
  (i) => ({
    Customer: customers[i % customers.length]!.title,
    Stage: ["Lead", "Qualified", "Proposal", "Negotiation", "Won"][i % 5]!,
    Salesperson: i % 2 ? "A. Khan" : "S. Malik",
    Probability: `${40 + i * 10}%`,
    Priority: ["High", "Medium", "Low"][i % 3]!,
  }),
);

const quotes = makeRows(
  "Q",
  ["Q-22901 Marina", "Q-22910 Indus", "Q-22918 Cedar", "Q-22922 Horizon"],
  (i) => ({
    Customer: customers[i % customers.length]!.title,
    Validity: "30 days",
    Salesperson: "A. Khan",
    Product: "Atelier seating",
    Category: "Seating",
  }),
);

const orders = makeRows(
  "SO",
  ["SO-31001", "SO-31014", "SO-31022", "SO-31031", "SO-31040"],
  (i) => ({
    Customer: customers[i % customers.length]!.title,
    Warehouse: "Lahore DC",
    Salesperson: "S. Malik",
    ShipBy: `2026-0${(i % 6) + 1}-15`,
  }),
);

export const SALES_MODULE: ModuleDefinition = {
  id: "sales",
  title: "Sales",
  lead: "Opportunities through fulfillment — commands and queries via Sales Application; pricing and credit stay server-side.",
  basePath: "/app/sales",
  kpis: [
    { label: "Pipeline", value: "₨ 18.4M", trend: 6.2, href: "opportunities" },
    { label: "Open quotes", value: "42", trend: 3.1, href: "quotations" },
    { label: "Sales orders", value: "312", trend: 8.0, href: "orders" },
    { label: "Win rate", value: "34%", trend: 1.4, href: "analytics" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "customers", label: "Customers", entityKey: "customers" },
    { to: "opportunities", label: "Opportunities", entityKey: "opportunities" },
    { to: "pipeline", label: "Kanban pipeline", entityKey: "opportunities" },
    { to: "quotations", label: "Quotations", entityKey: "quotations" },
    { to: "orders", label: "Sales orders", entityKey: "orders" },
    { to: "shipments", label: "Shipments", entityKey: "shipments" },
    { to: "invoices", label: "Invoices", entityKey: "invoices" },
    { to: "returns", label: "Returns", entityKey: "returns" },
    { to: "discounts", label: "Discounts", entityKey: "discounts" },
    { to: "price-lists", label: "Price lists", entityKey: "price-lists" },
    { to: "territories", label: "Territories", entityKey: "territories" },
    { to: "teams", label: "Sales teams", entityKey: "teams" },
    { to: "reps", label: "Sales representatives", entityKey: "reps" },
    { to: "catalog", label: "Product catalog", entityKey: "catalog" },
    { to: "analytics", label: "Analytics", entityKey: "analytics" },
  ],
  entities: [
    entity({
      key: "customers",
      label: "Customer",
      plural: "Customers",
      description: "Customer profiles, revenue, and timeline.",
      columns: [
        { key: "title", label: "Customer", sortable: true },
        { key: "status", label: "Status", sortable: true },
        { key: "Segment", label: "Segment" },
        { key: "Salesperson", label: "Salesperson" },
        { key: "Revenue", label: "Revenue", sortable: true },
      ],
      fields: [
        { name: "title", label: "Customer name", type: "text", required: true },
        { name: "segment", label: "Segment", type: "select", options: ["Enterprise", "Hospitality", "Residential"] },
        { name: "salesperson", label: "Salesperson", type: "text" },
        { name: "branch", label: "Branch", type: "select", options: ["Lahore HQ", "Karachi Showroom", "Factory"] },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      records: customers,
    }),
    entity({
      key: "opportunities",
      label: "Opportunity",
      plural: "Opportunities",
      description: "Pipeline opportunities with stage tracking.",
      kanban: true,
      columns: [
        { key: "title", label: "Opportunity", sortable: true },
        { key: "status", label: "Status" },
        { key: "Customer", label: "Customer" },
        { key: "Stage", label: "Stage", sortable: true },
        { key: "amount", label: "Value" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "source", label: "Source", type: "select", options: ["inbound", "outbound", "partner", "referral"] },
        { name: "customerId", label: "Customer ID", type: "text" },
        { name: "currencyCode", label: "Currency", type: "text", placeholder: "PKR" },
        { name: "estimatedValueRef", label: "Value ref", type: "text" },
      ],
      records: opportunities,
      api: {
        createCommandType: "sales.CreateOpportunity",
        getQueryType: "sales.GetOpportunity",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          title: v.title,
          source: v.source || "inbound",
          customerId: v.customerId || null,
          currencyCode: v.currencyCode || "PKR",
          estimatedValueRef: v.estimatedValueRef || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, opportunityId: id }),
        extractCreateId: (data) => {
          const d = data as { opportunityId?: string };
          return d.opportunityId ?? null;
        },
        mapEntity: (data) => {
          const d = data as {
            id?: string;
            title?: string;
            status?: string;
            source?: string;
            currencyCode?: string;
          };
          if (!d.id) return null;
          return row(d.id, d.title ?? d.id, d.status ?? "Open", {
            Source: d.source ?? "—",
            Currency: d.currencyCode ?? "PKR",
          }, { source: "api" });
        },
      },
    }),
    entity({
      key: "quotations",
      label: "Quotation",
      plural: "Quotations",
      description: "Customer quotations and revisions.",
      columns: [
        { key: "title", label: "Quote", sortable: true },
        { key: "status", label: "Status" },
        { key: "Customer", label: "Customer" },
        { key: "amount", label: "Amount" },
        { key: "Validity", label: "Validity" },
      ],
      fields: [
        { name: "number", label: "Quote number", type: "text", required: true },
        { name: "currencyCode", label: "Currency", type: "text", required: true, placeholder: "PKR" },
        { name: "customerId", label: "Customer ID", type: "text" },
        { name: "lineDescription", label: "Line description", type: "text", required: true },
        { name: "quantity", label: "Quantity", type: "number", required: true },
      ],
      records: quotes,
      api: {
        createCommandType: "sales.CreateQuote",
        getQueryType: "sales.GetQuote",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          number: v.number,
          currencyCode: v.currencyCode || "PKR",
          customerId: v.customerId || null,
          lines: [
            {
              description: v.lineDescription || "Line item",
              quantity: Number(v.quantity || 1),
            },
          ],
        }),
        buildGetPayload: (companyId, id) => ({ companyId, quoteId: id, includeLines: true }),
        extractCreateId: (data) => {
          const d = data as { quoteId?: string };
          return d.quoteId ?? null;
        },
        mapEntity: (data) => {
          const wrap = data as { quote?: { id?: string; number?: string; status?: string; currencyCode?: string } };
          const q = wrap.quote ?? (data as { id?: string; number?: string; status?: string; currencyCode?: string });
          if (!q.id) return null;
          return row(q.id, q.number ?? q.id, q.status ?? "Draft", {
            Currency: q.currencyCode ?? "PKR",
          }, { source: "api" });
        },
      },
    }),
    entity({
      key: "orders",
      label: "Sales order",
      plural: "Sales orders",
      description: "Confirmed sales orders and fulfillment links.",
      columns: [
        { key: "title", label: "Order", sortable: true },
        { key: "status", label: "Status" },
        { key: "Customer", label: "Customer" },
        { key: "amount", label: "Amount" },
        { key: "ShipBy", label: "Ship by" },
      ],
      fields: [
        { name: "number", label: "Order number", type: "text", required: true },
        { name: "currencyCode", label: "Currency", type: "text", required: true },
        { name: "customerId", label: "Customer ID", type: "text" },
        { name: "lineDescription", label: "Line description", type: "text", required: true },
        { name: "quantity", label: "Quantity", type: "number", required: true },
      ],
      records: orders,
      api: {
        createCommandType: "sales.CreateSalesOrder",
        getQueryType: "sales.GetSalesOrder",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          number: v.number,
          currencyCode: v.currencyCode || "PKR",
          customerId: v.customerId || null,
          lines: [
            {
              description: v.lineDescription || "Line item",
              quantity: Number(v.quantity || 1),
            },
          ],
        }),
        buildGetPayload: (companyId, id) => ({ companyId, salesOrderId: id, includeLines: true }),
        extractCreateId: (data) => {
          const d = data as { salesOrderId?: string };
          return d.salesOrderId ?? null;
        },
        mapEntity: (data) => {
          const wrap = data as { order?: { id?: string; number?: string; status?: string } };
          const o = wrap.order ?? (data as { id?: string; number?: string; status?: string });
          if (!o.id) return null;
          return row(o.id, o.number ?? o.id, o.status ?? "Open", {}, { source: "api" });
        },
      },
    }),
    entity({
      key: "shipments",
      label: "Shipment",
      plural: "Shipments",
      description: "Outbound shipments linked to sales orders.",
      columns: [
        { key: "title", label: "Shipment" },
        { key: "status", label: "Status" },
        { key: "Carrier", label: "Carrier" },
        { key: "ETA", label: "ETA" },
      ],
      fields: [
        { name: "title", label: "Shipment ref", type: "text", required: true },
        { name: "carrier", label: "Carrier", type: "text" },
        { name: "eta", label: "ETA", type: "date" },
      ],
      records: makeRows("SHP", ["SHP-8801", "SHP-8812", "SHP-8820"], (i) => ({
        Carrier: i % 2 ? "TCS" : "Leopards",
        ETA: `2026-07-${10 + i}`,
        Order: orders[i % orders.length]!.title,
      })),
    }),
    entity({
      key: "invoices",
      label: "Sales invoice",
      plural: "Invoices",
      description: "Customer invoices originating from sales orders.",
      columns: [
        { key: "title", label: "Invoice" },
        { key: "status", label: "Status" },
        { key: "Customer", label: "Customer" },
        { key: "amount", label: "Amount" },
      ],
      fields: [
        { name: "title", label: "Invoice number", type: "text", required: true },
        { name: "customer", label: "Customer", type: "text" },
        { name: "amount", label: "Amount", type: "currency" },
      ],
      records: makeRows("INV-S", ["INV-S-501", "INV-S-518", "INV-S-530"], (i) => ({
        Customer: customers[i % customers.length]!.title,
        Due: `2026-08-${5 + i}`,
      })),
    }),
    entity({
      key: "returns",
      label: "Return",
      plural: "Returns",
      description: "RMA and sales returns.",
      columns: [
        { key: "title", label: "RMA" },
        { key: "status", label: "Status" },
        { key: "Reason", label: "Reason" },
        { key: "amount", label: "Credit" },
      ],
      fields: [
        { name: "title", label: "RMA number", type: "text", required: true },
        { name: "reason", label: "Reason", type: "textarea" },
      ],
      records: makeRows("RMA", ["RMA-12", "RMA-18"], (i) => ({
        Reason: i ? "Finish mismatch" : "Transit damage",
      })),
    }),
    entity({
      key: "discounts",
      label: "Discount",
      plural: "Discounts",
      description: "Discount programs (eligibility evaluated by Rules on the server).",
      columns: [
        { key: "title", label: "Program" },
        { key: "status", label: "Status" },
        { key: "Type", label: "Type" },
        { key: "Cap", label: "Cap" },
      ],
      fields: [
        { name: "title", label: "Program name", type: "text", required: true },
        { name: "type", label: "Type", type: "select", options: ["Percent", "Fixed", "Volume"] },
      ],
      records: makeRows("DSC", ["Hospitality 8%", "Volume seating", "Project deposit"], (i) => ({
        Type: ["Percent", "Volume", "Fixed"][i % 3]!,
        Cap: `${8 + i}%`,
      })),
    }),
    entity({
      key: "price-lists",
      label: "Price list",
      plural: "Price lists",
      description: "Published price lists — amounts from backend pricing.",
      columns: [
        { key: "title", label: "List" },
        { key: "status", label: "Status" },
        { key: "Currency", label: "Currency" },
        { key: "Effective", label: "Effective" },
      ],
      fields: [
        { name: "title", label: "List name", type: "text", required: true },
        { name: "currency", label: "Currency", type: "text" },
      ],
      records: makeRows("PL", ["Standard PKR", "Hospitality 2026", "Export USD"], (i) => ({
        Currency: i === 2 ? "USD" : "PKR",
        Effective: "2026-01-01",
      })),
    }),
    entity({
      key: "territories",
      label: "Territory",
      plural: "Territories",
      description: "Sales territories and coverage.",
      columns: [
        { key: "title", label: "Territory" },
        { key: "status", label: "Status" },
        { key: "Region", label: "Region" },
        { key: "Owner", label: "Owner" },
      ],
      fields: [
        { name: "title", label: "Territory", type: "text", required: true },
        { name: "region", label: "Region", type: "select", options: ["North", "South", "Central", "Export"] },
      ],
      records: makeRows("TER", ["Punjab North", "Sindh Coastal", "Export GCC"], (i) => ({
        Region: ["North", "South", "Export"][i % 3]!,
        Owner: i % 2 ? "A. Khan" : "S. Malik",
      })),
    }),
    entity({
      key: "teams",
      label: "Sales team",
      plural: "Sales teams",
      description: "Team structures for quota and coverage.",
      columns: [
        { key: "title", label: "Team" },
        { key: "status", label: "Status" },
        { key: "Lead", label: "Lead" },
        { key: "Members", label: "Members" },
      ],
      fields: [
        { name: "title", label: "Team name", type: "text", required: true },
        { name: "lead", label: "Lead", type: "text" },
      ],
      records: makeRows("STM", ["Enterprise Desk", "Hospitality Desk", "Projects Desk"], (i) => ({
        Lead: ["Nadia F.", "Hassan A.", "Maya C."][i % 3]!,
        Members: 4 + i,
      })),
    }),
    entity({
      key: "reps",
      label: "Sales representative",
      plural: "Sales representatives",
      description: "Individual sales representatives.",
      columns: [
        { key: "title", label: "Rep" },
        { key: "status", label: "Status" },
        { key: "Team", label: "Team" },
        { key: "Quota", label: "Quota" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "team", label: "Team", type: "text" },
      ],
      records: makeRows("REP", ["Ayesha Khan", "Sami Malik", "Omar Rizvi", "Hina Qureshi"], (i) => ({
        Team: ["Enterprise Desk", "Hospitality Desk"][i % 2]!,
        Quota: `₨ ${(4_000_000 + i * 500_000).toLocaleString()}`,
      })),
    }),
    entity({
      key: "catalog",
      label: "Catalog product",
      plural: "Product catalog",
      description: "Sellable catalogue items for quoting.",
      columns: [
        { key: "title", label: "Product" },
        { key: "status", label: "Status" },
        { key: "Category", label: "Category" },
        { key: "SKU", label: "SKU" },
      ],
      fields: [
        { name: "title", label: "Product name", type: "text", required: true },
        { name: "category", label: "Category", type: "select", options: ["Seating", "Tables", "Storage", "Systems"] },
        { name: "sku", label: "SKU", type: "text" },
      ],
      records: makeRows("CAT", ["Meridian Sofa", "Harbor Dining Table", "Atelier Lounge", "Studio Credenza"], (i) => ({
        Category: ["Seating", "Tables", "Seating", "Storage"][i % 4]!,
        SKU: `AFH-${200 + i}`,
      })),
    }),
    entity({
      key: "analytics",
      label: "Analytics view",
      plural: "Analytics",
      description: "Sales analytics presentation over Reporting snapshots.",
      analytics: true,
      columns: [
        { key: "title", label: "Metric" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "Saved view", type: "text", required: true }],
      records: makeRows("AN", ["Revenue by region", "Win rate by rep", "Quote conversion"], (i) => ({
        Value: ["₨ 48.2M", "34%", "28%"][i % 3]!,
      })),
    }),
  ],
};
