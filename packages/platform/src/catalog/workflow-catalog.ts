/**
 * RC6.1/RC6.5 frozen default workflow definitions.
 *
 * Codes and entity types mirror the seven `*-application` constants.
 * Initial stage codes align with domain status mappers so create handlers
 * project the expected entity status without falling back incorrectly.
 *
 * RC6.5 bumps definition version to 2 and attaches:
 * - default stage SLA hours on non-terminal stages
 * - default Rules guard on transitions (allow unless denyTransition)
 *
 * requiresApprovalType remains unset so domain handlers that transition
 * without approvalSatisfied stay backward compatible.
 */

import type { RegisterWorkflowInput } from "../workflow/workflow-engine.js";
import { WORKFLOW_GUARD_DEFAULT_RULE_SET } from "./rules-catalog.js";

export const PLATFORM_DEFINITIONS_CATALOG_VERSION =
  "rc6.5.platform-definitions.v1" as const;

/** Default stage SLA foundation (hours) for non-terminal stages. */
export const DEFAULT_STAGE_SLA_HOURS = 72;

export type CatalogWorkflowDefinition = RegisterWorkflowInput;

function withRc65Defaults(
  input: Omit<CatalogWorkflowDefinition, "companyId" | "version"> & {
    readonly companyId?: null;
    readonly version?: number;
  },
): CatalogWorkflowDefinition {
  return {
    companyId: null,
    version: 2,
    code: input.code,
    name: input.name,
    entityType: input.entityType,
    stages: input.stages.map((stage) => ({
      ...stage,
      slaHours:
        stage.slaHours !== undefined
          ? stage.slaHours
          : stage.isTerminal
            ? null
            : DEFAULT_STAGE_SLA_HOURS,
    })),
    transitions: input.transitions.map((transition) => ({
      ...transition,
      guardRuleSetCode:
        transition.guardRuleSetCode !== undefined
          ? transition.guardRuleSetCode
          : WORKFLOW_GUARD_DEFAULT_RULE_SET,
    })),
  };
}

function def(input: {
  readonly code: string;
  readonly name: string;
  readonly entityType: string;
  readonly stages: CatalogWorkflowDefinition["stages"];
  readonly transitions: CatalogWorkflowDefinition["transitions"];
}): CatalogWorkflowDefinition {
  return withRc65Defaults(input);
}

/** Minimal linear lifecycle: initial → terminal via `complete`. */
function linear(input: {
  readonly code: string;
  readonly name: string;
  readonly entityType: string;
  readonly initial: string;
  readonly terminal?: string;
  readonly extraTransitions?: CatalogWorkflowDefinition["transitions"];
}): CatalogWorkflowDefinition {
  const terminal = input.terminal ?? "done";
  return def({
    code: input.code,
    name: input.name,
    entityType: input.entityType,
    stages: [
      {
        code: input.initial,
        name: input.initial,
        sortOrder: 0,
        isInitial: true,
      },
      {
        code: terminal,
        name: terminal,
        sortOrder: 1,
        isTerminal: true,
      },
    ],
    transitions: [
      {
        code: "complete",
        fromStageCode: input.initial,
        toStageCode: terminal,
      },
      ...(input.extraTransitions ?? []),
    ],
  });
}

/**
 * Default workflow catalog — 19 codes (18 started by handlers today;
 * `inventory_stock_transfer_v1` is declared for completeness).
 * Version 2 includes RC6.5 SLA + guard foundation.
 */
export const WORKFLOW_CATALOG: readonly CatalogWorkflowDefinition[] = [
  // CRM
  def({
    code: "crm_lead_v1",
    name: "CRM Lead",
    entityType: "crm.lead",
    stages: [
      { code: "new", name: "New", sortOrder: 0, isInitial: true },
      { code: "qualified", name: "Qualified", sortOrder: 1 },
      {
        code: "converted",
        name: "Converted",
        sortOrder: 2,
        isTerminal: true,
      },
    ],
    transitions: [
      {
        code: "qualify",
        fromStageCode: "new",
        toStageCode: "qualified",
      },
      {
        code: "convert",
        fromStageCode: "new",
        toStageCode: "converted",
      },
      {
        code: "convert",
        fromStageCode: "qualified",
        toStageCode: "converted",
      },
    ],
  }),
  linear({
    code: "crm_campaign_v1",
    name: "CRM Campaign",
    entityType: "crm.campaign",
    initial: "draft",
    terminal: "completed",
  }),

  // Sales
  linear({
    code: "sales_opportunity_v1",
    name: "Sales Opportunity",
    entityType: "sales.opportunity",
    initial: "open",
    terminal: "won",
  }),
  linear({
    code: "quote_v1",
    name: "Sales Quote",
    entityType: "sales.quote",
    initial: "draft",
    terminal: "converted",
  }),
  def({
    code: "sales_order_fulfillment_v1",
    name: "Sales Order Fulfillment",
    entityType: "sales.order",
    stages: [
      { code: "draft", name: "Draft", sortOrder: 0, isInitial: true },
      {
        code: "cancelled",
        name: "Cancelled",
        sortOrder: 1,
        isTerminal: true,
      },
      {
        code: "completed",
        name: "Completed",
        sortOrder: 2,
        isTerminal: true,
      },
    ],
    transitions: [
      {
        code: "cancel",
        fromStageCode: "draft",
        toStageCode: "cancelled",
      },
      {
        code: "complete",
        fromStageCode: "draft",
        toStageCode: "completed",
      },
    ],
  }),

  // Finance
  linear({
    code: "finance_account_v1",
    name: "Financial Account",
    entityType: "finance.account",
    initial: "draft",
    terminal: "active",
  }),
  linear({
    code: "finance_invoice_v1",
    name: "Finance Invoice",
    entityType: "finance.invoice",
    initial: "draft",
    terminal: "issued",
  }),
  linear({
    code: "finance_payment_v1",
    name: "Finance Payment",
    entityType: "finance.payment",
    initial: "captured",
    terminal: "posted",
  }),

  // Procurement
  def({
    code: "purchase_requisition_v1",
    name: "Purchase Requisition",
    entityType: "procurement.purchase_requisition",
    stages: [
      { code: "draft", name: "Draft", sortOrder: 0, isInitial: true },
      { code: "submitted", name: "Submitted", sortOrder: 1 },
      {
        code: "converted",
        name: "Converted",
        sortOrder: 2,
        isTerminal: true,
      },
    ],
    transitions: [
      {
        code: "submit",
        fromStageCode: "draft",
        toStageCode: "submitted",
      },
      {
        code: "complete",
        fromStageCode: "submitted",
        toStageCode: "converted",
      },
    ],
  }),
  def({
    code: "purchase_order_v1",
    name: "Purchase Order",
    entityType: "procurement.purchase_order",
    stages: [
      { code: "draft", name: "Draft", sortOrder: 0, isInitial: true },
      { code: "issued", name: "Issued", sortOrder: 1 },
      {
        code: "cancelled",
        name: "Cancelled",
        sortOrder: 2,
        isTerminal: true,
      },
      {
        code: "closed",
        name: "Closed",
        sortOrder: 3,
        isTerminal: true,
      },
    ],
    transitions: [
      {
        code: "issue",
        fromStageCode: "draft",
        toStageCode: "issued",
      },
      {
        code: "cancel",
        fromStageCode: "draft",
        toStageCode: "cancelled",
      },
      {
        code: "cancel",
        fromStageCode: "issued",
        toStageCode: "cancelled",
      },
      {
        code: "complete",
        fromStageCode: "issued",
        toStageCode: "closed",
      },
    ],
  }),

  // Inventory
  linear({
    code: "inventory_item_v1",
    name: "Inventory Item",
    entityType: "inventory.item",
    initial: "draft",
    terminal: "active",
  }),
  linear({
    code: "inventory_warehouse_v1",
    name: "Inventory Warehouse",
    entityType: "inventory.warehouse",
    initial: "draft",
    terminal: "active",
  }),
  linear({
    code: "inventory_stock_transfer_v1",
    name: "Inventory Stock Transfer",
    entityType: "inventory.movement",
    initial: "draft",
    terminal: "completed",
  }),

  // Projects
  def({
    code: "project_v1",
    name: "Project",
    entityType: "projects.project",
    stages: [
      { code: "draft", name: "Draft", sortOrder: 0, isInitial: true },
      {
        code: "archived",
        name: "Archived",
        sortOrder: 1,
        isTerminal: true,
      },
      {
        code: "completed",
        name: "Completed",
        sortOrder: 2,
        isTerminal: true,
      },
    ],
    transitions: [
      {
        code: "archive",
        fromStageCode: "draft",
        toStageCode: "archived",
      },
      {
        code: "complete",
        fromStageCode: "draft",
        toStageCode: "completed",
      },
    ],
  }),
  def({
    code: "project_task_v1",
    name: "Project Task",
    entityType: "projects.task",
    stages: [
      { code: "draft", name: "Draft", sortOrder: 0, isInitial: true },
      {
        code: "completed",
        name: "Completed",
        sortOrder: 1,
        isTerminal: true,
      },
    ],
    transitions: [
      {
        code: "complete",
        fromStageCode: "draft",
        toStageCode: "completed",
      },
    ],
  }),
  linear({
    code: "project_milestone_v1",
    name: "Project Milestone",
    entityType: "projects.milestone",
    initial: "planned",
    terminal: "completed",
  }),

  // Service
  def({
    code: "service_request_v1",
    name: "Service Request",
    entityType: "service.service_request",
    stages: [
      { code: "draft", name: "Draft", sortOrder: 0, isInitial: true },
      {
        code: "closed",
        name: "Closed",
        sortOrder: 1,
        isTerminal: true,
      },
    ],
    transitions: [
      {
        code: "close",
        fromStageCode: "draft",
        toStageCode: "closed",
      },
    ],
  }),
  def({
    code: "service_work_order_v1",
    name: "Service Work Order",
    entityType: "service.work_order",
    stages: [
      { code: "draft", name: "Draft", sortOrder: 0, isInitial: true },
      {
        code: "completed",
        name: "Completed",
        sortOrder: 1,
        isTerminal: true,
      },
    ],
    transitions: [
      {
        code: "complete",
        fromStageCode: "draft",
        toStageCode: "completed",
      },
    ],
  }),
  linear({
    code: "service_appointment_v1",
    name: "Service Appointment",
    entityType: "service.appointment",
    initial: "scheduled",
    terminal: "completed",
  }),
];

/** Stable codes referenced by application handlers (and the unused transfer code). */
export const WORKFLOW_CATALOG_CODES: readonly string[] = WORKFLOW_CATALOG.map(
  (d) => d.code,
);
