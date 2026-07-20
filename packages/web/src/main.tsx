import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./App";
import { SessionProvider } from "./state/session";
import { RouteAwareErrorBoundary } from "./a11y/AppErrorBoundary";
import { OfflineBanner } from "./a11y/OfflineBanner";
import "./styles/tokens/index.css";
import "./styles/tokens/typography.css";
import "./styles/tokens/button-system.css";
import "./styles/tokens/workspace-theme.css";
import "./styles/tokens/footer-trust.css";
import "./brand/brand.css";
import "./styles/enterprise-tokens.css";
import "./styles/global.css";
import "./styles/components.css";
import "./styles/workspace.css";
import "./styles/enterprise.css";
import "./styles/modules.css";
import "./styles/productivity.css";
import "./styles/analytics.css";
import "./styles/ai.css";
import "./styles/integrations.css";
import "./styles/platform.css";
import "./styles/marketing.css";
import "./styles/production-quality.css";
import "./styles/premium-ui.css";
import "./styles/blog.css";
import { registerPlatformServiceWorker, PwaUpdatePrompt } from "./platform/MobileReadiness";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element missing");
}

const storedTheme = localStorage.getItem("afh.web.theme");
document.documentElement.dataset.theme =
  storedTheme === "dark" ? "dark" : "light";

registerPlatformServiceWorker();

createRoot(root).render(
  <StrictMode>
    <SessionProvider>
      <BrowserRouter>
        <RouteAwareErrorBoundary>
          <OfflineBanner />
          <AppRoutes />
          <PwaUpdatePrompt />
        </RouteAwareErrorBoundary>
      </BrowserRouter>
    </SessionProvider>
  </StrictMode>,
);
