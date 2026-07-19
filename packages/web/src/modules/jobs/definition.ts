import type { EntityDef, FilterDef, ModuleDefinition } from "../erp/types";
import { row } from "../erp/fixtures";

const filters: FilterDef[] = [
  { key: "status", label: "Status", options: ["queued", "running", "succeeded", "failed", "cancelled"] },
  {
    key: "kind",
    label: "Kind",
    options: ["bulk_import", "bulk_export", "bulk_update", "report_run", "search_reindex", "other"],
  },
];

function e(p: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...p };
}

export const JOBS_MODULE: ModuleDefinition = {
  id: "jobs",
  title: "Background Jobs",
  lead: "Job queue, history, status, and retry via Jobs Application CQRS — no parallel job service.",
  basePath: "/app/platform/jobs",
  kpis: [
    { label: "Queue", value: "Live", trend: 0, href: "queue" },
    { label: "History", value: "Live", trend: 0, href: "queue" },
    { label: "Failed", value: "—", trend: 0, href: "queue" },
    { label: "Kinds", value: "6", trend: 0, href: "queue" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "queue", label: "Job queue", entityKey: "queue" },
  ],
  entities: [
    e({
      key: "queue",
      label: "Background job",
      plural: "Job queue",
      description: "Enqueue, inspect, complete, or fail background jobs.",
      columns: [
        { key: "title", label: "Job" },
        { key: "status", label: "Status" },
        { key: "Kind", label: "Kind" },
        { key: "Updated", label: "Updated" },
      ],
      fields: [
        {
          name: "kind",
          label: "Kind",
          type: "select",
          required: true,
          options: ["bulk_import", "bulk_export", "bulk_update", "report_run", "search_reindex", "other"],
        },
      ],
      records: [],
      api: {
        createCommandType: "jobs.EnqueueBackgroundJob",
        getQueryType: "jobs.GetBackgroundJob",
        listQueryType: "jobs.ListBackgroundJobs",
        buildListPayload: (companyId, args) => ({
          companyId,
          limit: Math.max(args.pageSize, 50),
        }),
        buildCreatePayload: (companyId, v) => ({
          companyId,
          kind: v.kind || "other",
          payload: {},
        }),
        buildGetPayload: (companyId, id) => ({ companyId, jobId: id }),
        extractCreateId: (data) => (data as { jobId?: string }).jobId ?? null,
        mapEntity: (data) => {
          const wrapped = data as { job?: Record<string, unknown> };
          const d = (wrapped.job ?? data) as {
            id?: string;
            kind?: string;
            status?: string;
            updatedAt?: string;
            errorCode?: string | null;
          };
          if (!d.id) return null;
          return row(d.id, d.kind ?? d.id, d.status ?? "queued", {
            Kind: d.kind ?? "—",
            Updated: d.updatedAt ?? "—",
            Error: d.errorCode ?? "—",
          }, { source: "api" });
        },
        lifecycleActions: [
          {
            id: "complete",
            label: "Mark succeeded",
            commandType: "jobs.CompleteBackgroundJob",
            tone: "primary",
            buildPayload: (companyId, jobId) => ({
              companyId,
              jobId,
              result: { completedVia: "workspace" },
            }),
          },
          {
            id: "fail",
            label: "Mark failed",
            commandType: "jobs.FailBackgroundJob",
            tone: "danger",
            buildPayload: (companyId, jobId) => ({
              companyId,
              jobId,
              errorCode: "manual_fail",
            }),
          },
          {
            id: "retry",
            label: "Retry (re-enqueue)",
            commandType: "jobs.EnqueueBackgroundJob",
            buildPayload: (companyId, _jobId, rowData) => ({
              companyId,
              kind: String(rowData.meta.Kind ?? "other"),
              payload: { retryOf: rowData.id },
            }),
          },
        ],
      },
    }),
  ],
};
