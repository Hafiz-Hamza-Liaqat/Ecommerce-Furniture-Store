/**
 * RC9.2 — AI provider abstraction for the furniture consultant.
 * Do not hardcode a vendor; local grounded engine is the production default.
 */

import { runConsultantTurn } from "./engine";
import type {
  ConsultantChatRequest,
  ConsultantProvider,
  ConsultantProviderId,
  ConsultantTurnResult,
} from "./types";

async function* yieldTurn(turn: ConsultantTurnResult): AsyncGenerator<{
  readonly delta?: string;
  readonly turn?: ConsultantTurnResult;
  readonly done?: boolean;
}> {
  const text = turn.replies.map((r) => r.text).join("\n\n");
  const chunkSize = 48;
  for (let i = 0; i < text.length; i += chunkSize) {
    yield { delta: text.slice(i, i + chunkSize) };
  }
  yield { turn, done: true };
}

const LOCAL: ConsultantProvider = {
  id: "local-grounded",
  label: "AFH Grounded Consultant (local)",
  async *chat(req: ConsultantChatRequest) {
    const turn = runConsultantTurn(req.memory, req.userText);
    yield* yieldTurn(turn);
  },
};

function remoteStub(id: ConsultantProviderId, label: string): ConsultantProvider {
  return {
    id,
    label,
    async *chat(req: ConsultantChatRequest) {
      yield {
        delta: `[${label}] Using grounded local engine — configure API credentials to enable remote inference.\n\n`,
      };
      const turn = runConsultantTurn(req.memory, req.userText);
      yield* yieldTurn(turn);
    },
  };
}

const PROVIDERS: Record<ConsultantProviderId, ConsultantProvider> = {
  "local-grounded": LOCAL,
  openai: remoteStub("openai", "OpenAI"),
  anthropic: remoteStub("anthropic", "Anthropic"),
  gemini: remoteStub("gemini", "Google Gemini"),
  "azure-openai": remoteStub("azure-openai", "Azure OpenAI"),
};

let activeId: ConsultantProviderId = "local-grounded";

export function listConsultantProviders(): readonly ConsultantProvider[] {
  return Object.values(PROVIDERS);
}

export function getConsultantProvider(id?: ConsultantProviderId): ConsultantProvider {
  return PROVIDERS[id ?? activeId] ?? LOCAL;
}

export function setConsultantProvider(id: ConsultantProviderId): void {
  if (PROVIDERS[id]) activeId = id;
}

export function getActiveConsultantProviderId(): ConsultantProviderId {
  return activeId;
}
