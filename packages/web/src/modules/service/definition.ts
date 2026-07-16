import type { EntityDef, FilterDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

const filters: FilterDef[] = [
  { key: "status", label: "Status", options: ["Open", "In progress", "Waiting", "Resolved", "Closed"] },
  { key: "priority", label: "Priority", options: ["Critical", "High", "Medium", "Low"] },
  { key: "technician", label: "Technician" },
  { key: "customer", label: "Customer" },
  { key: "sla", label: "SLA", options: ["On track", "At risk", "Breached"] },
  { key: "date", label: "Date" },
];

function e(p: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...p };
}

export const SERVICE_MODULE: ModuleDefinition = {
  id: "service",
  title: "Service",
  lead: "Tickets, work orders, and appointments via Service Application APIs.",
  basePath: "/app/service",
  summaryQueryType: "service.GetServiceSummary",
  buildSummaryPayload: (companyId) => ({ companyId }),
  kpis: [
    { label: "Open tickets", value: "29", trend: -4.0, href: "tickets" },
    { label: "Work orders", value: "18", trend: 2.1, href: "work-orders" },
    { label: "SLA at risk", value: "4", trend: 1.0, href: "sla" },
    { label: "Appointments today", value: "7", trend: 0, href: "appointments" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "tickets", label: "Tickets", entityKey: "tickets" },
    { to: "requests", label: "Service requests", entityKey: "requests" },
    { to: "work-orders", label: "Work orders", entityKey: "work-orders" },
    { to: "appointments", label: "Appointments", entityKey: "appointments" },
    { to: "scheduling", label: "Technician scheduling", entityKey: "scheduling" },
    { to: "history", label: "Customer history", entityKey: "history" },
    { to: "warranty", label: "Warranty", entityKey: "warranty" },
    { to: "maintenance", label: "Maintenance", entityKey: "maintenance" },
    { to: "repairs", label: "Repairs", entityKey: "repairs" },
    { to: "sla", label: "SLA dashboard", entityKey: "sla" },
    { to: "calendar", label: "Dispatch calendar" },
    { to: "pipeline", label: "Kanban" },
    { to: "analytics", label: "Analytics", entityKey: "analytics" },
  ],
  entities: [
    e({
      key: "tickets",
      label: "Ticket",
      plural: "Tickets",
      description: "Service tickets / requests inbox.",
      kanban: true,
      columns: [
        { key: "title", label: "Ticket", sortable: true },
        { key: "status", label: "Status" },
        { key: "Priority", label: "Priority" },
        { key: "Customer", label: "Customer" },
        { key: "SLA", label: "SLA" },
      ],
      fields: [
        { name: "number", label: "Number", type: "text", required: true },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "priority", label: "Priority", type: "select", options: ["low", "normal", "high", "urgent"] },
        { name: "description", label: "Description", type: "textarea" },
        { name: "customerId", label: "Customer ID", type: "text" },
      ],
      records: makeRows("TKT", ["Finish touch-up", "Hardware replace", "Warranty claim", "Install adjustment"], (i) => ({
        Priority: ["High", "Medium", "Critical", "Low"][i]!,
        Customer: ["Marina Hospitality", "Indus Group", "Cedar Club", "Horizon Hotels"][i]!,
        SLA: ["On track", "At risk", "On track", "Breached"][i]!,
      })),
      api: {
        createCommandType: "service.CreateServiceRequest",
        getQueryType: "service.GetServiceRequest",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          number: v.number,
          title: v.title,
          priority: v.priority || "normal",
          description: v.description || null,
          customerId: v.customerId || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, serviceRequestId: id }),
        extractCreateId: (data) => (data as { serviceRequestId?: string }).serviceRequestId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; title?: string; number?: string; status?: string; priority?: string };
          if (!d.id) return null;
          return row(d.id, d.title ?? d.number ?? d.id, d.status ?? "Open", { Priority: d.priority ?? "—" }, { source: "api" });
        },
      },
    }),
    e({
      key: "requests",
      label: "Service request",
      plural: "Service requests",
      description: "Formal service requests.",
      columns: [
        { key: "title", label: "Request" },
        { key: "status", label: "Status" },
        { key: "Customer", label: "Customer" },
        { key: "Priority", label: "Priority" },
      ],
      fields: [
        { name: "number", label: "Number", type: "text", required: true },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "priority", label: "Priority", type: "select", options: ["low", "normal", "high", "urgent"] },
      ],
      records: makeRows("SR", ["SR-441 site visit", "SR-448 finish", "SR-455 warranty"], (i) => ({
        Customer: ["Marina Hospitality", "Indus Group", "Cedar Club"][i]!,
        Priority: ["High", "Medium", "Low"][i]!,
      })),
      api: {
        createCommandType: "service.CreateServiceRequest",
        getQueryType: "service.GetServiceRequest",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          number: v.number,
          title: v.title,
          priority: v.priority || "normal",
        }),
        buildGetPayload: (companyId, id) => ({ companyId, serviceRequestId: id }),
        extractCreateId: (data) => (data as { serviceRequestId?: string }).serviceRequestId ?? null,
      },
    }),
    e({
      key: "work-orders",
      label: "Work order",
      plural: "Work orders",
      description: "Field and shop work orders.",
      columns: [
        { key: "title", label: "Work order" },
        { key: "status", label: "Status" },
        { key: "Technician", label: "Technician" },
        { key: "Type", label: "Type" },
      ],
      fields: [
        { name: "number", label: "Number", type: "text", required: true },
        { name: "serviceRequestId", label: "Service request ID", type: "text" },
        { name: "workTypeName", label: "Work type", type: "text" },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      records: makeRows("WO", ["WO-901 on-site", "WO-908 shop repair", "WO-915 install"], (i) => ({
        Technician: ["Imran", "Farah", "Yasir"][i]!,
        Type: ["Field", "Shop", "Install"][i]!,
      })),
      api: {
        createCommandType: "service.CreateWorkOrder",
        getQueryType: "service.GetWorkOrder",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          number: v.number,
          serviceRequestId: v.serviceRequestId || null,
          workTypeName: v.workTypeName || null,
          notes: v.notes || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, workOrderId: id }),
        extractCreateId: (data) => (data as { workOrderId?: string }).workOrderId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; number?: string; status?: string };
          if (!d.id) return null;
          return row(d.id, d.number ?? d.id, d.status ?? "Open", {}, { source: "api" });
        },
      },
    }),
    e({
      key: "appointments",
      label: "Appointment",
      plural: "Appointments",
      description: "Scheduled service appointments.",
      columns: [
        { key: "title", label: "Appointment" },
        { key: "status", label: "Status" },
        { key: "Start", label: "Start" },
        { key: "Technician", label: "Technician" },
      ],
      fields: [
        { name: "startAt", label: "Start (ISO)", type: "text", required: true, placeholder: "2026-07-16T09:00:00Z" },
        { name: "endAt", label: "End (ISO)", type: "text", required: true },
        { name: "serviceRequestId", label: "Service request ID", type: "text" },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      records: makeRows("APT", ["Site visit AM", "Install PM", "Warranty check"], (i) => ({
        Start: `2026-07-${16 + i} 09:00`,
        Technician: ["Imran", "Farah", "Yasir"][i]!,
      })),
      api: {
        createCommandType: "service.ScheduleAppointment",
        getQueryType: "service.GetAppointment",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          startAt: v.startAt,
          endAt: v.endAt,
          serviceRequestId: v.serviceRequestId || null,
          notes: v.notes || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, appointmentId: id }),
        extractCreateId: (data) => (data as { appointmentId?: string }).appointmentId ?? null,
      },
    }),
    e({
      key: "scheduling",
      label: "Schedule slot",
      plural: "Technician scheduling",
      description: "Technician capacity and assignments.",
      columns: [
        { key: "title", label: "Technician" },
        { key: "status", label: "Status" },
        { key: "Load", label: "Load" },
        { key: "Region", label: "Region" },
      ],
      fields: [
        { name: "title", label: "Technician", type: "text", required: true },
        { name: "region", label: "Region", type: "text" },
      ],
      records: makeRows("TECH", ["Imran", "Farah", "Yasir", "Noor"], (i) => ({
        Load: `${50 + i * 10}%`,
        Region: ["North", "South", "Central", "North"][i]!,
      })),
    }),
    e({
      key: "history",
      label: "History item",
      plural: "Customer history",
      description: "Service history by customer.",
      columns: [
        { key: "title", label: "Event" },
        { key: "status", label: "When" },
        { key: "Customer", label: "Customer" },
      ],
      fields: [{ name: "title", label: "Event", type: "text", required: true }],
      records: makeRows("SH", ["Install completed", "Warranty opened", "Repair closed"], (i) => ({
        Customer: ["Marina Hospitality", "Indus Group", "Cedar Club"][i]!,
      })),
      api: {
        getQueryType: "service.GetServiceHistory",
        buildGetPayload: (companyId, id) => ({ companyId, serviceHistoryId: id }),
      },
    }),
    e({
      key: "warranty",
      label: "Warranty",
      plural: "Warranty",
      description: "Warranty coverage records.",
      columns: [
        { key: "title", label: "Warranty" },
        { key: "status", label: "Status" },
        { key: "Expires", label: "Expires" },
        { key: "Customer", label: "Customer" },
      ],
      fields: [
        { name: "title", label: "Warranty", type: "text", required: true },
        { name: "expires", label: "Expires", type: "date" },
      ],
      records: makeRows("WRN", ["WRN-Sofa-01", "WRN-Table-04"], (i) => ({
        Expires: `2027-0${1 + i}-15`,
        Customer: ["Marina Hospitality", "Indus Group"][i]!,
      })),
    }),
    e({
      key: "maintenance",
      label: "Maintenance plan",
      plural: "Maintenance",
      description: "Preventive maintenance plans.",
      columns: [
        { key: "title", label: "Plan" },
        { key: "status", label: "Status" },
        { key: "Cadence", label: "Cadence" },
      ],
      fields: [
        { name: "title", label: "Plan", type: "text", required: true },
        { name: "cadence", label: "Cadence", type: "text" },
      ],
      records: makeRows("MNT", ["Quarterly hardware", "Annual finish"], (i) => ({
        Cadence: i ? "Annual" : "Quarterly",
      })),
    }),
    e({
      key: "repairs",
      label: "Repair",
      plural: "Repairs",
      description: "Repair jobs.",
      columns: [
        { key: "title", label: "Repair" },
        { key: "status", label: "Status" },
        { key: "Shop", label: "Location" },
      ],
      fields: [
        { name: "title", label: "Repair", type: "text", required: true },
        { name: "shop", label: "Location", type: "text" },
      ],
      records: makeRows("RPR", ["Frame crack", "Drawer glide"], (i) => ({
        Shop: i ? "Field" : "Factory shop",
      })),
    }),
    e({
      key: "sla",
      label: "SLA metric",
      plural: "SLA dashboard",
      description: "SLA performance presentation.",
      analytics: true,
      columns: [
        { key: "title", label: "Metric" },
        { key: "status", label: "Status" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "Metric", type: "text", required: true }],
      records: makeRows("SLA", ["First response", "Resolution", "Breaches"], (i) => ({
        Value: ["1.4h", "18h", "4"][i]!,
      })),
    }),
    e({
      key: "analytics",
      label: "Analytics view",
      plural: "Service analytics",
      description: "Service analytics gallery.",
      analytics: true,
      columns: [
        { key: "title", label: "View" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "View", type: "text", required: true }],
      records: makeRows("SAN", ["CSAT", "Repeat rate", "Tech utilization"], (i) => ({
        Value: ["4.6", "7%", "78%"][i]!,
      })),
    }),
  ],
};
