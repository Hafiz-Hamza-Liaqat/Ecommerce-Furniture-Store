/**
 * RC10.4 — Local sales workspace persistence (`afh.cx.sales.workspace`).
 */

import type { SalesWorkspaceState } from "./types";
import { markSyncDirty } from "../sync";

const STORAGE_KEY = "afh.cx.sales.workspace";

const EMPTY: SalesWorkspaceState = {
  version: 1,
  opportunities: [],
  quotes: [],
  orders: [],
  timeline: [],
  notes: [],
  documents: [],
};

export function loadSalesWorkspace(): SalesWorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as SalesWorkspaceState;
    if (parsed?.version !== 1 || !Array.isArray(parsed.opportunities)) return EMPTY;
    return {
      version: 1,
      opportunities: parsed.opportunities ?? [],
      quotes: parsed.quotes ?? [],
      orders: parsed.orders ?? [],
      timeline: parsed.timeline ?? [],
      notes: parsed.notes ?? [],
      documents: parsed.documents ?? [],
    };
  } catch {
    return EMPTY;
  }
}

export function saveSalesWorkspace(state: SalesWorkspaceState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  markSyncDirty(STORAGE_KEY);
}

export function clearSalesWorkspace(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function uid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
