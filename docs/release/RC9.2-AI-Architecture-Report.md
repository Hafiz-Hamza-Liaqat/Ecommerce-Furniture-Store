# RC9.2 — AI Architecture Report

- **Date:** 2026-07-20
- **Phase:** RC9.2 Intelligent Furniture Consultant

## Pipeline

```
User message
    ↓
NLU (slot extract + merge memory)
    ↓
Follow-up OR recommend intent
    ↓
Provider abstraction (chat stream API)
    ↓
Grounding Service (search → rank)
    ↓
Packages / recommendations / quote draft
    ↓
Structured cards + assistant text → UI
```

The UI and engine depend only on the provider interface and the grounding APIs. They never call a vendor SDK directly.

## Layers

| Layer | Module | Responsibility |
|---|---|---|
| Facade | `cx/consultant.ts` | Stable public API; preserves `nextConsultantTurn` |
| Conversation engine | `intelligent/engine.ts` | Turn orchestration, follow-ups, handoff detection |
| NLU | `intelligent/nlu.ts` | Intent/slot extraction; missing-slot questions |
| Memory | `intelligent/memory.ts` | Session persistence (`afh.cx.consultant.memory`) |
| Grounding | `intelligent/grounding.ts` | Catalog-only search/rank/assert |
| Packages | `intelligent/packages.ts` | Role-based furnishing packages |
| Quote bridge | `intelligent/quote.ts` | Query-param handoff to existing `/quote` |
| Provider | `intelligent/provider.ts` | `ConsultantProvider` abstraction + streaming generator |

## Provider abstraction

```ts
type ConsultantProviderId =
  | "local-grounded"
  | "openai"
  | "anthropic"
  | "gemini"
  | "azure-openai";
```

- **Active default:** `local-grounded`
- **Remote stubs:** emit a short notice, then execute the grounded local turn
- **Streaming contract:** `AsyncGenerator<{ delta?, turn?, done? }>` — UI already consumes deltas for stream-ready UX

## Compatibility

- Classic step vocabulary (`STEPS`) retained on the facade
- Message store accepts optional `cards` without breaking older messages
- No backend, CQRS, or identity changes

## Future extension (no redesign required)

1. Wire remote providers with real API keys behind the same `chat()` interface
2. Swap metadata scorer for vector retrieval behind `searchCatalog`
3. Enable true token streaming from remote providers into existing `streamPreview` UI

## Verdict

Architecture is **complete for RC9.2** and ready for provider/credential activation without consultant redesign.
