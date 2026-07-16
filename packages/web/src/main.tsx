import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./App";
import { SessionProvider } from "./state/session";
import "./styles/global.css";
import "./styles/components.css";
import "./styles/workspace.css";
import "./styles/modules.css";
import "./styles/productivity.css";
import "./styles/analytics.css";
import "./styles/marketing.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element missing");
}

const storedTheme = localStorage.getItem("afh.web.theme");
document.documentElement.dataset.theme =
  storedTheme === "dark" ? "dark" : "light";

createRoot(root).render(
  <StrictMode>
    <SessionProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SessionProvider>
  </StrictMode>,
);
