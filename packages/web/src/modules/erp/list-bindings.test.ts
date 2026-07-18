import { describe, expect, it } from "vitest";
import { SALES_MODULE } from "../sales/definition";
import { PROCUREMENT_MODULE } from "../procurement/definition";
import { INVENTORY_MODULE } from "../inventory/definition";
import { FINANCE_MODULE } from "../finance/definition";
import { CRM_MODULE } from "../crm/definition";
import { PROJECTS_MODULE } from "../projects/definition";
import { SERVICE_MODULE } from "../service/definition";
import type { EntityDef, ModuleDefinition } from "./types";

/** RC7.3 Included entity → List* binding inventory (freeze subset). */
const EXPECTED: ReadonlyArray<{
  readonly moduleId: string;
  readonly entityKey: string;
  readonly listQueryType: string;
}> = [
  { moduleId: "sales", entityKey: "opportunities", listQueryType: "sales.ListOpportunity" },
  { moduleId: "sales", entityKey: "quotations", listQueryType: "sales.ListQuote" },
  { moduleId: "sales", entityKey: "orders", listQueryType: "sales.ListSalesOrder" },
  { moduleId: "procurement", entityKey: "suppliers", listQueryType: "procurement.ListSupplier" },
  { moduleId: "procurement", entityKey: "requests", listQueryType: "procurement.ListPurchaseRequisition" },
  { moduleId: "procurement", entityKey: "orders", listQueryType: "procurement.ListPurchaseOrder" },
  { moduleId: "inventory", entityKey: "products", listQueryType: "inventory.ListInventoryItem" },
  { moduleId: "inventory", entityKey: "warehouses", listQueryType: "inventory.ListWarehouse" },
  { moduleId: "inventory", entityKey: "stock", listQueryType: "inventory.ListStock" },
  { moduleId: "finance", entityKey: "accounts", listQueryType: "finance.ListFinancialAccount" },
  { moduleId: "finance", entityKey: "invoices", listQueryType: "finance.ListInvoice" },
  { moduleId: "finance", entityKey: "payments", listQueryType: "finance.ListPayment" },
  { moduleId: "finance", entityKey: "ledger", listQueryType: "finance.ListLedger" },
  { moduleId: "crm", entityKey: "leads", listQueryType: "crm.ListLead" },
  { moduleId: "crm", entityKey: "contacts", listQueryType: "crm.ListContact" },
  { moduleId: "crm", entityKey: "accounts", listQueryType: "crm.ListAccount" },
  { moduleId: "crm", entityKey: "activities", listQueryType: "crm.ListActivity" },
  { moduleId: "crm", entityKey: "campaigns", listQueryType: "crm.ListCampaign" },
  { moduleId: "projects", entityKey: "projects", listQueryType: "projects.ListProject" },
  { moduleId: "projects", entityKey: "tasks", listQueryType: "projects.ListTask" },
  { moduleId: "projects", entityKey: "milestones", listQueryType: "projects.ListMilestone" },
  { moduleId: "service", entityKey: "tickets", listQueryType: "service.ListServiceRequest" },
  { moduleId: "service", entityKey: "requests", listQueryType: "service.ListServiceRequest" },
  { moduleId: "service", entityKey: "work-orders", listQueryType: "service.ListWorkOrder" },
  { moduleId: "service", entityKey: "appointments", listQueryType: "service.ListAppointment" },
  { moduleId: "service", entityKey: "scheduling", listQueryType: "service.ListTechnicianAssignment" },
];

const MODULES: readonly ModuleDefinition[] = [
  SALES_MODULE,
  PROCUREMENT_MODULE,
  INVENTORY_MODULE,
  FINANCE_MODULE,
  CRM_MODULE,
  PROJECTS_MODULE,
  SERVICE_MODULE,
];

describe("RC7.3 Included List* UI bindings", () => {
  it("wires every freeze-Included entity to a live listQueryType + mapEntity", () => {
    for (const expected of EXPECTED) {
      const mod = MODULES.find((m) => m.id === expected.moduleId);
      expect(mod, expected.moduleId).toBeTruthy();
      const entity = mod!.entities.find(
        (e: EntityDef) => e.key === expected.entityKey,
      );
      expect(entity, `${expected.moduleId}/${expected.entityKey}`).toBeTruthy();
      expect(entity!.api?.listQueryType).toBe(expected.listQueryType);
      expect(
        entity!.api?.mapListEntity ?? entity!.api?.mapEntity,
        `${expected.moduleId}/${expected.entityKey} mapEntity`,
      ).toBeTypeOf("function");
    }
  });
});
