import { ModuleWorkspace } from "./ModuleWorkspace";

export const MODULES = {
  sales: {
    title: "Sales",
    lead: "Opportunities, quotes, and orders via Sales Application commands/queries.",
    queryType: "sales.GetOpportunity",
    queryPayloadHint: 'JSON payload, e.g. {"opportunityId":"..."}',
    commandType: "sales.CreateOpportunity",
    commandPayloadHint: "CreateOpportunity JSON payload",
  },
  procurement: {
    title: "Procurement",
    lead: "Requisitions and purchase orders through Procurement Application APIs.",
    queryType: "procurement.GetPurchaseRequisition",
    queryPayloadHint: 'JSON payload, e.g. {"requisitionId":"..."}',
    commandType: "procurement.CreatePurchaseRequisition",
    commandPayloadHint: "CreatePurchaseRequisition JSON payload",
  },
  inventory: {
    title: "Inventory",
    lead: "Stock and warehouse views from Inventory Application queries.",
    queryType: "inventory.GetStock",
    queryPayloadHint: 'JSON payload, e.g. {"itemId":"...","warehouseId":"..."}',
    commandType: "inventory.AdjustStock",
    commandPayloadHint: "AdjustStock JSON payload",
  },
  finance: {
    title: "Finance",
    lead: "Accounts and invoices via Finance Application — posting stays backend.",
    queryType: "finance.GetInvoice",
    queryPayloadHint: 'JSON payload, e.g. {"invoiceId":"..."}',
    commandType: "finance.CreateInvoice",
    commandPayloadHint: "CreateInvoice JSON payload",
  },
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
} as const;

export function SalesPage() {
  return <ModuleWorkspace spec={MODULES.sales} />;
}
export function ProcurementPage() {
  return <ModuleWorkspace spec={MODULES.procurement} />;
}
export function InventoryPage() {
  return <ModuleWorkspace spec={MODULES.inventory} />;
}
export function FinancePage() {
  return <ModuleWorkspace spec={MODULES.finance} />;
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
