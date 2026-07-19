import { lazy, type ComponentType } from "react";

function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\d]+ failed|error loading dynamically imported module/i.test(
    msg,
  );
}

/**
 * Named lazy import with one retry on stale-chunk failures (common after
 * Vite HMR / redeploy). Hard refresh recovers; this soft-retries first.
 */
function lazyNamed<T extends Record<string, unknown>, K extends keyof T>(
  factory: () => Promise<T>,
  name: K,
) {
  return lazy(async () => {
    try {
      const m = await factory();
      return { default: m[name] as ComponentType };
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;
      await new Promise((r) => setTimeout(r, 250));
      const m = await factory();
      return { default: m[name] as ComponentType };
    }
  });
}

export const LazyDashboardPage = lazyNamed(
  () => import("../dashboard/DashboardPage"),
  "DashboardPage",
);
export const LazyPersonalWorkspacePage = lazyNamed(
  () => import("../dashboard/PersonalWorkspace"),
  "PersonalWorkspacePage",
);
export const LazyCalendarHubPage = lazyNamed(
  () => import("../productivity/CalendarHubPage"),
  "CalendarHubPage",
);
export const LazyPreferencesPage = lazyNamed(
  () => import("../productivity/PreferencesPage"),
  "PreferencesPage",
);
export const LazyAnalyticsCenterPage = lazyNamed(
  () => import("../analytics/AnalyticsCenter"),
  "AnalyticsCenterPage",
);
export const LazyReportsCenterPage = lazyNamed(
  () => import("../analytics/ReportsCenter"),
  "ReportsCenterPage",
);
export const LazyInsightsCenterPage = lazyNamed(
  () => import("../analytics/InsightsCenter"),
  "InsightsCenterPage",
);
export const LazyAiRoutes = lazyNamed(() => import("../ai/AiRoutes"), "AiRoutes");
export const LazyAiSettingsPage = lazyNamed(() => import("../ai/AiRoutes"), "AiSettingsPage");
export const LazyIntegrationsRoutes = lazyNamed(
  () => import("../integrations/IntegrationsRoutes"),
  "IntegrationsRoutes",
);
export const LazyPlatformRoutes = lazyNamed(
  () => import("../platform/PlatformRoutes"),
  "PlatformRoutes",
);
export const LazyOnboardingRoutes = lazyNamed(
  () => import("../platform/OnboardingRoutes"),
  "OnboardingRoutes",
);
export const LazyAdminRoutes = lazyNamed(() => import("../platform/AdminRoutes"), "AdminRoutes");
export const LazyPortalRoutes = lazyNamed(() => import("../platform/PortalRoutes"), "PortalRoutes");
export const LazySalesPage = lazyNamed(() => import("../modules/pages"), "SalesPage");
export const LazyProcurementPage = lazyNamed(
  () => import("../modules/pages"),
  "ProcurementPage",
);
export const LazyInventoryPage = lazyNamed(() => import("../modules/pages"), "InventoryPage");
export const LazyFinancePage = lazyNamed(() => import("../modules/pages"), "FinancePage");
export const LazyErpProjectsPage = lazyNamed(() => import("../modules/pages"), "ProjectsPage");
export const LazyCrmPage = lazyNamed(() => import("../modules/pages"), "CrmPage");
export const LazyServicePage = lazyNamed(() => import("../modules/pages"), "ServicePage");
export const LazyHrPage = lazyNamed(() => import("../modules/pages"), "HrPage");
export const LazyErpManufacturingPage = lazyNamed(
  () => import("../modules/pages"),
  "ManufacturingPage",
);
export const LazyCmsPage = lazyNamed(() => import("../modules/pages"), "CmsPage");
export const LazyNotificationsModulePage = lazyNamed(
  () => import("../modules/pages"),
  "NotificationsModulePage",
);
export const LazySearchModulePage = lazyNamed(
  () => import("../modules/pages"),
  "SearchModulePage",
);
export const LazyReportingModulePage = lazyNamed(
  () => import("../modules/pages"),
  "ReportingModulePage",
);
export const LazyWorkflowPage = lazyNamed(() => import("../pages/platform"), "WorkflowPage");
export const LazyApprovalsPage = lazyNamed(() => import("../pages/platform"), "ApprovalsPage");
export const LazyDamPage = lazyNamed(() => import("../pages/DamPage"), "DamPage");
export const LazySecurityCenterPage = lazyNamed(
  () => import("../auth/SecurityCenterPage"),
  "SecurityCenterPage",
);
export const LazyEmailVerificationPage = lazyNamed(
  () => import("../auth/EmailVerificationPage"),
  "EmailVerificationPage",
);
export const LazyMfaPage = lazyNamed(() => import("../auth/MfaPage"), "MfaPage");

export const LazyHomePage = lazyNamed(() => import("../marketing/pages/HomePage"), "HomePage");
export const LazyProductsPage = lazyNamed(
  () => import("../marketing/pages/ProductsPage"),
  "ProductsPage",
);
export const LazyProductDetailPage = lazyNamed(
  () => import("../marketing/pages/ProductsPage"),
  "ProductDetailPage",
);
export const LazyProjectsPage = lazyNamed(
  () => import("../marketing/pages/ProjectsPage"),
  "ProjectsPage",
);
export const LazyProjectDetailPage = lazyNamed(
  () => import("../marketing/pages/ProjectsPage"),
  "ProjectDetailPage",
);
export const LazyAboutPage = lazyNamed(() => import("../marketing/pages/CompanyPages"), "AboutPage");
export const LazyStoryPage = lazyNamed(() => import("../marketing/pages/CompanyPages"), "StoryPage");
export const LazyLeadershipPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "LeadershipPage",
);
export const LazyManufacturingPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "ManufacturingPage",
);
export const LazyFactoryPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "FactoryPage",
);
export const LazyTechnologyPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "TechnologyPage",
);
export const LazySustainabilityPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "SustainabilityPage",
);
export const LazyQualityPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "QualityPage",
);
export const LazyCertificationsPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "CertificationsPage",
);
export const LazyCareersPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "CareersPage",
);
export const LazyPartnersPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "PartnersPage",
);
export const LazyDistributorsPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "DistributorsPage",
);
export const LazyNewsPage = lazyNamed(() => import("../marketing/pages/CompanyPages"), "NewsPage");
export const LazyBlogPage = lazyNamed(() => import("../marketing/pages/BlogPages"), "BlogIndexPage");
export const LazyBlogArticlePage = lazyNamed(
  () => import("../marketing/pages/BlogPages"),
  "BlogArticlePage",
);
export const LazyEventsPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "EventsPage",
);
export const LazyFaqPage = lazyNamed(() => import("../marketing/pages/CompanyPages"), "FaqPage");
export const LazyPrivacyPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "PrivacyPage",
);
export const LazyTermsPage = lazyNamed(() => import("../marketing/pages/CompanyPages"), "TermsPage");
export const LazyContactPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "ContactPage",
);
export const LazyQuotePage = lazyNamed(() => import("../marketing/pages/CompanyPages"), "QuotePage");
export const LazyDemoPage = lazyNamed(() => import("../marketing/pages/CompanyPages"), "DemoPage");
export const LazyNotFoundPage = lazyNamed(
  () => import("../marketing/pages/CompanyPages"),
  "NotFoundPage",
);
export const LazyFurnitureHubPage = lazyNamed(
  () => import("../marketing/pages/CategoryPage"),
  "FurnitureHubPage",
);
export const LazyCategoryPage = lazyNamed(
  () => import("../marketing/pages/CategoryPage"),
  "CategoryPage",
);
export const LazyComparePage = lazyNamed(
  () => import("../marketing/pages/ComparePage"),
  "ComparePage",
);
export const LazyWishlistPage = lazyNamed(
  () => import("../marketing/pages/WishlistPage"),
  "WishlistPage",
);
export const LazyBudgetPlannerPage = lazyNamed(
  () => import("../marketing/pages/BudgetPlannerPage"),
  "BudgetPlannerPage",
);
export const LazyConsultantPage = lazyNamed(
  () => import("../marketing/pages/ConsultantPage"),
  "ConsultantPage",
);
export const LazyDownloadsPage = lazyNamed(
  () => import("../marketing/pages/DownloadsPage"),
  "DownloadsPage",
);
export const LazyCookiesPage = lazyNamed(
  () => import("../marketing/pages/DownloadsPage"),
  "CookiesPage",
);
