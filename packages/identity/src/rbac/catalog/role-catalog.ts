/**
 * RC5.1 immutable system role catalog (frozen baseline: 33 roles).
 *
 * Source of truth: docs/rc5/03-Role-Catalog.md (§7 seed classes).
 * Excluded by decision: `guest` (public state, never an assignment),
 * `vendor` (alias of `supplier`), `manufacturer_partner` and `consultant`
 * (deferred to RC8), presentation-only `viewer` (not an RBAC role).
 *
 * Role→permission links reference canonical codes only. Legacy executable
 * compatibility grants are derived by the seed layer, never listed here.
 * Partner, customer, and operational roles receive no backend module
 * permissions in RC5.1: their grants require record-level scoping (RC5.5)
 * or portal surfaces (RC8) and would otherwise be company-wide.
 */

import { PERMISSION_CATALOG } from "./permission-catalog.js";

export type SystemRoleGroup =
  | "governance"
  | "management"
  | "partner"
  | "operational";

export type CatalogRoleDefinition = {
  /** Stable system role code (immutable). */
  readonly code: string;
  readonly name: string;
  readonly group: SystemRoleGroup;
  /** Parent system role code for hierarchy inheritance, or null for root. */
  readonly parentCode: string | null;
  /** Canonical permission codes granted directly to this role. */
  readonly permissions: readonly string[];
};

const ALL = PERMISSION_CATALOG.map((p) => p.code);
const ALL_READ = PERMISSION_CATALOG.filter((p) =>
  p.code.endsWith(".read"),
).map((p) => p.code);

function modulePack(module: string): readonly string[] {
  return PERMISSION_CATALOG.filter((p) => p.module === module).map(
    (p) => p.code,
  );
}

function moduleReadPack(module: string): readonly string[] {
  return PERMISSION_CATALOG.filter(
    (p) => p.module === module && p.code.endsWith(".read"),
  ).map((p) => p.code);
}

/** The complete RC5.1 immutable system role catalog (33 entries). */
export const ROLE_CATALOG: readonly CatalogRoleDefinition[] = [
  // Governance (9) — `guest` is intentionally absent.
  {
    code: "super_admin",
    name: "Super Admin",
    group: "governance",
    parentCode: null,
    permissions: ALL,
  },
  {
    code: "platform_admin",
    name: "Platform Admin",
    group: "governance",
    parentCode: null,
    // Platform control plane has no CQRS surface yet; no module grants.
    permissions: [],
  },
  {
    code: "company_owner",
    name: "Company Owner",
    group: "governance",
    parentCode: "admin",
    permissions: [],
  },
  {
    code: "admin",
    name: "Admin / Company Admin",
    group: "governance",
    parentCode: null,
    permissions: ALL,
  },
  {
    code: "moderator",
    name: "Moderator",
    group: "governance",
    parentCode: "editor",
    permissions: [],
  },
  {
    code: "editor",
    name: "Editor",
    group: "governance",
    parentCode: null,
    // CMS/content CQRS does not exist yet (RC7+).
    permissions: [],
  },
  {
    code: "auditor",
    name: "Auditor",
    group: "governance",
    parentCode: null,
    permissions: ALL_READ,
  },
  {
    code: "approver",
    name: "Approver",
    group: "governance",
    parentCode: null,
    // Approval CQRS actions do not exist yet (RC6).
    permissions: [],
  },
  {
    code: "read_only",
    name: "Read-only User",
    group: "governance",
    parentCode: null,
    permissions: ALL_READ,
  },

  // Executive / management (10)
  {
    code: "executive",
    name: "Executive",
    group: "management",
    parentCode: null,
    permissions: ALL_READ,
  },
  {
    code: "finance_manager",
    name: "Finance Manager",
    group: "management",
    parentCode: null,
    permissions: modulePack("finance"),
  },
  {
    code: "hr_manager",
    name: "HR Manager",
    group: "management",
    parentCode: null,
    // HR CQRS does not exist yet (RC7+).
    permissions: [],
  },
  {
    code: "procurement_manager",
    name: "Procurement Manager",
    group: "management",
    parentCode: null,
    permissions: [...modulePack("procurement"), ...moduleReadPack("inventory")],
  },
  {
    code: "warehouse_manager",
    name: "Warehouse Manager",
    group: "management",
    parentCode: null,
    permissions: modulePack("inventory"),
  },
  {
    code: "manufacturing_manager",
    name: "Manufacturing Manager",
    group: "management",
    parentCode: null,
    // Manufacturing CQRS does not exist yet (RC7/RC12).
    permissions: [],
  },
  {
    code: "sales_manager",
    name: "Sales Manager",
    group: "management",
    parentCode: null,
    permissions: [...modulePack("sales"), ...modulePack("crm")],
  },
  {
    code: "sales_representative",
    name: "Sales Representative",
    group: "management",
    parentCode: null,
    // Own/assigned record scoping is enforced in RC5.5; documented union risk.
    permissions: [...modulePack("sales"), ...modulePack("crm")],
  },
  {
    code: "service_manager",
    name: "Service Manager",
    group: "management",
    parentCode: null,
    permissions: modulePack("service"),
  },
  {
    code: "customer_support",
    name: "Customer Support",
    group: "management",
    parentCode: null,
    permissions: [...moduleReadPack("service"), ...moduleReadPack("crm")],
  },

  // Professional / partner (8) — grants deferred to RC5.5/RC8 record scoping.
  {
    code: "architect",
    name: "Architect",
    group: "partner",
    parentCode: null,
    permissions: [],
  },
  {
    code: "interior_designer",
    name: "Interior Designer",
    group: "partner",
    parentCode: null,
    permissions: [],
  },
  {
    code: "civil_engineer",
    name: "Civil Engineer",
    group: "partner",
    parentCode: null,
    permissions: [],
  },
  {
    code: "contractor",
    name: "Contractor",
    group: "partner",
    parentCode: null,
    permissions: [],
  },
  {
    code: "dealer",
    name: "Dealer",
    group: "partner",
    parentCode: null,
    permissions: [],
  },
  {
    code: "supplier",
    name: "Supplier",
    group: "partner",
    parentCode: null,
    permissions: [],
  },
  {
    code: "customer",
    name: "Customer",
    group: "partner",
    parentCode: null,
    permissions: [],
  },
  {
    code: "corporate_buyer",
    name: "Corporate Buyer",
    group: "partner",
    parentCode: null,
    permissions: [],
  },

  // Operational (6) — grants deferred to branch/location scoping (RC5.5).
  {
    code: "employee",
    name: "Employee",
    group: "operational",
    parentCode: null,
    permissions: [],
  },
  {
    code: "production_staff",
    name: "Production Staff",
    group: "operational",
    parentCode: null,
    permissions: [],
  },
  {
    code: "warehouse_staff",
    name: "Warehouse Staff",
    group: "operational",
    parentCode: null,
    permissions: [],
  },
  {
    code: "showroom_staff",
    name: "Showroom Staff",
    group: "operational",
    parentCode: null,
    permissions: [],
  },
  {
    code: "delivery_staff",
    name: "Delivery Staff",
    group: "operational",
    parentCode: null,
    permissions: [],
  },
  {
    code: "installation_staff",
    name: "Installation Staff",
    group: "operational",
    parentCode: null,
    permissions: [],
  },
];

/** All system role codes in catalog order (33 entries). */
export const SYSTEM_ROLE_CODES: readonly string[] = ROLE_CATALOG.map(
  (role) => role.code,
);
