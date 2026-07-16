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

import {
  ALL_CANONICAL_PERMISSION_CODES,
  PERMISSION_CATALOG,
} from "./permission-catalog.js";
import { RoutePermissions } from "./route-permission-catalog.js";

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

const ALL = ALL_CANONICAL_PERMISSION_CODES;
const ALL_READ = PERMISSION_CATALOG.filter((p) =>
  p.code.endsWith(".read"),
).map((p) => p.code);

const MANAGER_COMMON_ROUTES = [
  RoutePermissions.CalendarEventsRead,
  RoutePermissions.AnalyticsDashboardsRead,
  RoutePermissions.ReportingReportsRead,
] as const;

const ADMIN_ROUTES = [
  RoutePermissions.ExecutiveDashboardRead,
  RoutePermissions.CalendarEventsRead,
  RoutePermissions.AnalyticsDashboardsRead,
  RoutePermissions.AnalyticsDashboardsConfigure,
  RoutePermissions.AnalyticsInsightsRead,
  RoutePermissions.ReportingReportsRead,
  RoutePermissions.AiAssistantUse,
  RoutePermissions.AiUsageRead,
  RoutePermissions.AiSettingsManage,
  RoutePermissions.IntegrationsCatalogRead,
  RoutePermissions.PlatformOperationsRead,
  RoutePermissions.PlatformHealthRead,
  RoutePermissions.PlatformWorkflowsRead,
  RoutePermissions.PlatformApprovalsRead,
  RoutePermissions.SalesDashboardRead,
  RoutePermissions.ProcurementDashboardRead,
  RoutePermissions.InventoryDashboardRead,
  RoutePermissions.FinanceDashboardRead,
  RoutePermissions.ProjectsDashboardRead,
  RoutePermissions.CrmDashboardRead,
  RoutePermissions.ServiceDashboardRead,
  RoutePermissions.HrDashboardRead,
  RoutePermissions.ManufacturingDashboardRead,
  RoutePermissions.CmsDashboardRead,
  RoutePermissions.DamDashboardRead,
  RoutePermissions.NotificationsDashboardRead,
  RoutePermissions.SearchDashboardRead,
  RoutePermissions.ReportingDashboardRead,
] as const;

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
    permissions: [
      RoutePermissions.PlatformOperationsRead,
      RoutePermissions.PlatformHealthRead,
      RoutePermissions.PlatformAdministrationRead,
      RoutePermissions.IntegrationsCatalogRead,
    ],
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
    permissions: [...PERMISSION_CATALOG.map((p) => p.code), ...ADMIN_ROUTES],
  },
  {
    code: "moderator",
    name: "Moderator",
    group: "governance",
    parentCode: "editor",
    permissions: [RoutePermissions.CmsDashboardRead],
  },
  {
    code: "editor",
    name: "Editor",
    group: "governance",
    parentCode: null,
    permissions: [RoutePermissions.CmsDashboardRead],
  },
  {
    code: "auditor",
    name: "Auditor",
    group: "governance",
    parentCode: null,
    permissions: [
      ...ALL_READ,
      RoutePermissions.FinanceDashboardRead,
      RoutePermissions.ReportingReportsRead,
    ],
  },
  {
    code: "approver",
    name: "Approver",
    group: "governance",
    parentCode: null,
    permissions: [
      RoutePermissions.PlatformWorkflowsRead,
      RoutePermissions.PlatformApprovalsRead,
    ],
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
    permissions: [
      ...ALL_READ,
      RoutePermissions.ExecutiveDashboardRead,
      RoutePermissions.AnalyticsDashboardsRead,
      RoutePermissions.AnalyticsInsightsRead,
      RoutePermissions.ReportingReportsRead,
    ],
  },
  {
    code: "finance_manager",
    name: "Finance Manager",
    group: "management",
    parentCode: null,
    permissions: [
      ...modulePack("finance"),
      ...MANAGER_COMMON_ROUTES,
      RoutePermissions.FinanceDashboardRead,
    ],
  },
  {
    code: "hr_manager",
    name: "HR Manager",
    group: "management",
    parentCode: null,
    permissions: [
      ...MANAGER_COMMON_ROUTES,
      RoutePermissions.HrDashboardRead,
    ],
  },
  {
    code: "procurement_manager",
    name: "Procurement Manager",
    group: "management",
    parentCode: null,
    permissions: [
      ...modulePack("procurement"),
      ...moduleReadPack("inventory"),
      ...MANAGER_COMMON_ROUTES,
      RoutePermissions.ProcurementDashboardRead,
      RoutePermissions.InventoryDashboardRead,
    ],
  },
  {
    code: "warehouse_manager",
    name: "Warehouse Manager",
    group: "management",
    parentCode: null,
    permissions: [
      ...modulePack("inventory"),
      ...MANAGER_COMMON_ROUTES,
      RoutePermissions.InventoryDashboardRead,
    ],
  },
  {
    code: "manufacturing_manager",
    name: "Manufacturing Manager",
    group: "management",
    parentCode: null,
    permissions: [
      ...MANAGER_COMMON_ROUTES,
      RoutePermissions.ManufacturingDashboardRead,
    ],
  },
  {
    code: "sales_manager",
    name: "Sales Manager",
    group: "management",
    parentCode: null,
    permissions: [
      ...modulePack("sales"),
      ...modulePack("crm"),
      ...MANAGER_COMMON_ROUTES,
      RoutePermissions.SalesDashboardRead,
      RoutePermissions.CrmDashboardRead,
    ],
  },
  {
    code: "sales_representative",
    name: "Sales Representative",
    group: "management",
    parentCode: null,
    // Own/assigned record scoping is enforced in RC5.5; documented union risk.
    permissions: [
      ...modulePack("sales"),
      ...modulePack("crm"),
      RoutePermissions.CalendarEventsRead,
      RoutePermissions.SalesDashboardRead,
      RoutePermissions.CrmDashboardRead,
    ],
  },
  {
    code: "service_manager",
    name: "Service Manager",
    group: "management",
    parentCode: null,
    permissions: [
      ...modulePack("service"),
      ...MANAGER_COMMON_ROUTES,
      RoutePermissions.ServiceDashboardRead,
      RoutePermissions.CrmDashboardRead,
    ],
  },
  {
    code: "customer_support",
    name: "Customer Support",
    group: "management",
    parentCode: null,
    permissions: [
      ...moduleReadPack("service"),
      ...moduleReadPack("crm"),
      RoutePermissions.CalendarEventsRead,
      RoutePermissions.ServiceDashboardRead,
      RoutePermissions.CrmDashboardRead,
    ],
  },

  // Professional / partner (8) — grants deferred to RC5.5/RC8 record scoping.
  {
    code: "architect",
    name: "Architect",
    group: "partner",
    parentCode: null,
    permissions: [RoutePermissions.ProjectsDashboardRead],
  },
  {
    code: "interior_designer",
    name: "Interior Designer",
    group: "partner",
    parentCode: null,
    permissions: [RoutePermissions.ProjectsDashboardRead],
  },
  {
    code: "civil_engineer",
    name: "Civil Engineer",
    group: "partner",
    parentCode: null,
    permissions: [RoutePermissions.ProjectsDashboardRead],
  },
  {
    code: "contractor",
    name: "Contractor",
    group: "partner",
    parentCode: null,
    permissions: [RoutePermissions.ProjectsDashboardRead],
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
    permissions: [RoutePermissions.PortalCustomerPortalRead],
  },
  {
    code: "corporate_buyer",
    name: "Corporate Buyer",
    group: "partner",
    parentCode: null,
    permissions: [RoutePermissions.PortalCustomerPortalRead],
  },

  // Operational (6) — grants deferred to branch/location scoping (RC5.5).
  {
    code: "employee",
    name: "Employee",
    group: "operational",
    parentCode: null,
    permissions: [RoutePermissions.CalendarEventsRead],
  },
  {
    code: "production_staff",
    name: "Production Staff",
    group: "operational",
    parentCode: null,
    permissions: [RoutePermissions.ManufacturingDashboardRead],
  },
  {
    code: "warehouse_staff",
    name: "Warehouse Staff",
    group: "operational",
    parentCode: null,
    permissions: [RoutePermissions.InventoryDashboardRead],
  },
  {
    code: "showroom_staff",
    name: "Showroom Staff",
    group: "operational",
    parentCode: null,
    permissions: [
      RoutePermissions.SalesDashboardRead,
      RoutePermissions.CrmDashboardRead,
    ],
  },
  {
    code: "delivery_staff",
    name: "Delivery Staff",
    group: "operational",
    parentCode: null,
    permissions: [RoutePermissions.ServiceDashboardRead],
  },
  {
    code: "installation_staff",
    name: "Installation Staff",
    group: "operational",
    parentCode: null,
    permissions: [RoutePermissions.ServiceDashboardRead],
  },
];

/** All system role codes in catalog order (33 entries). */
export const SYSTEM_ROLE_CODES: readonly string[] = ROLE_CATALOG.map(
  (role) => role.code,
);
