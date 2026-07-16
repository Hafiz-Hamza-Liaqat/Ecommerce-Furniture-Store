import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyUserPrefsToDocument,
  loadFavoriteCommands,
  loadFavorites,
  loadRecentCommands,
  loadRecentPages,
  loadUserPrefs,
  loadWorkspaceContext,
  pushRecentCommand,
  pushRecentPage,
  saveFavorites,
  saveWorkspaceContext,
  type RecentPage,
  type WorkspaceContextPrefs,
} from "./prefs";

export type ToastItem = {
  readonly id: string;
  readonly tone: "ok" | "info" | "warn" | "danger";
  readonly title: string;
  readonly body?: string;
};

type WorkspaceUiValue = {
  readonly sidebarCollapsed: boolean;
  readonly mobileNavOpen: boolean;
  readonly workspaceId: string;
  readonly companyId: string;
  readonly branchId: string;
  readonly favorites: string[];
  readonly recentCommands: string[];
  readonly favoriteCommands: string[];
  readonly recentPages: RecentPage[];
  readonly paletteOpen: boolean;
  readonly createOpen: boolean;
  readonly notifOpen: boolean;
  readonly shortcutsOpen: boolean;
  readonly helpOpen: boolean;
  readonly toasts: ToastItem[];
  setSidebarCollapsed(v: boolean): void;
  setMobileNavOpen(v: boolean): void;
  setWorkspaceId(id: string): void;
  setCompanyId(id: string): void;
  setBranchId(id: string): void;
  toggleFavorite(path: string): void;
  setPaletteOpen(v: boolean): void;
  setCreateOpen(v: boolean): void;
  setNotifOpen(v: boolean): void;
  setShortcutsOpen(v: boolean): void;
  setHelpOpen(v: boolean): void;
  setFavoriteCommands(ids: string[]): void;
  rememberPage(path: string, label: string): void;
  toast(item: Omit<ToastItem, "id">): void;
  dismissToast(id: string): void;
  rememberCommand(id: string): void;
};

const WorkspaceUiContext = createContext<WorkspaceUiValue | null>(null);

export function WorkspaceUiProvider({ children }: { readonly children: ReactNode }) {
  const initial = loadWorkspaceContext();
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(initial.sidebarCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [workspaceId, setWorkspaceIdState] = useState(initial.workspaceId);
  const [companyId, setCompanyIdState] = useState(initial.companyId);
  const [branchId, setBranchIdState] = useState(initial.branchId);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [recentCommands, setRecentCommands] = useState(loadRecentCommands);
  const [favoriteCommands, setFavoriteCommands] = useState(loadFavoriteCommands);
  const [recentPages, setRecentPages] = useState(loadRecentPages);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    applyUserPrefsToDocument(loadUserPrefs());
  }, []);

  const persist = useCallback((patch: Partial<WorkspaceContextPrefs>) => {
    const next: WorkspaceContextPrefs = {
      workspaceId,
      companyId,
      branchId,
      sidebarCollapsed,
      ...patch,
    };
    saveWorkspaceContext(next);
  }, [workspaceId, companyId, branchId, sidebarCollapsed]);

  const setSidebarCollapsed = useCallback(
    (v: boolean) => {
      setSidebarCollapsedState(v);
      persist({ sidebarCollapsed: v });
    },
    [persist],
  );

  const setWorkspaceId = useCallback(
    (id: string) => {
      setWorkspaceIdState(id);
      persist({ workspaceId: id });
    },
    [persist],
  );

  const setCompanyId = useCallback(
    (id: string) => {
      setCompanyIdState(id);
      persist({ companyId: id });
    },
    [persist],
  );

  const setBranchId = useCallback(
    (id: string) => {
      setBranchIdState(id);
      persist({ branchId: id });
    },
    [persist],
  );

  const toggleFavorite = useCallback((path: string) => {
    setFavorites((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      saveFavorites(next);
      return next;
    });
  }, []);

  const rememberPage = useCallback((path: string, label: string) => {
    setRecentPages(pushRecentPage(path, label));
  }, []);

  const toast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...item, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const rememberCommand = useCallback((id: string) => {
    pushRecentCommand(id);
    setRecentCommands(loadRecentCommands());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        setCreateOpen(false);
      }
      if (meta && e.key === ",") {
        e.preventDefault();
        window.location.hash = "";
        window.dispatchEvent(new CustomEvent("afh:goto", { detail: "/app/preferences" }));
      }
      if (meta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarCollapsedState((v) => {
          const next = !v;
          persist({ sidebarCollapsed: next });
          return next;
        });
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setNotifOpen((v) => !v);
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setCreateOpen(true);
        setPaletteOpen(false);
      }
      if (!typing && e.key === "?" && !meta) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setCreateOpen(false);
        setNotifOpen(false);
        setShortcutsOpen(false);
        setHelpOpen(false);
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist]);

  const value: WorkspaceUiValue = useMemo(
    () => ({
      sidebarCollapsed,
      mobileNavOpen,
      workspaceId,
      companyId,
      branchId,
      favorites,
      recentCommands,
      favoriteCommands,
      recentPages,
      paletteOpen,
      createOpen,
      notifOpen,
      shortcutsOpen,
      helpOpen,
      toasts,
      setSidebarCollapsed,
      setMobileNavOpen,
      setWorkspaceId,
      setCompanyId,
      setBranchId,
      toggleFavorite,
      setPaletteOpen,
      setCreateOpen,
      setNotifOpen,
      setShortcutsOpen,
      setHelpOpen,
      setFavoriteCommands,
      rememberPage,
      toast,
      dismissToast,
      rememberCommand,
    }),
    [
      sidebarCollapsed,
      mobileNavOpen,
      workspaceId,
      companyId,
      branchId,
      favorites,
      recentCommands,
      favoriteCommands,
      recentPages,
      paletteOpen,
      createOpen,
      notifOpen,
      shortcutsOpen,
      helpOpen,
      toasts,
      setSidebarCollapsed,
      setWorkspaceId,
      setCompanyId,
      setBranchId,
      toggleFavorite,
      rememberPage,
      toast,
      dismissToast,
      rememberCommand,
    ],
  );

  return createElement(WorkspaceUiContext.Provider, { value }, children);
}

export function useWorkspaceUi(): WorkspaceUiValue {
  const ctx = useContext(WorkspaceUiContext);
  if (!ctx) throw new Error("useWorkspaceUi must be used within WorkspaceUiProvider");
  return ctx;
}
