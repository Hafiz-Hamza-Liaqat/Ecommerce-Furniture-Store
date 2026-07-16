import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { AppShell } from "./shell/AppShell";
import { LoginPage } from "./auth/LoginPage";
import { RegisterPage } from "./auth/RegisterPage";
import { PasswordResetPage } from "./auth/PasswordResetPage";
import { useSession } from "./state/session";
import { MarketingShell } from "./marketing/MarketingShell";
import { RouteSuspense } from "./components/EnterpriseError";
import {
  RequireRoutePermission,
  RequireRoutePermissionElement,
} from "./auth/RequirePermission";
import {
  LazyAdminRoutes,
  LazyAiRoutes,
  LazyAiSettingsPage,
  LazyAnalyticsCenterPage,
  LazyApprovalsPage,
  LazyCalendarHubPage,
  LazyAboutPage,
  LazyBlogPage,
  LazyCareersPage,
  LazyCertificationsPage,
  LazyCmsPage,
  LazyContactPage,
  LazyCrmPage,
  LazyDemoPage,
  LazyDistributorsPage,
  LazyEventsPage,
  LazyFactoryPage,
  LazyFaqPage,
  LazyLeadershipPage,
  LazyManufacturingPage,
  LazyNewsPage,
  LazyNotFoundPage,
  LazyPartnersPage,
  LazyPrivacyPage,
  LazyQualityPage,
  LazyQuotePage,
  LazyStoryPage,
  LazySustainabilityPage,
  LazyTechnologyPage,
  LazyTermsPage,
  LazyDamPage,
  LazyDashboardPage,
  LazyEmailVerificationPage,
  LazyErpManufacturingPage,
  LazyErpProjectsPage,
  LazyFinancePage,
  LazyHomePage,
  LazyHrPage,
  LazyInsightsCenterPage,
  LazyIntegrationsRoutes,
  LazyInventoryPage,
  LazyMfaPage,
  LazyNotificationsModulePage,
  LazyOnboardingRoutes,
  LazyPersonalWorkspacePage,
  LazyPlatformRoutes,
  LazyPortalRoutes,
  LazyPreferencesPage,
  LazyProcurementPage,
  LazyProductDetailPage,
  LazyProductsPage,
  LazyProjectDetailPage,
  LazyProjectsPage,
  LazyReportingModulePage,
  LazyReportsCenterPage,
  LazySalesPage,
  LazySearchModulePage,
  LazySecurityCenterPage,
  LazyServicePage,
  LazyWorkflowPage,
} from "./routes/lazy";

function RequireAuth() {
  const { tokens } = useSession();
  if (!tokens?.sessionId) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function RequireAuthElement({ children }: { readonly children: ReactNode }) {
  const { tokens } = useSession();
  if (!tokens?.sessionId) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Lazy({ children }: { readonly children: ReactNode }) {
  return <RouteSuspense>{children}</RouteSuspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/password-reset" element={<PasswordResetPage />} />
      <Route
        path="/onboarding/*"
        element={
          <Lazy>
            <LazyOnboardingRoutes />
          </Lazy>
        }
      />
      <Route
        path="/admin/platform/*"
        element={
          <RequireAuthElement>
            <RequireRoutePermissionElement>
              <Lazy>
                <LazyAdminRoutes />
              </Lazy>
            </RequireRoutePermissionElement>
          </RequireAuthElement>
        }
      />
      <Route
        path="/portal/*"
        element={
          <RequireAuthElement>
            <RequireRoutePermissionElement>
              <Lazy>
                <LazyPortalRoutes />
              </Lazy>
            </RequireRoutePermissionElement>
          </RequireAuthElement>
        }
      />

      <Route path="/app" element={<RequireAuth />}>
        <Route element={<AppShell />}>
          {/* RC5.2 presentation guard: catalog-driven permission gating for
              every /app surface, including direct URL deep links. Renders the
              Forbidden experience inside the shell; nav is not filtered. */}
          <Route element={<RequireRoutePermission />}>
          <Route
            index
            element={
              <Lazy>
                <LazyDashboardPage />
              </Lazy>
            }
          />
          <Route
            path="me"
            element={
              <Lazy>
                <LazyPersonalWorkspacePage />
              </Lazy>
            }
          />
          <Route
            path="calendar"
            element={
              <Lazy>
                <LazyCalendarHubPage />
              </Lazy>
            }
          />
          <Route
            path="preferences"
            element={
              <Lazy>
                <LazyPreferencesPage />
              </Lazy>
            }
          />
          <Route
            path="analytics/*"
            element={
              <Lazy>
                <LazyAnalyticsCenterPage />
              </Lazy>
            }
          />
          <Route
            path="reports/*"
            element={
              <Lazy>
                <LazyReportsCenterPage />
              </Lazy>
            }
          />
          <Route
            path="insights"
            element={
              <Lazy>
                <LazyInsightsCenterPage />
              </Lazy>
            }
          />
          <Route
            path="ai/*"
            element={
              <Lazy>
                <LazyAiRoutes />
              </Lazy>
            }
          />
          <Route
            path="settings/ai"
            element={
              <Lazy>
                <LazyAiSettingsPage />
              </Lazy>
            }
          />
          <Route
            path="integrations/*"
            element={
              <Lazy>
                <LazyIntegrationsRoutes />
              </Lazy>
            }
          />
          <Route
            path="platform/*"
            element={
              <Lazy>
                <LazyPlatformRoutes />
              </Lazy>
            }
          />
          <Route
            path="sales/*"
            element={
              <Lazy>
                <LazySalesPage />
              </Lazy>
            }
          />
          <Route
            path="procurement/*"
            element={
              <Lazy>
                <LazyProcurementPage />
              </Lazy>
            }
          />
          <Route
            path="inventory/*"
            element={
              <Lazy>
                <LazyInventoryPage />
              </Lazy>
            }
          />
          <Route
            path="finance/*"
            element={
              <Lazy>
                <LazyFinancePage />
              </Lazy>
            }
          />
          <Route
            path="projects/*"
            element={
              <Lazy>
                <LazyErpProjectsPage />
              </Lazy>
            }
          />
          <Route
            path="crm/*"
            element={
              <Lazy>
                <LazyCrmPage />
              </Lazy>
            }
          />
          <Route
            path="service/*"
            element={
              <Lazy>
                <LazyServicePage />
              </Lazy>
            }
          />
          <Route
            path="hr/*"
            element={
              <Lazy>
                <LazyHrPage />
              </Lazy>
            }
          />
          <Route
            path="manufacturing/*"
            element={
              <Lazy>
                <LazyErpManufacturingPage />
              </Lazy>
            }
          />
          <Route
            path="cms/*"
            element={
              <Lazy>
                <LazyCmsPage />
              </Lazy>
            }
          />
          <Route
            path="dam/*"
            element={
              <Lazy>
                <LazyDamPage />
              </Lazy>
            }
          />
          <Route
            path="notifications/*"
            element={
              <Lazy>
                <LazyNotificationsModulePage />
              </Lazy>
            }
          />
          <Route
            path="search/*"
            element={
              <Lazy>
                <LazySearchModulePage />
              </Lazy>
            }
          />
          <Route
            path="reporting/*"
            element={
              <Lazy>
                <LazyReportingModulePage />
              </Lazy>
            }
          />
          <Route
            path="workflow"
            element={
              <Lazy>
                <LazyWorkflowPage />
              </Lazy>
            }
          />
          <Route
            path="approvals"
            element={
              <Lazy>
                <LazyApprovalsPage />
              </Lazy>
            }
          />
          <Route
            path="account/email-verification"
            element={
              <Lazy>
                <LazyEmailVerificationPage />
              </Lazy>
            }
          />
          <Route
            path="account/mfa"
            element={
              <Lazy>
                <LazyMfaPage />
              </Lazy>
            }
          />
          <Route
            path="account/security"
            element={
              <Lazy>
                <LazySecurityCenterPage />
              </Lazy>
            }
          />
          </Route>
        </Route>
      </Route>

      <Route element={<MarketingShell />}>
        <Route
          index
          element={
            <Lazy>
              <LazyHomePage />
            </Lazy>
          }
        />
        <Route
          path="products"
          element={
            <Lazy>
              <LazyProductsPage />
            </Lazy>
          }
        />
        <Route
          path="products/:productId"
          element={
            <Lazy>
              <LazyProductDetailPage />
            </Lazy>
          }
        />
        <Route
          path="projects"
          element={
            <Lazy>
              <LazyProjectsPage />
            </Lazy>
          }
        />
        <Route
          path="projects/:projectId"
          element={
            <Lazy>
              <LazyProjectDetailPage />
            </Lazy>
          }
        />
        <Route path="about" element={<Lazy><LazyAboutPage /></Lazy>} />
        <Route path="story" element={<Lazy><LazyStoryPage /></Lazy>} />
        <Route path="leadership" element={<Lazy><LazyLeadershipPage /></Lazy>} />
        <Route path="manufacturing" element={<Lazy><LazyManufacturingPage /></Lazy>} />
        <Route path="factory" element={<Lazy><LazyFactoryPage /></Lazy>} />
        <Route path="technology" element={<Lazy><LazyTechnologyPage /></Lazy>} />
        <Route path="sustainability" element={<Lazy><LazySustainabilityPage /></Lazy>} />
        <Route path="quality" element={<Lazy><LazyQualityPage /></Lazy>} />
        <Route path="certifications" element={<Lazy><LazyCertificationsPage /></Lazy>} />
        <Route path="careers" element={<Lazy><LazyCareersPage /></Lazy>} />
        <Route path="partners" element={<Lazy><LazyPartnersPage /></Lazy>} />
        <Route path="distributors" element={<Lazy><LazyDistributorsPage /></Lazy>} />
        <Route path="news" element={<Lazy><LazyNewsPage /></Lazy>} />
        <Route path="blog" element={<Lazy><LazyBlogPage /></Lazy>} />
        <Route path="events" element={<Lazy><LazyEventsPage /></Lazy>} />
        <Route path="faq" element={<Lazy><LazyFaqPage /></Lazy>} />
        <Route path="privacy" element={<Lazy><LazyPrivacyPage /></Lazy>} />
        <Route path="terms" element={<Lazy><LazyTermsPage /></Lazy>} />
        <Route path="contact" element={<Lazy><LazyContactPage /></Lazy>} />
        <Route path="quote" element={<Lazy><LazyQuotePage /></Lazy>} />
        <Route path="demo" element={<Lazy><LazyDemoPage /></Lazy>} />
        <Route path="*" element={<Lazy><LazyNotFoundPage /></Lazy>} />
      </Route>
    </Routes>
  );
}
