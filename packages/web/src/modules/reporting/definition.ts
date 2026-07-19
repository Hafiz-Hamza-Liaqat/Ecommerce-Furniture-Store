import type { EntityDef, FilterDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

const filters: FilterDef[] = [
  { key: "status", label: "Status", options: ["Ready", "Scheduled", "Draft", "Failed"] },
  { key: "domain", label: "Domain", options: ["Executive", "Sales", "Procurement", "Inventory", "Manufacturing", "Finance", "CRM", "Projects", "HR", "Service"] },
  { key: "format", label: "Format", options: ["PDF", "Excel", "CSV"] },
  { key: "date", label: "Date" },
];

function e(p: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...p };
}

export const REPORTING_MODULE: ModuleDefinition = {
  id: "reporting",
  title: "Reporting",
  lead: "Report definitions via Reporting Application CQRS — run executions through lifecycle; domain packs remain presentation chrome.",
  basePath: "/app/reporting",
  kpis: [
    { label: "Library reports", value: "Live", trend: 2.0, href: "library" },
    { label: "Scheduled", value: "19", trend: 1.0, href: "scheduled" },
    { label: "Exports (30d)", value: "340", trend: 4.0, href: "exports" },
    { label: "Shared", value: "28", trend: 0, href: "library" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "executive", label: "Executive", entityKey: "executive" },
    { to: "sales", label: "Sales", entityKey: "sales" },
    { to: "procurement", label: "Procurement", entityKey: "procurement" },
    { to: "inventory", label: "Inventory", entityKey: "inventory" },
    { to: "manufacturing", label: "Manufacturing", entityKey: "manufacturing" },
    { to: "finance", label: "Finance", entityKey: "finance" },
    { to: "crm", label: "CRM", entityKey: "crm" },
    { to: "projects", label: "Projects", entityKey: "projects" },
    { to: "hr", label: "HR", entityKey: "hr" },
    { to: "service", label: "Service", entityKey: "service" },
    { to: "exports", label: "Export UI", entityKey: "exports" },
    { to: "scheduled", label: "Scheduled reports", entityKey: "scheduled" },
    { to: "library", label: "Report library", entityKey: "library" },
  ],
  entities: [
    e({
      key: "executive",
      label: "Executive report",
      plural: "Executive reports",
      description: "Leadership report pack.",
      analytics: true,
      columns: [
        { key: "title", label: "Report" },
        { key: "status", label: "Status" },
        { key: "Period", label: "Period" },
      ],
      fields: [{ name: "title", label: "Report", type: "text", required: true }],
      records: makeRows("REX", ["Company scorecard", "Cash & growth", "Capacity outlook"], () => ({
        Period: "2026-07",
      })),
    }),
    e({
      key: "sales",
      label: "Sales report",
      plural: "Sales reports",
      description: "Sales reporting pack.",
      columns: [
        { key: "title", label: "Report" },
        { key: "status", label: "Status" },
        { key: "Period", label: "Period" },
      ],
      fields: [{ name: "title", label: "Report", type: "text", required: true }],
      records: makeRows("RSA", ["Bookings by region", "Win rate", "Quote aging"], () => ({
        Period: "2026-07",
      })),
    }),
    e({
      key: "procurement",
      label: "Procurement report",
      plural: "Procurement reports",
      description: "Procurement reporting pack.",
      columns: [
        { key: "title", label: "Report" },
        { key: "status", label: "Status" },
        { key: "Period", label: "Period" },
      ],
      fields: [{ name: "title", label: "Report", type: "text", required: true }],
      records: makeRows("RPR", ["Spend by category", "Supplier OTIF"], () => ({
        Period: "2026-07",
      })),
    }),
    e({
      key: "inventory",
      label: "Inventory report",
      plural: "Inventory reports",
      description: "Inventory reporting pack.",
      columns: [
        { key: "title", label: "Report" },
        { key: "status", label: "Status" },
        { key: "Period", label: "Period" },
      ],
      fields: [{ name: "title", label: "Report", type: "text", required: true }],
      records: makeRows("RIN", ["Valuation", "Aging stock", "Turns"], () => ({
        Period: "2026-07",
      })),
    }),
    e({
      key: "manufacturing",
      label: "Manufacturing report",
      plural: "Manufacturing reports",
      description: "Manufacturing reporting pack.",
      columns: [
        { key: "title", label: "Report" },
        { key: "status", label: "Status" },
        { key: "Period", label: "Period" },
      ],
      fields: [{ name: "title", label: "Report", type: "text", required: true }],
      records: makeRows("RMF", ["OEE", "Scrap", "Throughput"], () => ({
        Period: "2026-07",
      })),
    }),
    e({
      key: "finance",
      label: "Finance report",
      plural: "Finance reports",
      description: "Finance reporting pack.",
      columns: [
        { key: "title", label: "Report" },
        { key: "status", label: "Status" },
        { key: "Period", label: "Period" },
      ],
      fields: [{ name: "title", label: "Report", type: "text", required: true }],
      records: makeRows("RFI", ["P&L", "Balance sheet", "Cash flow"], () => ({
        Period: "2026-07",
      })),
    }),
    e({
      key: "crm",
      label: "CRM report",
      plural: "CRM reports",
      description: "CRM reporting pack.",
      columns: [
        { key: "title", label: "Report" },
        { key: "status", label: "Status" },
        { key: "Period", label: "Period" },
      ],
      fields: [{ name: "title", label: "Report", type: "text", required: true }],
      records: makeRows("RCR", ["Pipeline", "Conversion", "Campaign ROI"], () => ({
        Period: "2026-07",
      })),
    }),
    e({
      key: "projects",
      label: "Project report",
      plural: "Project reports",
      description: "Projects reporting pack.",
      columns: [
        { key: "title", label: "Report" },
        { key: "status", label: "Status" },
        { key: "Period", label: "Period" },
      ],
      fields: [{ name: "title", label: "Report", type: "text", required: true }],
      records: makeRows("RPJ", ["Portfolio health", "Budget variance"], () => ({
        Period: "2026-07",
      })),
    }),
    e({
      key: "hr",
      label: "HR report",
      plural: "HR reports",
      description: "HR reporting pack.",
      columns: [
        { key: "title", label: "Report" },
        { key: "status", label: "Status" },
        { key: "Period", label: "Period" },
      ],
      fields: [{ name: "title", label: "Report", type: "text", required: true }],
      records: makeRows("RHR", ["Headcount", "Attrition", "Leave"], () => ({
        Period: "2026-07",
      })),
    }),
    e({
      key: "service",
      label: "Service report",
      plural: "Service reports",
      description: "Service reporting pack.",
      columns: [
        { key: "title", label: "Report" },
        { key: "status", label: "Status" },
        { key: "Period", label: "Period" },
      ],
      fields: [{ name: "title", label: "Report", type: "text", required: true }],
      records: makeRows("RSV", ["SLA", "CSAT", "Workload"], () => ({
        Period: "2026-07",
      })),
    }),
    e({
      key: "exports",
      label: "Export job",
      plural: "Export UI",
      description: "Export jobs (PDF / Excel / CSV) — generation stays server-side.",
      columns: [
        { key: "title", label: "Export" },
        { key: "status", label: "Status" },
        { key: "Format", label: "Format" },
      ],
      fields: [
        { name: "title", label: "Export", type: "text", required: true },
        { name: "format", label: "Format", type: "select", options: ["PDF", "Excel", "CSV"] },
      ],
      records: makeRows("EXP", ["Sales bookings PDF", "Inventory CSV", "P&L Excel"], (i) => ({
        Format: ["PDF", "CSV", "Excel"][i]!,
      })),
    }),
    e({
      key: "scheduled",
      label: "Scheduled report",
      plural: "Scheduled reports",
      description: "Scheduled report deliveries.",
      columns: [
        { key: "title", label: "Schedule" },
        { key: "status", label: "Status" },
        { key: "Cadence", label: "Cadence" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "cadence", label: "Cadence", type: "select", options: ["Daily", "Weekly", "Monthly"] },
      ],
      records: makeRows("SCH", ["Monday exec pack", "Friday OTIF"], () => ({
        Cadence: "Weekly",
      })),
    }),
    e({
      key: "library",
      label: "Library item",
      plural: "Report library",
      description: "Shared report library.",
      columns: [
        { key: "title", label: "Report" },
        { key: "status", label: "Status" },
        { key: "Owner", label: "Owner" },
      ],
      fields: [
        { name: "title", label: "Report", type: "text", required: true },
        { name: "owner", label: "Owner", type: "text" },
      ],
      records: makeRows("LIB", ["Company scorecard", "Inventory aging", "SLA board"], (i) => ({
        Owner: ["Exec", "Ops", "Service"][i]!,
      })),
      api: {
        getQueryType: "reporting.GetReportDefinition",
        listQueryType: "reporting.ListReportDefinition",
        buildGetPayload: (companyId, id) => ({ companyId, reportDefinitionId: id }),
        mapEntity: (data) => {
          const wrapped = data as { reportDefinition?: Record<string, unknown> };
          const d = (wrapped.reportDefinition ?? data) as {
            id?: string;
            name?: string;
            code?: string;
            status?: string;
            ownerUserId?: string | null;
          };
          if (!d.id) return null;
          return row(d.id, d.name ?? d.code ?? d.id, d.status ?? "Ready", {
            Owner: d.ownerUserId ?? "—",
          }, { source: "api" });
        },
        lifecycleActions: [
          {
            id: "run",
            label: "Run report",
            commandType: "reporting.RunReport",
            tone: "primary",
            buildPayload: (companyId, reportDefinitionId) => ({
              companyId,
              reportDefinitionId,
            }),
          },
        ],
      },
    }),
  ],
};
