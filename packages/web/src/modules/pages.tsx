import { ModuleWorkspace, type ModuleSpec } from "./ModuleWorkspace";
import { ModuleApp } from "./erp/ModuleApp";
import { SALES_MODULE } from "./sales/definition";
import { PROCUREMENT_MODULE } from "./procurement/definition";
import { INVENTORY_MODULE } from "./inventory/definition";
import { FINANCE_MODULE } from "./finance/definition";
import { PROJECTS_MODULE } from "./projects/definition";
import { CRM_MODULE } from "./crm/definition";
import { SERVICE_MODULE } from "./service/definition";
import { HR_MODULE } from "./hr/definition";
import { MANUFACTURING_MODULE } from "./manufacturing/definition";
import { CMS_MODULE } from "./cms/definition";
import { DAM_MODULE } from "./dam/definition";
import { NOTIFICATIONS_MODULE } from "./notifications/definition";
import { SEARCH_MODULE } from "./search/definition";
import { REPORTING_MODULE } from "./reporting/definition";
import { JOBS_MODULE } from "./jobs/definition";

export const MODULES = {
  workflow: {
    title: "Workflow",
    lead: "Workflow engine remains server-side. No GetInstance CQRS query is registered — use /app/workflow operator view.",
    queryType: "workflow.unavailable",
    queryPayloadHint: "No public workflow query type — presentation inventory until CQRS wrapper exists",
    statusNote: "RC2: Workflow/Approval engines are not exposed as CQRS handlers; UI does not invent APIs.",
  },
} as const satisfies Record<string, ModuleSpec>;

export function SalesPage() {
  return <ModuleApp module={SALES_MODULE} />;
}
export function ProcurementPage() {
  return <ModuleApp module={PROCUREMENT_MODULE} />;
}
export function InventoryPage() {
  return <ModuleApp module={INVENTORY_MODULE} />;
}
export function FinancePage() {
  return <ModuleApp module={FINANCE_MODULE} />;
}
export function ProjectsPage() {
  return <ModuleApp module={PROJECTS_MODULE} />;
}
export function CrmPage() {
  return <ModuleApp module={CRM_MODULE} />;
}
export function ServicePage() {
  return <ModuleApp module={SERVICE_MODULE} />;
}
export function HrPage() {
  return <ModuleApp module={HR_MODULE} />;
}
export function ManufacturingPage() {
  return <ModuleApp module={MANUFACTURING_MODULE} />;
}
export function CmsPage() {
  return <ModuleApp module={CMS_MODULE} />;
}
export function DamModulePage() {
  return <ModuleApp module={DAM_MODULE} />;
}
export function NotificationsModulePage() {
  return <ModuleApp module={NOTIFICATIONS_MODULE} />;
}
export function SearchModulePage() {
  return <ModuleApp module={SEARCH_MODULE} />;
}
export function ReportingModulePage() {
  return <ModuleApp module={REPORTING_MODULE} />;
}
export function JobsModulePage() {
  return <ModuleApp module={JOBS_MODULE} />;
}

/** Kept for non-P4 platform shells if needed */
export function WorkflowShellPage() {
  return <ModuleWorkspace spec={MODULES.workflow} />;
}
