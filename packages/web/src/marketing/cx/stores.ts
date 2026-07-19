/** RC8.1 client-side CX stores (localStorage). Account merge hooks for login recovery. */

const WISHLIST_KEY = "afh.cx.wishlist";
const COMPARE_KEY = "afh.cx.compare";
const RECENT_KEY = "afh.cx.recent";
const RECENT_SEARCH_KEY = "afh.cx.recentSearch";
const PLANNER_KEY = "afh.cx.planner";
const CONSULTANT_KEY = "afh.cx.consultant";
const LEAD_QUEUE_KEY = "afh.cx.leadQueue";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
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

/** Merge guest wishlist after login. */
export function mergeWishlistOnLogin(accountIds: readonly string[]): string[] {
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

export type ConsultantMessage = {
  readonly role: "assistant" | "user";
  readonly text: string;
  readonly at: string;
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

export function enqueueLead(draft: Omit<LeadDraft, "id" | "at">): LeadDraft {
  const full: LeadDraft = {
    ...draft,
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
  };
  const all = readJson<LeadDraft[]>(LEAD_QUEUE_KEY, []);
  writeJson(LEAD_QUEUE_KEY, [full, ...all].slice(0, 50));
  return full;
}

export function listLeadQueue(): LeadDraft[] {
  return readJson<LeadDraft[]>(LEAD_QUEUE_KEY, []);
}
