import { ModuleWorkspace, type ModuleSpec } from "./ModuleWorkspace";
import { ModuleApp } from "./erp/ModuleApp";
import { SALES_MODULE } from "./sales/definition";
import { PROCUREMENT_MODULE } from "./procurement/definition";
import { INVENTORY_MODULE } from "./inventory/definition";
import { FINANCE_MODULE } from "./finance/definition";

export const MODULES = {
  projects: {
    title: "Projects",
    lead: "Interior project proposals and schedules from Projects Application.",
    queryType: "projects.GetProject",
    queryPayloadHint: 'JSON payload, e.g. {"projectId":"..."}',
    commandType: "projects.CreateProject",
    commandPayloadHint: "CreateProject JSON payload",
  },
  crm: {
    title: "CRM",
    lead: "Leads and conversations through CRM Application APIs.",
    queryType: "crm.GetLead",
    queryPayloadHint: 'JSON payload, e.g. {"leadId":"..."}',
    commandType: "crm.CreateLead",
    commandPayloadHint: "CreateLead JSON payload",
  },
  service: {
    title: "Service",
    lead: "Service requests and repairs via Service Application.",
    queryType: "service.GetServiceRequest",
    queryPayloadHint: 'JSON payload, e.g. {"serviceRequestId":"..."}',
    commandType: "service.CreateServiceRequest",
    commandPayloadHint: "CreateServiceRequest JSON payload",
  },
  hr: {
    title: "HR",
    lead: "HR presentation shell. Dispatch when HR application handlers are registered.",
    queryType: "hr.GetEmployee",
    queryPayloadHint: "JSON payload",
    statusNote:
      "Backend HR domain exists; application handlers may be registered in a later phase.",
  },
  manufacturing: {
    title: "Manufacturing",
    lead: "Manufacturing presentation shell over future Manufacturing Application APIs.",
    queryType: "manufacturing.GetWorkOrder",
    queryPayloadHint: "JSON payload",
    statusNote:
      "Domain package available; presentation uses API contracts when handlers are wired.",
  },
  cms: {
    title: "CMS",
    lead: "Content presentation shell. CMS mutations remain backend-owned.",
    queryType: "cms.GetEntry",
    queryPayloadHint: "JSON payload",
    statusNote: "Awaiting CMS application registration on the API host.",
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
  return <ModuleWorkspace spec={MODULES.projects} />;
}
export function CrmPage() {
  return <ModuleWorkspace spec={MODULES.crm} />;
}
export function ServicePage() {
  return <ModuleWorkspace spec={MODULES.service} />;
}
export function HrPage() {
  return <ModuleWorkspace spec={MODULES.hr} />;
}
export function ManufacturingPage() {
  return <ModuleWorkspace spec={MODULES.manufacturing} />;
}
export function CmsPage() {
  return <ModuleWorkspace spec={MODULES.cms} />;
}
