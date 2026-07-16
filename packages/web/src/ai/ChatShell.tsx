import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../components/ui";
import { getProvider } from "./provider";
import { loadAiSettings, pushGeneration, recordUsage, saveConversations, loadConversations } from "./prefs";
import { renderMarkdown } from "./markdown";
import { SUGGESTED_PROMPTS, MODULE_ASSIST_HINTS } from "./data";
import type { AiCitation, AiContext, AiConversation, AiMessage } from "./types";
import { useWorkspaceUi } from "../workspace/context";

function uid() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function contextFromPath(pathname: string): AiContext {
  const parts = pathname.split("/").filter(Boolean);
  const module = parts[1];
  const ctx: AiContext = { path: pathname };
  if (module) {
    Object.assign(ctx, { module });
    if (module === "sales") Object.assign(ctx, { order: "Active sales context" });
    if (module === "crm") Object.assign(ctx, { customer: "Active CRM context" });
    if (module === "projects") Object.assign(ctx, { project: "Active project context" });
    if (module === "inventory") Object.assign(ctx, { warehouse: "Active warehouse context" });
    if (module === "reports" || module === "reporting") Object.assign(ctx, { report: "Active report" });
    if (module === "analytics") Object.assign(ctx, { dashboard: "Executive intelligence" });
  }
  if (parts[3]) {
    Object.assign(ctx, {
      recordLabel: parts.slice(2).join(" / "),
      recordHref: pathname,
    });
  }
  return ctx;
}

export function ChatShell({
  title,
  seedPrompt,
  compact,
  fixedContext,
}: {
  readonly title?: string;
  readonly seedPrompt?: string;
  readonly compact?: boolean;
  readonly fixedContext?: AiContext;
}) {
  const { pathname } = useLocation();
  const { toast } = useWorkspaceUi();
  const settings = loadAiSettings();
  const ctx = fixedContext ?? (settings.shareWorkspaceContext ? contextFromPath(pathname) : {});
  const [input, setInput] = useState(seedPrompt ?? "");
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [citations, setCitations] = useState<readonly AiCitation[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const moduleKey = (ctx.module ?? "").toLowerCase();
  const hints = MODULE_ASSIST_HINTS[moduleKey] ?? SUGGESTED_PROMPTS.slice(0, 4);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (seedPrompt) setInput(seedPrompt);
  }, [seedPrompt]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || streaming) return;
    const userMsg: AiMessage = { id: uid(), role: "user", content: prompt, at: Date.now() };
    const assistantId = uid();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", at: Date.now(), streaming: true },
    ]);
    setInput("");
    setStreaming(true);
    setCitations([]);
    const ac = new AbortController();
    abortRef.current = ac;

    const provider = getProvider(settings.provider);
    const model =
      provider.models.includes(settings.model) ? settings.model : provider.models[0]!;

    try {
      let assembled = "";
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const stream = provider.chatStream({
        messages: history,
        context: ctx,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        provider: settings.provider,
        model,
        signal: ac.signal,
      });

        let lastCitations: readonly AiCitation[] = [];
      for await (const chunk of stream) {
        if (chunk.delta) {
          assembled += chunk.delta;
          if (settings.streamEnabled) {
            const snapshot = assembled;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: snapshot, streaming: true } : m,
              ),
            );
          }
        }
        if (chunk.citations) {
          lastCitations = chunk.citations;
          setCitations(chunk.citations);
        }
        if (chunk.done) break;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: assembled, streaming: false, citations: lastCitations }
            : m,
        ),
      );
      recordUsage(prompt.slice(0, 48), Math.ceil(assembled.length / 4), true);
      pushGeneration({
        title: prompt.slice(0, 60),
        kind: ctx.module ?? "assistant",
        preview: assembled.slice(0, 160),
      });
      persistThread(
        prompt,
        [
          ...messages,
          userMsg,
          {
            id: assistantId,
            role: "assistant",
            content: assembled,
            at: Date.now(),
            citations: lastCitations,
          },
        ],
        ctx.module,
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        toast({ tone: "info", title: "Generation stopped" });
      } else {
        recordUsage(prompt.slice(0, 48), 0, false);
        toast({ tone: "danger", title: "Assistant error", body: (err as Error).message });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Sorry — the assist layer failed. Retry or switch provider in AI settings.", streaming: false }
              : m,
          ),
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function retry() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) void send(lastUser.content);
  }

  function copyLast() {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (last) {
      void navigator.clipboard?.writeText(last.content);
      toast({ tone: "ok", title: "Copied" });
    }
  }

  return (
    <div className={`ai-chat${compact ? " ai-chat--compact" : ""}`}>
      {title ? <header className="ai-chat__head"><h2>{title}</h2></header> : null}
      <div className="ai-chat__context" aria-label="Context">
        <span>{ctx.module ?? "workspace"}</span>
        {ctx.recordLabel ? <span>{ctx.recordLabel}</span> : null}
        {ctx.path ? <code>{ctx.path}</code> : null}
      </div>

      <div className="ai-chat__layout">
        <div className="ai-chat__main">
          <div className="ai-chat__messages" role="log" aria-live="polite">
            {messages.length === 0 ? (
              <div className="ai-chat__empty">
                <p>Ask about KPIs, drafts, summaries, or policies. Domain changes stay on Application APIs.</p>
                <div className="ai-chips">
                  {hints.map((h) => (
                    <button key={h} type="button" onClick={() => void send(h)}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((m) => (
              <article key={m.id} className={`ai-bubble ai-bubble--${m.role}${m.streaming ? " is-streaming" : ""}`}>
                <header>{m.role === "user" ? "You" : "AFH Assist"}</header>
                <div className="ai-bubble__body">
                  {m.role === "assistant" ? renderMarkdown(m.content || "…") : m.content}
                </div>
              </article>
            ))}
            <div ref={endRef} />
          </div>

          <div className="ai-chat__composer">
            <label className="sr-only" htmlFor="ai-input">Message</label>
            <textarea
              id="ai-input"
              rows={compact ? 2 : 3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AFH Assist… (⌘/Ctrl Enter)"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void send(input);
                }
              }}
            />
            <div className="ai-chat__actions">
              {streaming ? (
                <Button variant="ghost" onClick={stop}>Stop</Button>
              ) : (
                <Button onClick={() => void send(input)} disabled={!input.trim()}>Send</Button>
              )}
              <Button variant="ghost" onClick={retry} disabled={streaming || messages.length === 0}>Retry</Button>
              <Button variant="ghost" onClick={copyLast} disabled={messages.length === 0}>Copy</Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const last = [...messages].reverse().find((m) => m.role === "assistant");
                  if (!last) return;
                  toast({ tone: "ok", title: "Export queued", body: "Presentation export — delivery via existing contracts." });
                }}
              >
                Export
              </Button>
            </div>
          </div>
        </div>

        <aside className="ai-chat__side" aria-label="Citations and activity">
          <h3>Citations</h3>
          <ul className="ai-cite-list">
            {(citations.length ? citations : []).map((c) => (
              <li key={c.id}>
                <Link to={c.href}>{c.title}</Link>
                <span>{c.module}</span>
              </li>
            ))}
            {citations.length === 0 ? <li className="p5-muted">Citations appear after a reply.</li> : null}
          </ul>
          <h3>Related</h3>
          <ul className="ai-cite-list">
            <li><Link to="/app/analytics">Analytics</Link></li>
            <li><Link to="/app/reports">Reports</Link></li>
            <li><Link to="/app/search">Search</Link></li>
            <li><Link to="/app/ai/workspace">AI workspace</Link></li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

function persistThread(title: string, msgs: AiMessage[], module?: string) {
  const list = loadConversations();
  const conv: AiConversation = {
    id: `c-${Date.now()}`,
    title: title.slice(0, 72),
    messages: msgs,
    updatedAt: Date.now(),
    ...(module ? { module } : {}),
  };
  saveConversations([conv, ...list.filter((c) => c.id !== conv.id)]);
}
