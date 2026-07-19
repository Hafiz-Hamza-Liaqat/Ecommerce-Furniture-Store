import type { EntityDef, FilterDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

function mapModuleToIndex(module: string): string {
  const key = module.trim().toLowerCase();
  if (key.includes("inventory") || key === "inventory.items") return "inventory.items";
  if (key.includes("procurement") || key.includes("supplier")) return "procurement.suppliers";
  if (key.includes("project")) return "projects.projects";
  return "crm.leads";
}

const filters: FilterDef[] = [
  { key: "type", label: "Type", options: ["Module", "Record", "Document", "Person", "Report"] },
  { key: "module", label: "Module", options: ["Sales", "Inventory", "Finance", "Projects", "CRM", "HR"] },
  { key: "date", label: "Date" },
  { key: "status", label: "Status", options: ["Open", "Closed", "Draft"] },
];

function e(p: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...p };
}

export const SEARCH_MODULE: ModuleDefinition = {
  id: "search",
  title: "Enterprise Search",
  lead: "Global search via Search Application CQRS (bounded index allow-list). Use the query box on Results.",
  basePath: "/app/search",
  kpis: [
    { label: "Indexed docs", value: "Live", trend: 3.0, href: "results" },
    { label: "Saved searches", value: "24", trend: 1.0, href: "saved" },
    { label: "Recent", value: "12", trend: 0, href: "recent" },
    { label: "Suggestions", value: "On", trend: 0, href: "suggestions" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "results", label: "Global search", entityKey: "results" },
    { to: "advanced", label: "Advanced search", entityKey: "advanced" },
    { to: "saved", label: "Saved searches", entityKey: "saved" },
    { to: "recent", label: "Recent searches", entityKey: "recent" },
    { to: "facets", label: "Faceted filters", entityKey: "facets" },
    { to: "suggestions", label: "Suggestions", entityKey: "suggestions" },
    { to: "workspace", label: "Results workspace", entityKey: "workspace" },
  ],
  entities: [
    e({
      key: "results",
      label: "Result",
      plural: "Global search",
      description: "Search result hits across modules.",
      columns: [
        { key: "title", label: "Result" },
        { key: "status", label: "Type" },
        { key: "Module", label: "Module" },
        { key: "Score", label: "Score" },
      ],
      fields: [
        { name: "title", label: "Query / title", type: "text", required: true },
        {
          name: "indexCode",
          label: "Index",
          type: "select",
          options: ["inventory.items", "crm.leads", "procurement.suppliers", "projects.projects"],
        },
      ],
      records: makeRows("SR", ["SO-31001", "Indus HQ fit-out", "Meridian Sofa frame", "INV-9001", "Sara Ahmed"], (i) => ({
        Module: ["Sales", "Projects", "Inventory", "Finance", "CRM"][i]!,
        Score: 0.92 - i * 0.05,
      })),
      api: {
        listQueryType: "search.SearchQuery",
        buildListPayload: (companyId, args) => ({
          companyId,
          indexCode: args.filters.module
            ? mapModuleToIndex(args.filters.module)
            : "crm.leads",
          queryText: args.q?.trim() || null,
          page: { page: args.page, pageSize: args.pageSize },
        }),
        mapListEntity: (data) => {
          const d = data as {
            documentId?: string;
            entityType?: string;
            entityId?: string;
            score?: number | null;
            fields?: Record<string, unknown>;
          };
          const id = d.documentId ?? d.entityId;
          if (!id) return null;
          const title =
            (typeof d.fields?.title === "string" && d.fields.title) ||
            (typeof d.fields?.name === "string" && d.fields.name) ||
            d.entityId ||
            id;
          return row(id, title, d.entityType ?? "hit", {
            Module: d.entityType ?? "—",
            Score: d.score ?? "—",
          }, { source: "api" });
        },
        mapEntity: (data) => {
          const d = data as { documentId?: string; entityType?: string; entityId?: string; score?: number | null };
          const id = d.documentId ?? d.entityId;
          if (!id) return null;
          return row(id, d.entityId ?? id, d.entityType ?? "hit", { Score: d.score ?? "—" }, { source: "api" });
        },
      },
    }),
    e({
      key: "advanced",
      label: "Advanced query",
      plural: "Advanced search",
      description: "Saved advanced query definitions.",
      columns: [
        { key: "title", label: "Query" },
        { key: "status", label: "Status" },
        { key: "Filters", label: "Filters" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "filters", label: "Filters", type: "textarea" },
      ],
      records: makeRows("ADV", ["Open SO this month", "Low stock SKUs", "My approvals"], (i) => ({
        Filters: i + 2,
      })),
    }),
    e({
      key: "saved",
      label: "Saved search",
      plural: "Saved searches",
      description: "User saved searches.",
      columns: [
        { key: "title", label: "Search" },
        { key: "status", label: "Status" },
        { key: "Owner", label: "Owner" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "owner", label: "Owner", type: "text" },
      ],
      records: makeRows("SVD", ["Pipeline hot", "Factory QC holds"], (i) => ({
        Owner: i ? "Ops" : "Sales",
      })),
    }),
    e({
      key: "recent",
      label: "Recent search",
      plural: "Recent searches",
      description: "Recently executed searches.",
      columns: [
        { key: "title", label: "Query" },
        { key: "status", label: "When" },
        { key: "Hits", label: "Hits" },
      ],
      fields: [{ name: "title", label: "Query", type: "text", required: true }],
      records: makeRows("REC", ["marina", "PO-10482", "leave balance"], (i) => ({
        Hits: 12 + i * 5,
      })),
    }),
    e({
      key: "facets",
      label: "Facet",
      plural: "Faceted filters",
      description: "Facet definitions for search.",
      columns: [
        { key: "title", label: "Facet" },
        { key: "status", label: "Status" },
        { key: "Values", label: "Values" },
      ],
      fields: [{ name: "title", label: "Facet", type: "text", required: true }],
      records: makeRows("FAC", ["Module", "Status", "Owner", "Date"], (i) => ({
        Values: 4 + i * 3,
      })),
    }),
    e({
      key: "suggestions",
      label: "Suggestion",
      plural: "Search suggestions",
      description: "Autocomplete suggestions.",
      columns: [
        { key: "title", label: "Suggestion" },
        { key: "status", label: "Status" },
        { key: "Weight", label: "Weight" },
      ],
      fields: [{ name: "title", label: "Suggestion", type: "text", required: true }],
      records: makeRows("SUG", ["sales order", "purchase order", "service request"], (i) => ({
        Weight: 100 - i * 10,
      })),
    }),
    e({
      key: "workspace",
      label: "Workspace hit",
      plural: "Results workspace",
      description: "Pinned results workspace.",
      columns: [
        { key: "title", label: "Pinned" },
        { key: "status", label: "Status" },
        { key: "Module", label: "Module" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "module", label: "Module", type: "text" },
      ],
      records: makeRows("WS", ["SO-31001", "Indus HQ", "INV-9001"], (i) => ({
        Module: ["Sales", "Projects", "Finance"][i]!,
      })),
    }),
  ],
};
