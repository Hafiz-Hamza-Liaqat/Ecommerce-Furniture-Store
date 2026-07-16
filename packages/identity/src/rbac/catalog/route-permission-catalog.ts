/**
 * Versioned, inactive route-permission catalog prerequisite for RC5.2.
 *
 * This file declares metadata only. It does not evaluate permissions, protect
 * routes, filter navigation, or change Policy Engine decisions.
 */

export const ROUTE_PERMISSION_CATALOG_VERSION = "rc5.route-permissions.v1";

export const RoutePermissions = {
  ExecutiveDashboardRead: "executive.dashboard.read",
  CalendarEventsRead: "calendar.events.read",
  AnalyticsDashboardsRead: "analytics.dashboards.read",
  AnalyticsDashboardsConfigure: "analytics.dashboards.configure",
  AnalyticsInsightsRead: "analytics.insights.read",
  ReportingReportsRead: "reporting.reports.read",
  AiAssistantUse: "ai.assistant.use",
  AiUsageRead: "ai.usage.read",
  AiSettingsManage: "ai.settings.manage",
  IntegrationsCatalogRead: "integrations.catalog.read",
  PlatformOperationsRead: "platform.operations.read",
  PlatformHealthRead: "platform.health.read",
  PlatformWorkflowsRead: "platform.workflows.read",
  PlatformApprovalsRead: "platform.approvals.read",
  PortalCustomerPortalRead: "portal.customer_portal.read",
  PlatformAdministrationRead: "platform.administration.read",
  SalesDashboardRead: "sales.dashboard.read",
  ProcurementDashboardRead: "procurement.dashboard.read",
  InventoryDashboardRead: "inventory.dashboard.read",
  FinanceDashboardRead: "finance.dashboard.read",
  ProjectsDashboardRead: "projects.dashboard.read",
  CrmDashboardRead: "crm.dashboard.read",
  ServiceDashboardRead: "service.dashboard.read",
  HrDashboardRead: "hr.dashboard.read",
  ManufacturingDashboardRead: "manufacturing.dashboard.read",
  CmsDashboardRead: "cms.dashboard.read",
  DamDashboardRead: "dam.dashboard.read",
  NotificationsDashboardRead: "notifications.dashboard.read",
  SearchDashboardRead: "search.dashboard.read",
  ReportingDashboardRead: "reporting.dashboard.read",
} as const;

export type RoutePermissionCode =
  (typeof RoutePermissions)[keyof typeof RoutePermissions];

export type RoutePermissionDefinition = {
  readonly code: RoutePermissionCode;
  readonly module: string;
  readonly description: string;
};

function routePermission(
  code: RoutePermissionCode,
  description: string,
): RoutePermissionDefinition {
  return { code, module: code.split(".")[0]!, description };
}

/** Canonical permissions needed by currently protected route surfaces. */
export const ROUTE_PERMISSION_DEFINITIONS: readonly RoutePermissionDefinition[] =
  [
    routePermission(
      RoutePermissions.ExecutiveDashboardRead,
      "Open the executive dashboard route",
    ),
    routePermission(
      RoutePermissions.CalendarEventsRead,
      "Open the enterprise calendar route",
    ),
    routePermission(
      RoutePermissions.AnalyticsDashboardsRead,
      "Open analytics dashboard routes",
    ),
    routePermission(
      RoutePermissions.AnalyticsDashboardsConfigure,
      "Open the analytics dashboard builder route",
    ),
    routePermission(
      RoutePermissions.AnalyticsInsightsRead,
      "Open the insights route",
    ),
    routePermission(
      RoutePermissions.ReportingReportsRead,
      "Open report center routes",
    ),
    routePermission(
      RoutePermissions.AiAssistantUse,
      "Open AI assistant routes",
    ),
    routePermission(RoutePermissions.AiUsageRead, "Open the AI usage route"),
    routePermission(
      RoutePermissions.AiSettingsManage,
      "Open the AI settings route",
    ),
    routePermission(
      RoutePermissions.IntegrationsCatalogRead,
      "Open integration routes",
    ),
    routePermission(
      RoutePermissions.PlatformOperationsRead,
      "Open platform operations routes",
    ),
    routePermission(
      RoutePermissions.PlatformHealthRead,
      "Open the platform deployment health route",
    ),
    routePermission(
      RoutePermissions.PlatformWorkflowsRead,
      "Open the workflow route",
    ),
    routePermission(
      RoutePermissions.PlatformApprovalsRead,
      "Open the approvals route",
    ),
    routePermission(
      RoutePermissions.PortalCustomerPortalRead,
      "Open the customer portal route",
    ),
    routePermission(
      RoutePermissions.PlatformAdministrationRead,
      "Open the platform administration route",
    ),
    routePermission(
      RoutePermissions.SalesDashboardRead,
      "Open sales module routes",
    ),
    routePermission(
      RoutePermissions.ProcurementDashboardRead,
      "Open procurement module routes",
    ),
    routePermission(
      RoutePermissions.InventoryDashboardRead,
      "Open inventory module routes",
    ),
    routePermission(
      RoutePermissions.FinanceDashboardRead,
      "Open finance module routes",
    ),
    routePermission(
      RoutePermissions.ProjectsDashboardRead,
      "Open projects module routes",
    ),
    routePermission(
      RoutePermissions.CrmDashboardRead,
      "Open CRM module routes",
    ),
    routePermission(
      RoutePermissions.ServiceDashboardRead,
      "Open service module routes",
    ),
    routePermission(RoutePermissions.HrDashboardRead, "Open HR module routes"),
    routePermission(
      RoutePermissions.ManufacturingDashboardRead,
      "Open manufacturing module routes",
    ),
    routePermission(
      RoutePermissions.CmsDashboardRead,
      "Open CMS module routes",
    ),
    routePermission(
      RoutePermissions.DamDashboardRead,
      "Open DAM module routes",
    ),
    routePermission(
      RoutePermissions.NotificationsDashboardRead,
      "Open notifications module routes",
    ),
    routePermission(
      RoutePermissions.SearchDashboardRead,
      "Open search module routes",
    ),
    routePermission(
      RoutePermissions.ReportingDashboardRead,
      "Open reporting module routes",
    ),
  ];

export type RouteAccessDefinition = {
  readonly path: string;
  readonly match: "exact" | "prefix";
  readonly requiredPermissions: readonly RoutePermissionCode[];
};

/**
 * Complete metadata for routes currently protected by session authentication.
 * Empty `requiredPermissions` means authentication-only, exactly as documented.
 * Specific child routes precede broader prefixes for future deterministic use.
 */
export const ROUTE_ACCESS_CATALOG: readonly RouteAccessDefinition[] = [
  {
    path: "/app/analytics/builder",
    match: "exact",
    requiredPermissions: [
      RoutePermissions.AnalyticsDashboardsRead,
      RoutePermissions.AnalyticsDashboardsConfigure,
    ],
  },
  {
    path: "/app/ai/usage",
    match: "exact",
    requiredPermissions: [
      RoutePermissions.AiAssistantUse,
      RoutePermissions.AiUsageRead,
    ],
  },
  {
    path: "/app/platform/deployment",
    match: "exact",
    requiredPermissions: [
      RoutePermissions.PlatformOperationsRead,
      RoutePermissions.PlatformHealthRead,
    ],
  },
  {
    path: "/app",
    match: "exact",
    requiredPermissions: [RoutePermissions.ExecutiveDashboardRead],
  },
  { path: "/app/me", match: "exact", requiredPermissions: [] },
  {
    path: "/app/calendar",
    match: "exact",
    requiredPermissions: [RoutePermissions.CalendarEventsRead],
  },
  { path: "/app/preferences", match: "exact", requiredPermissions: [] },
  {
    path: "/app/analytics",
    match: "prefix",
    requiredPermissions: [RoutePermissions.AnalyticsDashboardsRead],
  },
  {
    path: "/app/reports",
    match: "prefix",
    requiredPermissions: [RoutePermissions.ReportingReportsRead],
  },
  {
    path: "/app/insights",
    match: "exact",
    requiredPermissions: [RoutePermissions.AnalyticsInsightsRead],
  },
  {
    path: "/app/ai",
    match: "prefix",
    requiredPermissions: [RoutePermissions.AiAssistantUse],
  },
  {
    path: "/app/settings/ai",
    match: "exact",
    requiredPermissions: [RoutePermissions.AiSettingsManage],
  },
  {
    path: "/app/integrations",
    match: "prefix",
    requiredPermissions: [RoutePermissions.IntegrationsCatalogRead],
  },
  {
    path: "/app/platform",
    match: "prefix",
    requiredPermissions: [RoutePermissions.PlatformOperationsRead],
  },
  {
    path: "/app/sales",
    match: "prefix",
    requiredPermissions: [RoutePermissions.SalesDashboardRead],
  },
  {
    path: "/app/procurement",
    match: "prefix",
    requiredPermissions: [RoutePermissions.ProcurementDashboardRead],
  },
  {
    path: "/app/inventory",
    match: "prefix",
    requiredPermissions: [RoutePermissions.InventoryDashboardRead],
  },
  {
    path: "/app/finance",
    match: "prefix",
    requiredPermissions: [RoutePermissions.FinanceDashboardRead],
  },
  {
    path: "/app/projects",
    match: "prefix",
    requiredPermissions: [RoutePermissions.ProjectsDashboardRead],
  },
  {
    path: "/app/crm",
    match: "prefix",
    requiredPermissions: [RoutePermissions.CrmDashboardRead],
  },
  {
    path: "/app/service",
    match: "prefix",
    requiredPermissions: [RoutePermissions.ServiceDashboardRead],
  },
  {
    path: "/app/hr",
    match: "prefix",
    requiredPermissions: [RoutePermissions.HrDashboardRead],
  },
  {
    path: "/app/manufacturing",
    match: "prefix",
    requiredPermissions: [RoutePermissions.ManufacturingDashboardRead],
  },
  {
    path: "/app/cms",
    match: "prefix",
    requiredPermissions: [RoutePermissions.CmsDashboardRead],
  },
  {
    path: "/app/dam",
    match: "prefix",
    requiredPermissions: [RoutePermissions.DamDashboardRead],
  },
  {
    path: "/app/notifications",
    match: "prefix",
    requiredPermissions: [RoutePermissions.NotificationsDashboardRead],
  },
  {
    path: "/app/search",
    match: "prefix",
    requiredPermissions: [RoutePermissions.SearchDashboardRead],
  },
  {
    path: "/app/reporting",
    match: "prefix",
    requiredPermissions: [RoutePermissions.ReportingDashboardRead],
  },
  {
    path: "/app/workflow",
    match: "exact",
    requiredPermissions: [RoutePermissions.PlatformWorkflowsRead],
  },
  {
    path: "/app/approvals",
    match: "exact",
    requiredPermissions: [RoutePermissions.PlatformApprovalsRead],
  },
  {
    path: "/app/account/email-verification",
    match: "exact",
    requiredPermissions: [],
  },
  { path: "/app/account/mfa", match: "exact", requiredPermissions: [] },
  { path: "/app/account/security", match: "exact", requiredPermissions: [] },
  {
    path: "/portal",
    match: "prefix",
    requiredPermissions: [RoutePermissions.PortalCustomerPortalRead],
  },
  {
    path: "/admin/platform",
    match: "prefix",
    requiredPermissions: [RoutePermissions.PlatformAdministrationRead],
  },
];

export const ROUTE_PERMISSION_CODES: readonly RoutePermissionCode[] =
  ROUTE_PERMISSION_DEFINITIONS.map((definition) => definition.code);
