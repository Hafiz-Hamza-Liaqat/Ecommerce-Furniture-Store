/**
 * RC5.1 canonical permission catalog (frozen baseline).
 *
 * Source of truth: docs/rc5/13-Authorization-Governance-Specification.md.
 * Canonical grammar: `<module>.<resource>.<action>`.
 *
 * Every entry maps exactly one legacy executable Policy action key that the
 * 107 registered CQRS handlers emitted before RC5.3 (105 unique keys; the
 * sales and procurement summary queries reuse `order.read` / `po.read`).
 * RC5.3 normalized handler actions to the canonical codes; the mapping and
 * the seed-layer compatibility grants (see seed.ts) remain unchanged as the
 * documented overlap window for rollback.
 */

import {
  ROUTE_PERMISSION_CODES,
  ROUTE_PERMISSION_DEFINITIONS,
} from "./route-permission-catalog.js";

export const RBAC_CATALOG_VERSION = "rc5.rbac-catalog.v3";

export type CatalogPermissionDefinition = {
  /** Canonical permission code (`<module>.<resource>.<action>`). */
  readonly code: string;
  /** Owning module (reserved prefix from the governance specification). */
  readonly module: string;
  /** Legacy executable Policy action key used by handlers before RC5.3. */
  readonly legacyKey: string;
  readonly description: string;
};

type Entry = readonly [code: string, legacyKey: string, description: string];

function moduleEntries(
  module: string,
  entries: readonly Entry[],
): readonly CatalogPermissionDefinition[] {
  return entries.map(([code, legacyKey, description]) => ({
    code,
    module,
    legacyKey,
    description,
  }));
}

const SALES: readonly Entry[] = [
  ["sales.opportunities.create", "opportunity.create", "Create sales opportunities"],
  ["sales.opportunities.update", "opportunity.update", "Update sales opportunities"],
  ["sales.opportunities.read", "opportunity.read", "Read sales opportunities"],
  ["sales.quotes.create", "quote.create", "Create sales quotes"],
  ["sales.quotes.revise", "quote.revise", "Revise sales quotes"],
  ["sales.quotes.read", "quote.read", "Read sales quotes"],
  ["sales.orders.create", "order.create", "Create sales orders"],
  ["sales.orders.cancel", "order.cancel", "Cancel sales orders"],
  ["sales.orders.read", "order.read", "Read sales orders and customer sales summary"],
];

const PROCUREMENT: readonly Entry[] = [
  ["procurement.suppliers.create", "supplier.create", "Create suppliers"],
  ["procurement.suppliers.update", "supplier.update", "Update suppliers"],
  ["procurement.suppliers.read", "supplier.read", "Read suppliers"],
  ["procurement.requisitions.create", "requisition.create", "Create purchase requisitions"],
  ["procurement.requisitions.submit", "requisition.submit", "Submit purchase requisitions"],
  ["procurement.requisitions.read", "requisition.read", "Read purchase requisitions"],
  ["procurement.purchase_orders.create", "po.create", "Create purchase orders"],
  ["procurement.purchase_orders.issue", "po.issue", "Issue purchase orders"],
  ["procurement.purchase_orders.cancel", "po.cancel", "Cancel purchase orders"],
  ["procurement.purchase_orders.read", "po.read", "Read purchase orders and procurement summary"],
];

const INVENTORY: readonly Entry[] = [
  ["inventory.items.create", "inventory.item.create", "Create inventory items"],
  ["inventory.items.update", "inventory.item.update", "Update inventory items"],
  ["inventory.items.read", "inventory.item.read", "Read inventory items"],
  ["inventory.warehouses.create", "inventory.warehouse.create", "Create warehouses"],
  ["inventory.warehouses.read", "inventory.warehouse.read", "Read warehouses"],
  ["inventory.locations.create", "inventory.location.create", "Create storage locations"],
  ["inventory.stock.receive", "inventory.stock.receive", "Receive stock"],
  ["inventory.stock.adjust", "inventory.stock.adjust", "Adjust stock"],
  ["inventory.stock.reserve", "inventory.stock.reserve", "Reserve stock"],
  ["inventory.stock.release", "inventory.stock.release", "Release stock reservations"],
  ["inventory.stock.transfer", "inventory.stock.transfer", "Transfer stock"],
  ["inventory.stock.read", "inventory.stock.read", "Read stock levels"],
  ["inventory.ledger.read", "inventory.ledger.read", "Read the stock ledger"],
  ["inventory.batches.read", "inventory.batch.read", "Read batches"],
  ["inventory.lots.read", "inventory.lot.read", "Read lots"],
  ["inventory.serials.read", "inventory.serial.read", "Read serial numbers"],
  ["inventory.summary.read", "inventory.summary.read", "Read the inventory summary"],
];

const FINANCE: readonly Entry[] = [
  ["finance.accounts.create", "finance.account.create", "Create financial accounts"],
  ["finance.accounts.update", "finance.account.update", "Update financial accounts"],
  ["finance.accounts.read", "finance.account.read", "Read financial accounts"],
  ["finance.invoices.create", "finance.invoice.create", "Create invoices"],
  ["finance.invoices.update", "finance.invoice.update", "Update invoices"],
  ["finance.invoices.read", "finance.invoice.read", "Read invoices"],
  ["finance.payments.record", "finance.payment.record", "Record payments"],
  ["finance.payments.read", "finance.payment.read", "Read payments"],
  ["finance.credit_accounts.adjust", "finance.credit.adjust", "Record credit adjustments"],
  ["finance.credit_accounts.read", "finance.credit.read", "Read credit accounts"],
  ["finance.ledgers.create", "finance.ledger.create", "Create ledgers"],
  ["finance.ledgers.append", "finance.ledger.append", "Append ledger entries"],
  ["finance.ledgers.read", "finance.ledger.read", "Read ledgers"],
  ["finance.summary.read", "finance.summary.read", "Read the financial summary"],
];

const CRM: readonly Entry[] = [
  ["crm.leads.create", "lead.create", "Create leads"],
  ["crm.leads.update", "lead.update", "Update leads"],
  ["crm.leads.qualify", "lead.qualify", "Qualify leads"],
  ["crm.leads.convert", "lead.convert", "Convert leads"],
  ["crm.leads.read", "lead.read", "Read leads"],
  ["crm.contacts.create", "contact.create", "Create contacts"],
  ["crm.contacts.update", "contact.update", "Update contacts"],
  ["crm.contacts.read", "contact.read", "Read contacts"],
  ["crm.accounts.create", "account.create", "Create CRM accounts"],
  ["crm.accounts.update", "account.update", "Update CRM accounts"],
  ["crm.accounts.read", "account.read", "Read CRM accounts"],
  ["crm.activities.log", "activity.log", "Log activities"],
  ["crm.activities.read", "activity.read", "Read activities"],
  ["crm.communications.record", "communication.record", "Record communications"],
  ["crm.communications.read", "communication.read", "Read communications"],
  ["crm.campaigns.create", "campaign.create", "Create campaigns"],
  ["crm.campaigns.update", "campaign.update", "Update campaigns"],
  ["crm.campaigns.read", "campaign.read", "Read campaigns"],
  ["crm.summary.read", "crm.summary.read", "Read the CRM summary"],
];

const PROJECTS: readonly Entry[] = [
  ["projects.projects.create", "project.create", "Create projects"],
  ["projects.projects.update", "project.update", "Update projects"],
  ["projects.projects.archive", "project.archive", "Archive projects"],
  ["projects.projects.read", "project.read", "Read projects"],
  ["projects.tasks.create", "task.create", "Create tasks"],
  ["projects.tasks.update", "task.update", "Update tasks"],
  ["projects.tasks.assign", "task.assign", "Assign tasks"],
  ["projects.tasks.complete", "task.complete", "Complete tasks"],
  ["projects.tasks.read", "task.read", "Read tasks"],
  ["projects.milestones.create", "milestone.create", "Create milestones"],
  ["projects.milestones.update", "milestone.update", "Update milestones"],
  ["projects.milestones.read", "milestone.read", "Read milestones"],
  ["projects.resources.assign", "resource.assign", "Assign project resources"],
  ["projects.resources.release", "resource.release", "Release project resources"],
  ["projects.resources.read", "resource.read", "Read project resources"],
  ["projects.teams.read", "team.read", "Read project teams"],
  ["projects.schedules.update", "schedule.update", "Update project schedules"],
  ["projects.schedules.read", "schedule.read", "Read project schedules"],
  ["projects.work_items.read", "work_item.read", "Read work items"],
  ["projects.summary.read", "project.summary.read", "Read the project summary"],
];

const SERVICE: readonly Entry[] = [
  ["service.requests.create", "service_request.create", "Create service requests"],
  ["service.requests.update", "service_request.update", "Update service requests"],
  ["service.requests.close", "service_request.close", "Close service requests"],
  ["service.requests.read", "service_request.read", "Read service requests"],
  ["service.technicians.assign", "technician.assign", "Assign technicians"],
  ["service.technicians.reassign", "technician.reassign", "Reassign technicians"],
  ["service.technician_assignments.read", "technician_assignment.read", "Read technician assignments"],
  ["service.appointments.schedule", "appointment.schedule", "Schedule appointments"],
  ["service.appointments.reschedule", "appointment.reschedule", "Reschedule appointments"],
  ["service.appointments.read", "appointment.read", "Read appointments"],
  ["service.work_orders.create", "work_order.create", "Create work orders"],
  ["service.work_orders.update", "work_order.update", "Update work orders"],
  ["service.work_orders.complete", "work_order.complete", "Complete work orders"],
  ["service.work_orders.read", "work_order.read", "Read work orders"],
  ["service.history.read", "service.history.read", "Read service history"],
  ["service.summary.read", "service.summary.read", "Read the service summary"],
];

/** The complete RC5.1 canonical CQRS backend permission catalog (105 entries). */
export const PERMISSION_CATALOG: readonly CatalogPermissionDefinition[] = [
  ...moduleEntries("sales", SALES),
  ...moduleEntries("procurement", PROCUREMENT),
  ...moduleEntries("inventory", INVENTORY),
  ...moduleEntries("finance", FINANCE),
  ...moduleEntries("crm", CRM),
  ...moduleEntries("projects", PROJECTS),
  ...moduleEntries("service", SERVICE),
];

/**
 * RC6.2 platform operator CQRS permissions (workflow/approval).
 * Distinct from route-only `platform.workflows.read` / `platform.approvals.read`.
 * `legacyKey` equals `code` — these never existed as pre-RC5.3 handler keys.
 */
export const PLATFORM_PERMISSION_DEFINITIONS: readonly CatalogPermissionDefinition[] =
  [
    {
      code: "platform.workflow_definitions.read",
      module: "platform",
      legacyKey: "platform.workflow_definitions.read",
      description: "Read workflow definitions (operator CQRS)",
    },
    {
      code: "platform.workflow_definitions.create",
      module: "platform",
      legacyKey: "platform.workflow_definitions.create",
      description: "Register workflow definitions (operator CQRS)",
    },
    {
      code: "platform.workflow_instances.read",
      module: "platform",
      legacyKey: "platform.workflow_instances.read",
      description: "Read workflow instances and available transitions",
    },
    {
      code: "platform.workflow_instances.transition",
      module: "platform",
      legacyKey: "platform.workflow_instances.transition",
      description: "Transition workflow instances (operator CQRS)",
    },
    {
      code: "platform.workflow_tasks.read",
      module: "platform",
      legacyKey: "platform.workflow_tasks.read",
      description: "Read workflow task assignments",
    },
    {
      code: "platform.workflow_tasks.assign",
      module: "platform",
      legacyKey: "platform.workflow_tasks.assign",
      description: "Assign workflow tasks",
    },
    {
      code: "platform.approval_definitions.read",
      module: "platform",
      legacyKey: "platform.approval_definitions.read",
      description: "Read approval type definitions",
    },
    {
      code: "platform.approval_definitions.create",
      module: "platform",
      legacyKey: "platform.approval_definitions.create",
      description: "Register approval type definitions",
    },
    {
      code: "platform.approval_requests.read",
      module: "platform",
      legacyKey: "platform.approval_requests.read",
      description: "Read approval requests and history",
    },
    {
      code: "platform.approval_requests.submit",
      module: "platform",
      legacyKey: "platform.approval_requests.submit",
      description: "Submit approval requests (operator CQRS)",
    },
    {
      code: "platform.approval_requests.claim",
      module: "platform",
      legacyKey: "platform.approval_requests.claim",
      description: "Claim approval requests for review",
    },
    {
      code: "platform.approval_requests.approve",
      module: "platform",
      legacyKey: "platform.approval_requests.approve",
      description: "Approve approval requests",
    },
    {
      code: "platform.approval_requests.reject",
      module: "platform",
      legacyKey: "platform.approval_requests.reject",
      description: "Reject or request changes on approval requests",
    },
    {
      code: "platform.approval_requests.delegate",
      module: "platform",
      legacyKey: "platform.approval_requests.delegate",
      description: "Delegate approval requests",
    },
  ];

/**
 * RC5.4 API-route permissions (not CQRS handler actions).
 * `legacyKey` equals `code` because these never existed as pre-RC5.3
 * executable handler keys; the seed still treats them as canonical records.
 */
export const API_PERMISSION_DEFINITIONS: readonly CatalogPermissionDefinition[] =
  [
    {
      code: "dam.assets.upload",
      module: "dam",
      legacyKey: "dam.assets.upload",
      description: "Upload digital asset metadata via POST /api/v1/uploads",
    },
  ];

/** All CQRS backend permission codes in catalog order (105). */
export const CANONICAL_PERMISSION_CODES: readonly string[] =
  PERMISSION_CATALOG.map((entry) => entry.code);

/** All CQRS, platform-operator, API-route, and inactive route permission codes. */
export const ALL_CANONICAL_PERMISSION_CODES: readonly string[] = [
  ...CANONICAL_PERMISSION_CODES,
  ...PLATFORM_PERMISSION_DEFINITIONS.map((entry) => entry.code),
  ...API_PERMISSION_DEFINITIONS.map((entry) => entry.code),
  ...ROUTE_PERMISSION_CODES,
];

/** All canonical permission definitions seeded by the catalog. */
export const ALL_PERMISSION_DEFINITIONS = [
  ...PERMISSION_CATALOG,
  ...PLATFORM_PERMISSION_DEFINITIONS,
  ...API_PERMISSION_DEFINITIONS,
  ...ROUTE_PERMISSION_DEFINITIONS,
] as const;

/**
 * Explicit legacy executable action key → canonical permission code map.
 * Exactly one entry per unique legacy key (105).
 */
export const LEGACY_ACTION_MAP: Readonly<Record<string, string>> =
  Object.freeze(
    Object.fromEntries(
      PERMISSION_CATALOG.map((entry) => [entry.legacyKey, entry.code]),
    ),
  );

/** Resolve a legacy executable action key to its canonical permission code. */
export function resolveLegacyActionKey(legacyKey: string): string | null {
  return LEGACY_ACTION_MAP[legacyKey] ?? null;
}
