import type { EntityDef, FilterDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

const filters: FilterDef[] = [
  { key: "status", label: "Status", options: ["Draft", "Open", "In progress", "On hold", "Completed", "Closed"] },
  { key: "priority", label: "Priority", options: ["High", "Medium", "Low"] },
  { key: "owner", label: "Owner" },
  { key: "customer", label: "Customer" },
  { key: "date", label: "Date" },
  { key: "team", label: "Team" },
];

function e(partial: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...partial };
}

const projects = makeRows(
  "PRJ",
  ["Indus HQ fit-out", "Marina Residences", "Cedar Club", "Horizon Hotels guest rooms", "Northline board suite"],
  (i) => ({
    Code: `PRJ-${200 + i}`,
    Customer: ["Indus Group", "Marina Hospitality", "Cedar Club", "Horizon Hotels", "Northline"][i]!,
    Owner: i % 2 ? "A. Khan" : "S. Malik",
    Budget: `₨ ${(4_000_000 + i * 900_000).toLocaleString()}`,
    Progress: `${35 + i * 12}%`,
  }),
);

export const PROJECTS_MODULE: ModuleDefinition = {
  id: "projects",
  title: "Projects",
  lead: "Projects, tasks, and schedules via Projects Application — lifecycle stays Workflow-owned.",
  basePath: "/app/projects",
  summaryQueryType: "projects.GetProjectSummary",
  buildSummaryPayload: (companyId) => ({ companyId }),
  kpis: [
    { label: "Active projects", value: "37", trend: 2.0, href: "projects" },
    { label: "Open tasks", value: "214", trend: -3.1, href: "tasks" },
    { label: "Milestones due", value: "12", trend: 0, href: "milestones" },
    { label: "Budget utilized", value: "68%", trend: 4.2, href: "budgets" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "projects", label: "Projects", entityKey: "projects" },
    { to: "tasks", label: "Tasks", entityKey: "tasks" },
    { to: "milestones", label: "Milestones", entityKey: "milestones" },
    { to: "gantt", label: "Gantt timeline" },
    { to: "pipeline", label: "Kanban board" },
    { to: "calendar", label: "Calendar" },
    { to: "resources", label: "Resources", entityKey: "resources" },
    { to: "teams", label: "Teams", entityKey: "teams" },
    { to: "budgets", label: "Budgets", entityKey: "budgets" },
    { to: "time", label: "Time tracking", entityKey: "time" },
    { to: "expenses", label: "Expenses", entityKey: "expenses" },
    { to: "risks", label: "Risks", entityKey: "risks" },
    { to: "dependencies", label: "Dependencies", entityKey: "dependencies" },
    { to: "files", label: "Files", entityKey: "files" },
    { to: "comments", label: "Comments", entityKey: "comments" },
    { to: "activity", label: "Activity", entityKey: "activity" },
    { to: "analytics", label: "Analytics", entityKey: "analytics" },
  ],
  entities: [
    e({
      key: "projects",
      label: "Project",
      plural: "Projects",
      description: "Project portfolio and delivery programs.",
      collaborationEntityType: "projects.project",
      columns: [
        { key: "title", label: "Project", sortable: true },
        { key: "status", label: "Status" },
        { key: "Customer", label: "Customer" },
        { key: "Owner", label: "Owner" },
        { key: "Progress", label: "Progress" },
        { key: "amount", label: "Budget" },
      ],
      fields: [
        { name: "code", label: "Code", type: "text", required: true },
        { name: "name", label: "Name", type: "text", required: true },
        { name: "projectType", label: "Type", type: "select", options: ["interior", "architecture", "civil", "contracting", "furniture", "service", "other"], required: true },
        { name: "classification", label: "Classification", type: "select", options: ["residential", "commercial", "industrial", "institutional", "internal", "other"], required: true },
        { name: "customerId", label: "Customer ID", type: "text" },
      ],
      records: projects,
      api: {
        createCommandType: "projects.CreateProject",
        updateCommandType: "projects.UpdateProject",
        getQueryType: "projects.GetProject",
        listQueryType: "projects.ListProject",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          code: v.code,
          name: v.name,
          projectType: v.projectType || "furniture",
          classification: v.classification || "commercial",
          customerId: v.customerId || null,
        }),
        buildUpdatePayload: (companyId, projectId, v) => ({
          companyId,
          projectId,
          code: v.code || null,
          name: v.name || null,
          projectType: v.projectType || null,
          classification: v.classification || null,
          customerId: v.customerId || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, projectId: id }),
        extractCreateId: (data) => (data as { projectId?: string }).projectId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; name?: string; code?: string; status?: string };
          if (!d.id) return null;
          return row(d.id, d.name ?? d.id, d.status ?? "active", { Code: d.code ?? "—" }, { source: "api" });
        },
        lifecycleActions: [
          {
            id: "archive",
            label: "Archive project",
            commandType: "projects.ArchiveProject",
            tone: "danger",
            buildPayload: (companyId, projectId) => ({ companyId, projectId }),
          },
        ],
      },
    }),
    e({
      key: "tasks",
      label: "Task",
      plural: "Tasks",
      description: "Work breakdown tasks.",
      kanban: true,
      collaborationEntityType: "projects.task",
      columns: [
        { key: "title", label: "Task", sortable: true },
        { key: "status", label: "Status" },
        { key: "Project", label: "Project" },
        { key: "Priority", label: "Priority" },
        { key: "Due", label: "Due" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "projectId", label: "Project ID", type: "text" },
        { name: "priority", label: "Priority", type: "select", options: ["low", "normal", "high", "urgent"] },
        { name: "dueAt", label: "Due", type: "date" },
        { name: "description", label: "Description", type: "textarea" },
      ],
      records: makeRows("TSK", ["BOQ review", "Finish samples", "Site measure", "CNC nest", "Pack list"], (i) => ({
        Project: projects[i % projects.length]!.title,
        Priority: ["High", "Medium", "Low"][i % 3]!,
        Due: `2026-07-${12 + i}`,
      })),
      api: {
        createCommandType: "projects.CreateTask",
        getQueryType: "projects.GetTask",
        listQueryType: "projects.ListTask",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          title: v.title,
          projectId: v.projectId || null,
          priority: v.priority || "normal",
          dueAt: v.dueAt || null,
          description: v.description || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, taskId: id }),
        extractCreateId: (data) => (data as { taskId?: string }).taskId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; title?: string; status?: string; priority?: string };
          if (!d.id) return null;
          return row(d.id, d.title ?? d.id, d.status ?? "Open", { Priority: d.priority ?? "—" }, { source: "api" });
        },
        lifecycleActions: [
          {
            id: "complete",
            label: "Complete task",
            commandType: "projects.CompleteTask",
            buildPayload: (companyId, taskId) => ({ companyId, taskId }),
          },
        ],
      },
    }),
    e({
      key: "milestones",
      label: "Milestone",
      plural: "Milestones",
      description: "Project milestones and gates.",
      columns: [
        { key: "title", label: "Milestone" },
        { key: "status", label: "Status" },
        { key: "Project", label: "Project" },
        { key: "Due", label: "Due" },
      ],
      fields: [
        { name: "projectId", label: "Project ID", type: "text", required: true },
        { name: "name", label: "Name", type: "text", required: true },
        { name: "dueAt", label: "Due", type: "date" },
      ],
      records: makeRows("MS", ["Design freeze", "Factory kickoff", "Site install", "Handover"], (i) => ({
        Project: projects[i % projects.length]!.title,
        Due: `2026-0${8 + (i % 4)}-01`,
      })),
      api: {
        createCommandType: "projects.CreateMilestone",
        getQueryType: "projects.GetMilestone",
        listQueryType: "projects.ListMilestone",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          projectId: v.projectId,
          name: v.name,
          dueAt: v.dueAt || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, milestoneId: id }),
        extractCreateId: (data) => (data as { milestoneId?: string }).milestoneId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; name?: string; status?: string };
          if (!d.id) return null;
          return row(d.id, d.name ?? d.id, d.status ?? "Open", {}, { source: "api" });
        },
      },
    }),
    e({
      key: "resources",
      label: "Resource",
      plural: "Resources",
      description: "Assignable people and capacity.",
      columns: [
        { key: "title", label: "Resource" },
        { key: "status", label: "Status" },
        { key: "Role", label: "Role" },
        { key: "Utilization", label: "Utilization" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "role", label: "Role", type: "text" },
      ],
      records: makeRows("RES", ["Site PM", "Install lead", "Upholstery tech", "QC inspector"], (i) => ({
        Role: ["PM", "Lead", "Tech", "QC"][i]!,
        Utilization: `${60 + i * 8}%`,
      })),
      api: {
        getQueryType: "projects.GetResource",
        buildGetPayload: (companyId, id) => ({ companyId, resourceId: id }),
      },
    }),
    e({
      key: "teams",
      label: "Team",
      plural: "Teams",
      description: "Project delivery teams.",
      columns: [
        { key: "title", label: "Team" },
        { key: "status", label: "Status" },
        { key: "Lead", label: "Lead" },
        { key: "Members", label: "Members" },
      ],
      fields: [
        { name: "title", label: "Team", type: "text", required: true },
        { name: "lead", label: "Lead", type: "text" },
      ],
      records: makeRows("PTM", ["Install A", "Finish B", "Site C"], (i) => ({
        Lead: ["Hassan A.", "Maya C.", "Nadia F."][i]!,
        Members: 5 + i,
      })),
      api: {
        getQueryType: "projects.GetTeam",
        buildGetPayload: (companyId, id) => ({ companyId, teamId: id, includeMemberships: true }),
      },
    }),
    e({
      key: "budgets",
      label: "Budget line",
      plural: "Budgets",
      description: "Project budget lines (amounts display-only).",
      columns: [
        { key: "title", label: "Line" },
        { key: "status", label: "Status" },
        { key: "Project", label: "Project" },
        { key: "amount", label: "Amount" },
      ],
      fields: [
        { name: "title", label: "Line", type: "text", required: true },
        { name: "amount", label: "Amount", type: "currency" },
      ],
      records: makeRows("PBD", ["Materials", "Labor", "Logistics", "Contingency"], (i) => ({
        Project: projects[i % projects.length]!.title,
      })),
    }),
    e({
      key: "time",
      label: "Time entry",
      plural: "Time tracking",
      description: "Logged hours against tasks/projects.",
      columns: [
        { key: "title", label: "Entry" },
        { key: "status", label: "Status" },
        { key: "Hours", label: "Hours" },
        { key: "User", label: "User" },
      ],
      fields: [
        { name: "title", label: "Entry", type: "text", required: true },
        { name: "hours", label: "Hours", type: "number" },
      ],
      records: makeRows("TIM", ["Site visit", "Drawing review", "Install day 1"], (i) => ({
        Hours: 4 + i,
        User: i % 2 ? "A. Khan" : "S. Malik",
      })),
    }),
    e({
      key: "expenses",
      label: "Expense",
      plural: "Expenses",
      description: "Project expenses and claims.",
      columns: [
        { key: "title", label: "Expense" },
        { key: "status", label: "Status" },
        { key: "Project", label: "Project" },
        { key: "amount", label: "Amount" },
      ],
      fields: [
        { name: "title", label: "Expense", type: "text", required: true },
        { name: "amount", label: "Amount", type: "currency" },
      ],
      records: makeRows("PEX", ["Travel", "Sample courier", "Tools hire"], (i) => ({
        Project: projects[i % projects.length]!.title,
      })),
    }),
    e({
      key: "risks",
      label: "Risk",
      plural: "Risks",
      description: "Project risk register.",
      columns: [
        { key: "title", label: "Risk" },
        { key: "status", label: "Status" },
        { key: "Severity", label: "Severity" },
        { key: "Owner", label: "Owner" },
      ],
      fields: [
        { name: "title", label: "Risk", type: "text", required: true },
        { name: "severity", label: "Severity", type: "select", options: ["High", "Medium", "Low"] },
      ],
      records: makeRows("RSK", ["Finish delay", "Site access", "Material shortage"], (i) => ({
        Severity: ["High", "Medium", "Low"][i]!,
        Owner: "PM",
      })),
    }),
    e({
      key: "dependencies",
      label: "Dependency",
      plural: "Dependencies",
      description: "Task and milestone dependencies.",
      columns: [
        { key: "title", label: "Dependency" },
        { key: "status", label: "Status" },
        { key: "From", label: "From" },
        { key: "To", label: "To" },
      ],
      fields: [
        { name: "title", label: "Label", type: "text", required: true },
        { name: "from", label: "From", type: "text" },
        { name: "to", label: "To", type: "text" },
      ],
      records: makeRows("DEP", ["Samples → Freeze", "CNC → Pack", "Pack → Install"], (i) => ({
        From: ["BOQ review", "CNC nest", "Pack list"][i]!,
        To: ["Design freeze", "Pack list", "Site install"][i]!,
      })),
    }),
    e({
      key: "files",
      label: "File",
      plural: "Files",
      description: "Project files and drawings.",
      columns: [
        { key: "title", label: "File" },
        { key: "status", label: "Status" },
        { key: "Type", label: "Type" },
        { key: "Project", label: "Project" },
      ],
      fields: [
        { name: "title", label: "File name", type: "text", required: true },
        { name: "type", label: "Type", type: "select", options: ["Drawing", "Spec", "Photo", "PDF"] },
      ],
      records: makeRows("PFL", ["GA plan.pdf", "Finish schedule.xlsx", "Site photo 01"], (i) => ({
        Type: ["PDF", "Spec", "Photo"][i]!,
        Project: projects[i % projects.length]!.title,
      })),
    }),
    e({
      key: "comments",
      label: "Comment thread",
      plural: "Comments",
      description: "Threaded project comments.",
      columns: [
        { key: "title", label: "Thread" },
        { key: "status", label: "Status" },
        { key: "Author", label: "Author" },
      ],
      fields: [
        { name: "title", label: "Subject", type: "text", required: true },
        { name: "body", label: "Comment", type: "textarea" },
      ],
      records: makeRows("PCM", ["Finish match question", "Install window"], (i) => ({
        Author: i ? "Client" : "Designer",
      })),
    }),
    e({
      key: "activity",
      label: "Activity",
      plural: "Activity timeline",
      description: "Project activity stream.",
      columns: [
        { key: "title", label: "Event" },
        { key: "status", label: "When" },
        { key: "Actor", label: "Actor" },
      ],
      fields: [{ name: "title", label: "Event", type: "text", required: true }],
      records: makeRows("PACT", ["Status changed", "Task assigned", "File uploaded"], (i) => ({
        Actor: ["System", "A. Khan", "S. Malik"][i]!,
      })),
    }),
    e({
      key: "analytics",
      label: "Analytics view",
      plural: "Project analytics",
      description: "Project analytics presentation.",
      analytics: true,
      columns: [
        { key: "title", label: "View" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "View", type: "text", required: true }],
      records: makeRows("PAN", ["On-time milestones", "Budget variance", "Resource load"], (i) => ({
        Value: ["81%", "4.2%", "86%"][i]!,
      })),
    }),
  ],
};
