import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { LoginPage } from "./auth/LoginPage";
import { PasswordResetPage } from "./auth/PasswordResetPage";
import { EmailVerificationPage } from "./auth/EmailVerificationPage";
import { MfaPage } from "./auth/MfaPage";
import { DashboardPage } from "./dashboard/DashboardPage";
import { PersonalWorkspacePage } from "./dashboard/PersonalWorkspace";
import {
  CmsPage,
  CrmPage,
  FinancePage,
  HrPage,
  InventoryPage,
  ManufacturingPage as ErpManufacturingPage,
  NotificationsModulePage,
  ProcurementPage,
  ProjectsPage as ErpProjectsPage,
  ReportingModulePage,
  SalesPage,
  SearchModulePage,
  ServicePage,
} from "./modules/pages";
import {
  ApprovalsPage,
  WorkflowPage,
} from "./pages/platform";
import { DamPage } from "./pages/DamPage";
import { PreferencesPage } from "./productivity/PreferencesPage";
import { CalendarHubPage } from "./productivity/CalendarHubPage";
import { AnalyticsCenterPage } from "./analytics/AnalyticsCenter";
import { ReportsCenterPage } from "./analytics/ReportsCenter";
import { InsightsCenterPage } from "./analytics/InsightsCenter";
import { AiRoutes, AiSettingsPage } from "./ai/AiRoutes";
import { IntegrationsRoutes } from "./integrations/IntegrationsRoutes";
import { PlatformRoutes } from "./platform/PlatformRoutes";
import { OnboardingRoutes } from "./platform/OnboardingRoutes";
import { AdminRoutes } from "./platform/AdminRoutes";
import { PortalRoutes } from "./platform/PortalRoutes";
import { useSession } from "./state/session";
import { MarketingShell } from "./marketing/MarketingShell";
import { HomePage } from "./marketing/pages/HomePage";
import { ProductDetailPage, ProductsPage } from "./marketing/pages/ProductsPage";
import { ProjectDetailPage, ProjectsPage } from "./marketing/pages/ProjectsPage";
import {
  AboutPage,
  BlogPage,
  CareersPage,
  CertificationsPage,
  ContactPage,
  DemoPage,
  DistributorsPage,
  EventsPage,
  FactoryPage,
  FaqPage,
  LeadershipPage,
  ManufacturingPage,
  NewsPage,
  NotFoundPage,
  PartnersPage,
  PrivacyPage,
  QualityPage,
  QuotePage,
  StoryPage,
  SustainabilityPage,
  TechnologyPage,
  TermsPage,
} from "./marketing/pages/CompanyPages";

function RequireAuth() {
  const { tokens } = useSession();
  if (!tokens?.sessionId) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/password-reset" element={<PasswordResetPage />} />
      <Route path="/onboarding/*" element={<OnboardingRoutes />} />
      <Route path="/admin/platform/*" element={<AdminRoutes />} />
      <Route path="/portal/*" element={<PortalRoutes />} />

      <Route path="/app" element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="me" element={<PersonalWorkspacePage />} />
          <Route path="calendar" element={<CalendarHubPage />} />
          <Route path="preferences" element={<PreferencesPage />} />
          <Route path="analytics/*" element={<AnalyticsCenterPage />} />
          <Route path="reports/*" element={<ReportsCenterPage />} />
          <Route path="insights" element={<InsightsCenterPage />} />
          <Route path="ai/*" element={<AiRoutes />} />
          <Route path="settings/ai" element={<AiSettingsPage />} />
          <Route path="integrations/*" element={<IntegrationsRoutes />} />
          <Route path="platform/*" element={<PlatformRoutes />} />
          <Route path="sales/*" element={<SalesPage />} />
          <Route path="procurement/*" element={<ProcurementPage />} />
          <Route path="inventory/*" element={<InventoryPage />} />
          <Route path="finance/*" element={<FinancePage />} />
          <Route path="projects/*" element={<ErpProjectsPage />} />
          <Route path="crm/*" element={<CrmPage />} />
          <Route path="service/*" element={<ServicePage />} />
          <Route path="hr/*" element={<HrPage />} />
          <Route path="manufacturing/*" element={<ErpManufacturingPage />} />
          <Route path="cms/*" element={<CmsPage />} />
          <Route path="dam/*" element={<DamPage />} />
          <Route path="notifications/*" element={<NotificationsModulePage />} />
          <Route path="search/*" element={<SearchModulePage />} />
          <Route path="reporting/*" element={<ReportingModulePage />} />
          <Route path="workflow" element={<WorkflowPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="account/email-verification" element={<EmailVerificationPage />} />
          <Route path="account/mfa" element={<MfaPage />} />
        </Route>
      </Route>

      <Route element={<MarketingShell />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="story" element={<StoryPage />} />
        <Route path="leadership" element={<LeadershipPage />} />
        <Route path="manufacturing" element={<ManufacturingPage />} />
        <Route path="factory" element={<FactoryPage />} />
        <Route path="technology" element={<TechnologyPage />} />
        <Route path="sustainability" element={<SustainabilityPage />} />
        <Route path="quality" element={<QualityPage />} />
        <Route path="certifications" element={<CertificationsPage />} />
        <Route path="careers" element={<CareersPage />} />
        <Route path="partners" element={<PartnersPage />} />
        <Route path="distributors" element={<DistributorsPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="quote" element={<QuotePage />} />
        <Route path="demo" element={<DemoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
