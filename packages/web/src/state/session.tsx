/**
 * Presentation session state — tokens & user only. No authorization decisions.
 */

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiClient } from "../api/client";
import type { AuthUser, SessionTokens } from "../api/types";

const STORAGE_KEY = "afh.web.session";

type StoredSession = {
  readonly tokens: SessionTokens;
  readonly user: AuthUser;
};

type SessionContextValue = {
  readonly user: AuthUser | null;
  readonly tokens: SessionTokens | null;
  readonly api: ApiClient;
  readonly developerMode: boolean;
  readonly theme: "light" | "dark";
  readonly lastCorrelationId: string | null;
  setSession(user: AuthUser, tokens: SessionTokens): void;
  clearSession(): void;
  setDeveloperMode(value: boolean): void;
  setTheme(theme: "light" | "dark"): void;
  setLastCorrelationId(id: string | null): void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function loadStored(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { readonly children: ReactNode }) {
  const stored = loadStored();
  const [user, setUser] = useState<AuthUser | null>(stored?.user ?? null);
  const [tokens, setTokens] = useState<SessionTokens | null>(
    stored?.tokens ?? null,
  );
  const [developerMode, setDeveloperModeState] = useState(
    () => localStorage.getItem("afh.web.dev") === "1",
  );
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    const t = localStorage.getItem("afh.web.theme");
    return t === "dark" ? "dark" : "light";
  });
  const [lastCorrelationId, setLastCorrelationId] = useState<string | null>(
    null,
  );

  const clearSession = useCallback(() => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setSession = useCallback((nextUser: AuthUser, nextTokens: SessionTokens) => {
    setUser(nextUser);
    setTokens(nextTokens);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: nextUser, tokens: nextTokens } satisfies StoredSession),
    );
  }, []);

  const setDeveloperMode = useCallback((value: boolean) => {
    setDeveloperModeState(value);
    localStorage.setItem("afh.web.dev", value ? "1" : "0");
  }, []);

  const setTheme = useCallback((next: "light" | "dark") => {
    setThemeState(next);
    localStorage.setItem("afh.web.theme", next);
    document.documentElement.dataset.theme = next === "dark" ? "dark" : "light";
  }, []);

  const api = useMemo(
    () =>
      new ApiClient({
        getAccessToken: () => tokens?.sessionId ?? null,
        getCompanyId: () => user?.companyId ?? null,
        onUnauthorized: clearSession,
        developerMode,
      }),
    [tokens?.sessionId, user?.companyId, clearSession, developerMode],
  );

  const value: SessionContextValue = {
    user,
    tokens,
    api,
    developerMode,
    theme,
    lastCorrelationId,
    setSession,
    clearSession,
    setDeveloperMode,
    setTheme,
    setLastCorrelationId,
  };

  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
