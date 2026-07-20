/** RC8.1 client-side CX stores (localStorage). Account merge hooks for login recovery. */

import { bridgeLeadToSales } from "./sales/bridge";

const WISHLIST_KEY = "afh.cx.wishlist";
const COMPARE_KEY = "afh.cx.compare";
const RECENT_KEY = "afh.cx.recent";
const RECENT_SEARCH_KEY = "afh.cx.recentSearch";
const PLANNER_KEY = "afh.cx.planner";
const CONSULTANT_KEY = "afh.cx.consultant";
const LEAD_QUEUE_KEY = "afh.cx.leadQueue";

const CX_STORAGE_PREFIX = "afh.cx.";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt JSON must not wipe UX — return fallback (offline recovery).
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota / private mode — ignore; callers keep in-memory behavior.
  }
}

/**
 * Subscribe to cross-tab CX localStorage changes.
 * Returns an unsubscribe function. No-op when window is unavailable.
 */
export function subscribeCxStorage(
  onChange: (key: string) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: StorageEvent) => {
    if (!event.key || !event.key.startsWith(CX_STORAGE_PREFIX)) return;
    onChange(event.key);
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function getWishlistIds(): string[] {
  return readJson<string[]>(WISHLIST_KEY, []);
}

export function toggleWishlist(id: string): string[] {
  const cur = new Set(getWishlistIds());
  if (cur.has(id)) cur.delete(id);
  else cur.add(id);
  const next = [...cur];
  writeJson(WISHLIST_KEY, next);
  return next;
}

export function removeWishlist(id: string): string[] {
  const next = getWishlistIds().filter((x) => x !== id);
  writeJson(WISHLIST_KEY, next);
  return next;
}

/**
 * Merge guest wishlist after login.
 * Account-side wishlist sync is deferred (local-only); still dedupes local ids.
 */
export function mergeWishlistOnLogin(accountIds: readonly string[] = []): string[] {
  const merged = [...new Set([...getWishlistIds(), ...accountIds])];
  writeJson(WISHLIST_KEY, merged);
  return merged;
}

export function getCompareIds(): string[] {
  return readJson<string[]>(COMPARE_KEY, []);
}

export function toggleCompare(id: string): string[] {
  const cur = getCompareIds();
  if (cur.includes(id)) {
    const next = cur.filter((x) => x !== id);
    writeJson(COMPARE_KEY, next);
    return next;
  }
  if (cur.length >= 4) return cur;
  const next = [...cur, id];
  writeJson(COMPARE_KEY, next);
  return next;
}

export function clearCompare(): void {
  writeJson(COMPARE_KEY, []);
}

/** Move a wishlist item into compare (max 4). Keeps wishlist entry. */
export function moveWishlistToCompare(id: string): { wishlist: string[]; compare: string[] } {
  const wishlist = getWishlistIds();
  if (!wishlist.includes(id)) return { wishlist, compare: getCompareIds() };
  const compare = toggleCompare(id);
  return { wishlist, compare };
}

export function pushRecentlyViewed(id: string): string[] {
  const cur = getRecentlyViewed().filter((x) => x !== id);
  const next = [id, ...cur].slice(0, 12);
  writeJson(RECENT_KEY, next);
  return next;
}

export function getRecentlyViewed(): string[] {
  return readJson<string[]>(RECENT_KEY, []);
}

export function getRecentSearches(): string[] {
  return readJson<string[]>(RECENT_SEARCH_KEY, []);
}

export function pushRecentSearch(q: string): string[] {
  const needle = q.trim();
  if (needle.length < 2) return getRecentSearches();
  const next = [needle, ...getRecentSearches().filter((x) => x !== needle)].slice(0, 8);
  writeJson(RECENT_SEARCH_KEY, next);
  return next;
}

export type SavedPlan = {
  readonly id: string;
  readonly createdAt: string;
  readonly budgetPkr: number;
  readonly endUse: string;
  readonly style: string;
  readonly seats: number;
  readonly packageId: string;
  readonly lineIds: readonly string[];
  readonly totalPkr: number;
};

export function savePlan(plan: Omit<SavedPlan, "id" | "createdAt">): SavedPlan {
  const full: SavedPlan = {
    ...plan,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const all = readJson<SavedPlan[]>(PLANNER_KEY, []);
  writeJson(PLANNER_KEY, [full, ...all].slice(0, 20));
  return full;
}

export function listSavedPlans(): SavedPlan[] {
  return readJson<SavedPlan[]>(PLANNER_KEY, []);
}

import type { ConsultantCard } from "./intelligent/types";

export type ConsultantMessage = {
  readonly role: "assistant" | "user";
  readonly text: string;
  readonly at: string;
  /** RC9.2 structured cards (product / package / quote / actions). */
  readonly cards?: readonly ConsultantCard[];
};

export function loadConsultantHistory(): ConsultantMessage[] {
  return readJson<ConsultantMessage[]>(CONSULTANT_KEY, []);
}

export function saveConsultantHistory(messages: readonly ConsultantMessage[]): void {
  writeJson(CONSULTANT_KEY, messages.slice(-40));
}

export type LeadDraft = {
  readonly id: string;
  readonly at: string;
  readonly intent: string;
  readonly name: string;
  readonly email: string;
  readonly message: string;
  readonly source: string;
  readonly meta?: Record<string, unknown>;
};

/**
 * Enqueue an offline lead. Dedupes identical intent+email+message within 30s
 * to resist double-submit races.
 */
export function enqueueLead(draft: Omit<LeadDraft, "id" | "at">): LeadDraft {
  const all = readJson<LeadDraft[]>(LEAD_QUEUE_KEY, []);
  const now = Date.now();
  const duplicate = all.find((existing) => {
    if (existing.intent !== draft.intent) return false;
    if (existing.email !== draft.email) return false;
    if (existing.message !== draft.message) return false;
    if (existing.source !== draft.source) return false;
    return now - Date.parse(existing.at) < 30_000;
  });
  if (duplicate) return duplicate;

  const full: LeadDraft = {
    ...draft,
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
  };
  writeJson(LEAD_QUEUE_KEY, [full, ...all].slice(0, 50));
  try {
    bridgeLeadToSales(full);
  } catch {
    /* ignore bridge failures — lead queue remains authoritative */
  }
  return full;
}

export function listLeadQueue(): LeadDraft[] {
  return readJson<LeadDraft[]>(LEAD_QUEUE_KEY, []);
}

/** Remove a lead from the offline queue after successful flush. */
export function dequeueLead(id: string): void {
  writeJson(
    LEAD_QUEUE_KEY,
    listLeadQueue().filter((lead) => lead.id !== id),
  );
}
