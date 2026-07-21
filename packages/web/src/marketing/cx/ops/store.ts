/**
 * RC10.7 — Local ops workspace persistence (`afh.cx.ops.workspace`).
 */

import type { OpsWorkspaceState } from "./types";
import { markSyncDirty } from "../sync";

export const OPS_STORAGE_KEY = "afh.cx.ops.workspace";

const EMPTY: OpsWorkspaceState = {
  version: 1,
  items: [],
  boms: [],
  suppliers: [],
  procurements: [],
  movements: [],
  jobs: [],
};

export function loadOpsWorkspace(): OpsWorkspaceState {
  try {
    const raw = localStorage.getItem(OPS_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as OpsWorkspaceState;
    if (parsed?.version !== 1 || !Array.isArray(parsed.items)) return EMPTY;
    return {
      version: 1,
      items: parsed.items ?? [],
      boms: parsed.boms ?? [],
      suppliers: parsed.suppliers ?? [],
      procurements: parsed.procurements ?? [],
      movements: parsed.movements ?? [],
      jobs: parsed.jobs ?? [],
    };
  } catch {
    return EMPTY;
  }
}

export function saveOpsWorkspace(state: OpsWorkspaceState): void {
  localStorage.setItem(OPS_STORAGE_KEY, JSON.stringify(state));
  markSyncDirty(OPS_STORAGE_KEY);
}

export function clearOpsWorkspace(): void {
  localStorage.removeItem(OPS_STORAGE_KEY);
}

export function uid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
