import type { AiConversation, AiSettings, PromptItem } from "./types";

const SETTINGS_KEY = "afh.web.ai.settings";
const CONV_KEY = "afh.web.ai.conversations";
const PROMPT_FAV_KEY = "afh.web.ai.prompt.favorites";
const USAGE_KEY = "afh.web.ai.usage";
const GENERATIONS_KEY = "afh.web.ai.generations";
const DOCS_KEY = "afh.web.ai.documents";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function defaultAiSettings(): AiSettings {
  return {
    provider: "local",
    model: "afh-assist-1",
    temperature: 0.4,
    maxTokens: 2048,
    retentionDays: 30,
    privacyMode: "standard",
    shareWorkspaceContext: true,
    streamEnabled: true,
  };
}

export function loadAiSettings(): AiSettings {
  return { ...defaultAiSettings(), ...readJson<Partial<AiSettings>>(SETTINGS_KEY, {}) };
}

export function saveAiSettings(settings: AiSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadConversations(): AiConversation[] {
  return readJson(CONV_KEY, []);
}

export function saveConversations(items: AiConversation[]): void {
  localStorage.setItem(CONV_KEY, JSON.stringify(items.slice(0, 40)));
}

export function loadPromptFavorites(): string[] {
  return readJson(PROMPT_FAV_KEY, []);
}

export function savePromptFavorites(ids: string[]): void {
  localStorage.setItem(PROMPT_FAV_KEY, JSON.stringify(ids));
}

export type AiUsageSnapshot = {
  readonly requests: number;
  readonly tokensApprox: number;
  readonly conversations: number;
  readonly successes: number;
  readonly errors: number;
  readonly timeline: readonly { at: number; label: string }[];
};

export function loadUsage(): AiUsageSnapshot {
  return readJson(USAGE_KEY, {
    requests: 12,
    tokensApprox: 18400,
    conversations: 5,
    successes: 11,
    errors: 1,
    timeline: [
      { at: Date.now() - 3600000, label: "Executive briefing" },
      { at: Date.now() - 7200000, label: "Sales email draft" },
      { at: Date.now() - 86400000, label: "Inventory summary" },
    ],
  });
}

export function recordUsage(label: string, tokens: number, ok: boolean): AiUsageSnapshot {
  const cur = loadUsage();
  const next: AiUsageSnapshot = {
    requests: cur.requests + 1,
    tokensApprox: cur.tokensApprox + tokens,
    conversations: cur.conversations,
    successes: cur.successes + (ok ? 1 : 0),
    errors: cur.errors + (ok ? 0 : 1),
    timeline: [{ at: Date.now(), label }, ...cur.timeline].slice(0, 40),
  };
  localStorage.setItem(USAGE_KEY, JSON.stringify(next));
  return next;
}

export type GenerationItem = {
  readonly id: string;
  readonly title: string;
  readonly kind: string;
  readonly at: number;
  readonly preview: string;
};

export function loadGenerations(): GenerationItem[] {
  return readJson(GENERATIONS_KEY, []);
}

export function pushGeneration(item: Omit<GenerationItem, "id" | "at">): void {
  const next = [
    { ...item, id: `gen-${Date.now()}`, at: Date.now() },
    ...loadGenerations(),
  ].slice(0, 40);
  localStorage.setItem(GENERATIONS_KEY, JSON.stringify(next));
}

export type DocIntelItem = {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly status: string;
  readonly at: number;
};

export function loadDocIntel(): DocIntelItem[] {
  return readJson(DOCS_KEY, []);
}

export function pushDocIntel(item: Omit<DocIntelItem, "id" | "at" | "status">): void {
  const next = [
    { ...item, id: `doc-${Date.now()}`, at: Date.now(), status: "Queued for backend extraction" },
    ...loadDocIntel(),
  ].slice(0, 30);
  localStorage.setItem(DOCS_KEY, JSON.stringify(next));
}

export type SavedSearchNl = {
  readonly id: string;
  readonly query: string;
  readonly at: number;
};

export function loadNlSearches(): SavedSearchNl[] {
  return readJson("afh.web.ai.nl.searches", []);
}

export function pushNlSearch(query: string): void {
  const next = [
    { id: `nl-${Date.now()}`, query, at: Date.now() },
    ...loadNlSearches().filter((s) => s.query !== query),
  ].slice(0, 20);
  localStorage.setItem("afh.web.ai.nl.searches", JSON.stringify(next));
}

export type SharedPrompt = PromptItem & { readonly shared?: boolean };
