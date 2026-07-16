/** Provider-agnostic AI types — no vendor lock-in, no domain logic. */

export type AiProviderId = "openai" | "anthropic" | "gemini" | "azure-openai" | "local";

export type AiRole = "system" | "user" | "assistant";

export type AiCitation = {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly module: string;
};

export type AiMessage = {
  readonly id: string;
  readonly role: AiRole;
  readonly content: string;
  readonly at: number;
  readonly citations?: readonly AiCitation[];
  readonly streaming?: boolean;
};

export type AiContext = {
  readonly module?: string;
  readonly path?: string;
  readonly recordLabel?: string;
  readonly recordHref?: string;
  readonly customer?: string;
  readonly order?: string;
  readonly project?: string;
  readonly warehouse?: string;
  readonly report?: string;
  readonly dashboard?: string;
};

export type AiChatRequest = {
  readonly messages: readonly { role: AiRole; content: string }[];
  readonly context?: AiContext;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly provider: AiProviderId;
  readonly model: string;
  readonly signal?: AbortSignal;
};

export type AiChatChunk = {
  readonly delta: string;
  readonly done?: boolean;
  readonly citations?: readonly AiCitation[];
};

export type AiProvider = {
  readonly id: AiProviderId;
  readonly label: string;
  readonly models: readonly string[];
  chatStream(req: AiChatRequest): AsyncIterable<AiChatChunk>;
};

export type AiSettings = {
  readonly provider: AiProviderId;
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly retentionDays: number;
  readonly privacyMode: "standard" | "strict";
  readonly shareWorkspaceContext: boolean;
  readonly streamEnabled: boolean;
};

export type AiConversation = {
  readonly id: string;
  readonly title: string;
  readonly messages: AiMessage[];
  readonly updatedAt: number;
  readonly module?: string;
  readonly saved?: boolean;
};

export type PromptItem = {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly body: string;
  readonly favorite?: boolean;
};
