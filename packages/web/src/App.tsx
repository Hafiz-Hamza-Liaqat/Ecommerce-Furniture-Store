import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { LoginPage } from "./auth/LoginPage";
import { PasswordResetPage } from "./auth/PasswordResetPage";
import { EmailVerificationPage } from "./auth/EmailVerificationPage";
import { MfaPage } from "./auth/MfaPage";
import { DashboardPage } from "./dashboard/DashboardPage";
import {
  CmsPage,
  CrmPage,
  FinancePage,
  HrPage,
  InventoryPage,
  ManufacturingPage,
  ProcurementPage,
  ProjectsPage,
  SalesPage,
  ServicePage,
} from "./modules/pages";
import {
  ApprovalsPage,
  NotificationsPage,
  ReportingPage,
  SearchPage,
  WorkflowPage,
} from "./pages/platform";
import { DamPage } from "./pages/DamPage";
import { useSession } from "./state/session";

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
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="procurement" element={<ProcurementPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="crm" element={<CrmPage />} />
          <Route path="service" element={<ServicePage />} />
          <Route path="hr" element={<HrPage />} />
          <Route path="manufacturing" element={<ManufacturingPage />} />
          <Route path="cms" element={<CmsPage />} />
          <Route path="dam" element={<DamPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="reporting" element={<ReportingPage />} />
          <Route path="workflow" element={<WorkflowPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="account/email-verification" element={<EmailVerificationPage />} />
          <Route path="account/mfa" element={<MfaPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
