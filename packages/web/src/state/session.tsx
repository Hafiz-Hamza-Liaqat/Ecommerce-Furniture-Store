/**
 * Presentation session state — tokens, user, and effective permission codes
 * mirrored from the session endpoint. No authorization decisions; the backend
 * Policy Engine remains the sole authorizer.
 */

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  /**
   * Effective canonical permission codes from GET /api/v1/auth/session.
   * `null` while unresolved (no session, still loading, or fetch failed).
   * Presentation-only signal — backend Policy remains authoritative.
   */
  readonly permissionCodes: readonly string[] | null;
  /**
   * True when the last permission fetch failed (e.g. API unreachable) and
   * codes are therefore unresolved. Lets guards show a retriable error
   * instead of an indefinite loading state. Never grants access.
   */
  readonly permissionsError: boolean;
  readonly api: ApiClient;
  readonly developerMode: boolean;
  readonly theme: "light" | "dark";
  readonly lastCorrelationId: string | null;
  setSession(user: AuthUser, tokens: SessionTokens): void;
  clearSession(): void;
  setDeveloperMode(value: boolean): void;
  setTheme(theme: "light" | "dark"): void;
  setLastCorrelationId(id: string | null): void;
  refreshSession(): Promise<boolean>;
  /** Re-request effective permission codes after a failed load. */
  reloadPermissions(): void;
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
  const [permissionCodes, setPermissionCodes] = useState<
    readonly string[] | null
  >(null);
  const [permissionsError, setPermissionsError] = useState(false);
  // Bumped by reloadPermissions() to re-run the fetch effect after a failure.
  const [permissionFetchAttempt, setPermissionFetchAttempt] = useState(0);
  // Identity (user + session) the current permissionCodes belong to. A silent
  // token refresh keeps the same identity, so codes stay valid while they are
  // re-resolved; a different user/session invalidates them immediately.
  const permissionIdentityRef = useRef<string | null>(
    stored ? `${stored.user.id}:${stored.tokens.sessionId}` : null,
  );

  const clearSession = useCallback(() => {
    setUser(null);
    setTokens(null);
    setPermissionCodes(null);
    setPermissionsError(false);
    permissionIdentityRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setSession = useCallback((nextUser: AuthUser, nextTokens: SessionTokens) => {
    const nextIdentity = `${nextUser.id}:${nextTokens.sessionId}`;
    if (permissionIdentityRef.current !== nextIdentity) {
      // New user or new session — previous codes must not leak across.
      setPermissionCodes(null);
      permissionIdentityRef.current = nextIdentity;
    }
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

  const refreshSession = useCallback(async () => {
    if (!tokens?.sessionId || !tokens.refreshToken) return false;
    try {
      const res = await api.refreshSession({
        sessionId: tokens.sessionId,
        refreshToken: tokens.refreshToken,
      });
      setLastCorrelationId(res.correlationId);
      if (user) setSession(user, res.data.tokens);
      else {
        setTokens(res.data.tokens);
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredSession;
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...parsed, tokens: res.data.tokens }),
          );
        }
      }
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [api, clearSession, setSession, tokens, user]);

  // Resolve effective permission codes from the existing session endpoint.
  // Read-only projection for presentation gating; no authorization decision.
  // Keyed on the tokens object: it is replaced on login, page reload, and
  // every silent/manual refresh (backend keeps sessionId stable but rotates
  // refreshToken/expiresAt), so codes are re-resolved after each refresh and
  // revocations take effect without a full page reload. Exactly one fetch
  // runs per token rotation; stale responses are ignored via `cancelled`.
  useEffect(() => {
    if (!tokens?.sessionId) {
      setPermissionCodes(null);
      setPermissionsError(false);
      return;
    }
    let cancelled = false;
    void api
      .getSession()
      .then((res) => {
        if (!cancelled) {
          // Boundary guard: an older/other backend build may omit the field;
          // treat it as unresolved instead of crashing permission checks.
          const codes = res.data.permissionCodes ?? null;
          setPermissionCodes(codes);
          setPermissionsError(codes === null);
        }
      })
      .catch(() => {
        // Leave codes unresolved; a 401/403 already clears the session via
        // onUnauthorized, and the backend Policy Engine stays authoritative.
        // Flag the failure so guards can offer a retry instead of an
        // indefinite loading skeleton (fail-closed either way).
        if (!cancelled) {
          setPermissionCodes(null);
          setPermissionsError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, tokens, permissionFetchAttempt]);

  const reloadPermissions = useCallback(() => {
    setPermissionsError(false);
    setPermissionFetchAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!tokens?.expiresAt) return;
    const expires = Date.parse(tokens.expiresAt);
    if (!Number.isFinite(expires)) return;
    const msUntil = expires - Date.now() - 60_000;
    if (msUntil <= 0) {
      void refreshSession();
      return;
    }
    const t = window.setTimeout(() => {
      void refreshSession();
    }, Math.min(msUntil, 2_147_000_000));
    return () => window.clearTimeout(t);
  }, [tokens?.expiresAt, tokens?.sessionId, refreshSession]);

  const value: SessionContextValue = {
    user,
    tokens,
    permissionCodes,
    permissionsError,
    api,
    developerMode,
    theme,
    lastCorrelationId,
    setSession,
    clearSession,
    setDeveloperMode,
    setTheme,
    setLastCorrelationId,
    refreshSession,
    reloadPermissions,
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
