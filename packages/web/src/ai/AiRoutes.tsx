import { useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { PageHeader, Button, Alert } from "../components/ui";
import { Tabs, Toolbar, EmptyState, StatusBadge } from "../workspace/widgets";
import { ChatShell } from "./ChatShell";
import { PROMPT_LIBRARY, KNOWLEDGE_DOCS, WRITING_TEMPLATES, SEARCH_HITS, SUGGESTED_PROMPTS } from "./data";
import {
  loadAiSettings,
  saveAiSettings,
  loadConversations,
  saveConversations,
  loadPromptFavorites,
  savePromptFavorites,
  loadUsage,
  loadGenerations,
  loadDocIntel,
  pushDocIntel,
  pushNlSearch,
  loadNlSearches,
  defaultAiSettings,
} from "./prefs";
import { PROVIDERS, getProvider } from "./provider";
import type { AiSettings } from "./types";
import { useWorkspaceUi } from "../workspace/context";
import { FileDropzone } from "../productivity/FileExperience";
import { GaugeChart, Sparkline } from "../workspace/charts";

function AiSubnav() {
  return (
    <nav className="ai-subnav" aria-label="AI sections">
      {(
        [
          ["/app/ai", "Chat"],
          ["/app/ai/workspace", "Workspace"],
          ["/app/ai/writing", "Writing"],
          ["/app/ai/documents", "Documents"],
          ["/app/ai/knowledge", "Knowledge"],
          ["/app/ai/prompts", "Prompts"],
          ["/app/ai/search", "Smart search"],
          ["/app/ai/modules", "Module copilots"],
          ["/app/ai/usage", "Usage"],
          ["/app/settings/ai", "Settings"],
        ] as const
      ).map(([to, label]) => (
        <Link key={to} to={to}>{label}</Link>
      ))}
    </nav>
  );
}

function AiWorkspacePage() {
  const [tab, setTab] = useState("conversations");
  const conversations = loadConversations();
  const generations = loadGenerations();
  const favorites = conversations.filter((c) => c.saved);
  const { toast } = useWorkspaceUi();
  const navigate = useNavigate();

  return (
    <div className="stack ai-page">
      <PageHeader
        title="AI Workspace"
        lead="Prompt history, conversations, documents, favorites, recent generations, and templates."
        actions={<Link className="btn btn--ghost" to="/app/ai">Back to chat</Link>}
      />
      <Tabs
        tabs={[
          { id: "conversations", label: "Conversations" },
          { id: "favorites", label: "Favorites" },
          { id: "generations", label: "Recent generations" },
          { id: "templates", label: "Templates" },
          { id: "documents", label: "Documents" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "conversations" ? (
        <ul className="ai-list">
          {conversations.map((c) => (
            <li key={c.id}>
              <div>
                <strong>{c.title}</strong>
                <span>{new Date(c.updatedAt).toLocaleString()} · {c.module ?? "general"}</span>
              </div>
              <div className="row">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    const next = conversations.map((x) =>
                      x.id === c.id ? { ...x, saved: !x.saved } : x,
                    );
                    saveConversations(next);
                    toast({ tone: "ok", title: c.saved ? "Unsaved" : "Saved" });
                  }}
                >
                  {c.saved ? "Unfavorite" : "Favorite"}
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => navigate("/app/ai")}
                >
                  Open
                </button>
              </div>
            </li>
          ))}
          {conversations.length === 0 ? <EmptyState title="No conversations yet" body="Start chatting from the assistant." /> : null}
        </ul>
      ) : null}
      {tab === "favorites" ? (
        <ul className="ai-list">
          {favorites.map((c) => (
            <li key={c.id}><strong>{c.title}</strong></li>
          ))}
          {favorites.length === 0 ? <EmptyState title="No favorites" body="Star conversations to pin them here." /> : null}
        </ul>
      ) : null}
      {tab === "generations" ? (
        <ul className="ai-list">
          {generations.map((g) => (
            <li key={g.id}>
              <div>
                <strong>{g.title}</strong>
                <span>{g.kind} · {new Date(g.at).toLocaleString()}</span>
                <p className="p5-muted">{g.preview}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {tab === "templates" ? (
        <div className="ai-chip-grid">
          {WRITING_TEMPLATES.map((t) => (
            <Link key={t.id} className="ai-tile" to={`/app/ai/writing?kind=${t.kind}`}>
              <strong>{t.label}</strong>
              <span>{t.kind}</span>
            </Link>
          ))}
        </div>
      ) : null}
      {tab === "documents" ? (
        <p className="p5-muted">
          Open <Link to="/app/ai/documents">Document Intelligence</Link> for OCR / extraction UI.
        </p>
      ) : null}
    </div>
  );
}

function WritingStudioPage() {
  const params = new URLSearchParams(window.location.search);
  const [kind, setKind] = useState(params.get("kind") ?? "email");
  const [brief, setBrief] = useState("");
  const seed = `Draft a ${kind} for Artisan Furnish Hub. Brief: ${brief || "(add brief)"}. Keep professional enterprise tone.`;

  return (
    <div className="stack ai-page">
      <PageHeader
        title="AI Writing Studio"
        lead="Email, proposal, RFQ, quote, blog, announcement, marketing, and documentation drafts — review before use."
      />
      <div className="erp-form-grid">
        <label className="field">
          <span className="field__label">Template</span>
          <select className="field__input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {WRITING_TEMPLATES.map((t) => (
              <option key={t.id} value={t.kind}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Brief</span>
          <textarea className="field__input" rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} />
        </label>
      </div>
      <ChatShell title="Drafting session" seedPrompt={seed} fixedContext={{ module: "writing", dashboard: "Writing studio" }} />
    </div>
  );
}

function DocumentIntelligencePage() {
  const { toast } = useWorkspaceUi();
  const [items, setItems] = useState(loadDocIntel);
  const [kind, setKind] = useState("invoice");

  return (
    <div className="stack ai-page">
      <PageHeader
        title="Document Intelligence"
        lead="OCR upload and extraction UI — processing happens on backend contracts. No OCR engine runs in the browser."
      />
      <Alert tone="info">Presentation staging only. Extraction results appear when Document Intelligence APIs respond.</Alert>
      <label className="field" style={{ maxWidth: 280 }}>
        <span className="field__label">Document type</span>
        <select className="field__input" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="invoice">Invoice extraction</option>
          <option value="purchase">Purchase document</option>
          <option value="contract">Contract extraction</option>
          <option value="image">Image attachment analysis</option>
          <option value="pdf">PDF summary</option>
        </select>
      </label>
      <FileDropzone
        onRegistered={(files) => {
          for (const f of files) {
            pushDocIntel({ name: f.name, kind });
          }
          setItems(loadDocIntel());
          toast({ tone: "ok", title: "Queued for backend extraction", body: `${files.length} file(s)` });
        }}
      />
      <ul className="ai-list">
        {items.map((d) => (
          <li key={d.id}>
            <div>
              <strong>{d.name}</strong>
              <span>{d.kind} · {d.status}</span>
            </div>
            <StatusBadge status={d.status} tone="warn" />
          </li>
        ))}
      </ul>
      <ChatShell
        compact
        title="Ask about staged documents"
        seedPrompt="Summarize extraction placeholders for the latest staged invoice/PDF."
        fixedContext={{ module: "documents", recordLabel: "Document intelligence" }}
      />
    </div>
  );
}

function KnowledgePage() {
  const [q, setQ] = useState("");
  const hits = KNOWLEDGE_DOCS.filter((d) =>
    !q || `${d.title} ${d.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="stack ai-page">
      <PageHeader title="Knowledge Assistant" lead="Policies, manuals, SOPs, FAQ, and help — grounded in existing CMS/DAM/HR content links." />
      <input className="field__input" placeholder="Search knowledge…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Knowledge search" />
      <ul className="ai-list">
        {hits.map((d) => (
          <li key={d.id}>
            <div>
              <Link to={d.href}><strong>{d.title}</strong></Link>
              <span>{d.tags.join(" · ")}</span>
            </div>
          </li>
        ))}
      </ul>
      <ChatShell compact title="Ask the knowledge assistant" seedPrompt={q ? `Help with: ${q}` : "Where is the vendor onboarding policy?"} fixedContext={{ module: "knowledge" }} />
    </div>
  );
}

function PromptLibraryPage() {
  const [favs, setFavs] = useState(loadPromptFavorites);
  const [cat, setCat] = useState("all");
  const { toast } = useWorkspaceUi();
  const cats = ["all", ...new Set(PROMPT_LIBRARY.map((p) => p.category))];
  const list = PROMPT_LIBRARY.filter((p) => cat === "all" || p.category === cat);

  return (
    <div className="stack ai-page">
      <PageHeader title="Prompt Library" lead="Reusable enterprise prompts — save, favorite, share, and reuse recently." />
      <div className="p5-seg" role="group">
        {cats.map((c) => (
          <button key={c} type="button" className={cat === c ? "is-active" : undefined} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div className="ai-prompt-grid">
        {list.map((p) => (
          <article key={p.id} className="ai-prompt-card">
            <header>
              <StatusBadge status={p.category} tone="neutral" />
              <strong>{p.title}</strong>
            </header>
            <p>{p.body}</p>
            <div className="row">
              <Link className="btn btn--primary" to={`/app/ai?prompt=${encodeURIComponent(p.body)}`}>Use</Link>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  const next = favs.includes(p.id) ? favs.filter((x) => x !== p.id) : [...favs, p.id];
                  setFavs(next);
                  savePromptFavorites(next);
                }}
              >
                {favs.includes(p.id) ? "★" : "☆"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => toast({ tone: "ok", title: "Share link copied (local)", body: p.title })}
              >
                Share
              </button>
            </div>
          </article>
        ))}
      </div>
      {favs.length > 0 ? (
        <p className="p5-muted">Favorites: {favs.length} · Recent prompts available from AI Workspace generations.</p>
      ) : null}
    </div>
  );
}

function SmartSearchPage() {
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState(loadNlSearches);
  const ranked = SEARCH_HITS
    .filter((h) => !q || `${h.title} ${h.summary} ${h.module}`.toLowerCase().includes(q.toLowerCase()) || /show|find|open|summarize/i.test(q))
    .slice()
    .sort((a, b) => b.score - a.score);

  function run() {
    if (!q.trim()) return;
    pushNlSearch(q.trim());
    setRecent(loadNlSearches());
  }

  return (
    <div className="stack ai-page">
      <PageHeader
        title="Smart Enterprise Search"
        lead="Natural language suggestions, semantic-style ranking presentation, related records, favorites, and AI summaries — reuses Search contracts."
        actions={<Link className="btn btn--ghost" to="/app/search">Classic search module</Link>}
      />
      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          className="field__input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder='Try “show low stock sofa frames” or “open Indus HQ project”'
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
        />
        <Button onClick={run}>Search</Button>
      </div>
      <div className="ai-chips">
        {SUGGESTED_PROMPTS.slice(0, 4).map((s) => (
          <button key={s} type="button" onClick={() => { setQ(s); pushNlSearch(s); setRecent(loadNlSearches()); }}>{s}</button>
        ))}
      </div>
      <div className="bi-grid">
        <section className="ws-card">
          <header className="ws-card__head"><h2>Ranked results</h2></header>
          <div className="ws-card__body">
            <ul className="ai-list">
              {ranked.map((h) => (
                <li key={h.id}>
                  <div>
                    <Link to={h.href}><strong>{h.title}</strong></Link>
                    <span>{h.type} · {h.module} · score {h.score.toFixed(2)}</span>
                    <p className="p5-muted">{h.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="ws-card">
          <header className="ws-card__head"><h2>AI summary</h2></header>
          <div className="ws-card__body">
            <ChatShell
              compact
              seedPrompt={q ? `Summarize search intent and top hits for: ${q}` : "Summarize top enterprise search hits."}
              fixedContext={{ module: "search", report: q || "Enterprise search" }}
            />
          </div>
        </section>
      </div>
      <section className="ws-card">
        <header className="ws-card__head"><h2>Recent natural-language searches</h2></header>
        <ul className="ws-feed">
          {recent.map((r) => (
            <li key={r.id}><button type="button" className="btn btn--ghost" onClick={() => setQ(r.query)}>{r.query}</button></li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ModuleCopilotsPage() {
  const [mod, setMod] = useState("sales");
  const prompts: Record<string, string> = {
    sales: "Draft a quote follow-up and summarize the active opportunity.",
    procurement: "Summarize supplier performance and draft an RFQ outline.",
    inventory: "Explain low-stock and overstock signals from inventory analytics.",
    finance: "Explain the cash flow snapshot and summarize expenses.",
    crm: "Summarize leads, account, and campaign performance.",
    projects: "Summarize project status, milestones, risks, and team activity.",
    service: "Summarize tickets, technician load, and work orders.",
  };

  return (
    <div className="stack ai-page">
      <PageHeader title="Module copilots" lead="Sales, Procurement, Inventory, Finance, CRM, Projects, and Service assistants — explain existing data only." />
      <div className="p5-seg">
        {Object.keys(prompts).map((m) => (
          <button key={m} type="button" className={mod === m ? "is-active" : undefined} onClick={() => setMod(m)}>{m}</button>
        ))}
      </div>
      <ChatShell title={`${mod[0]!.toUpperCase()}${mod.slice(1)} AI`} seedPrompt={prompts[mod]!} fixedContext={{ module: mod }} />
    </div>
  );
}

function AiSettingsPage() {
  const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings());
  const { toast } = useWorkspaceUi();
  const provider = getProvider(settings.provider);

  function update<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function save() {
    saveAiSettings(settings);
    toast({ tone: "ok", title: "AI settings saved", body: "Provider-agnostic preferences stored locally." });
  }

  return (
    <div className="stack ai-page">
      <PageHeader
        title="AI Settings"
        lead="Model selection, temperature, tokens, privacy, retention, and workspace context — no provider lock-in."
        actions={
          <Toolbar>
            <Button variant="ghost" onClick={() => { const d = defaultAiSettings(); setSettings(d); saveAiSettings(d); }}>Reset</Button>
            <Button onClick={save}>Save</Button>
          </Toolbar>
        }
      />
      <section className="ws-card">
        <div className="ws-card__body erp-form-grid">
          <label className="field">
            <span className="field__label">Provider</span>
            <select
              className="field__input"
              value={settings.provider}
              onChange={(e) => {
                const id = e.target.value as AiSettings["provider"];
                const p = getProvider(id);
                setSettings((s) => ({ ...s, provider: id, model: p.models[0]! }));
              }}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Model</span>
            <select className="field__input" value={settings.model} onChange={(e) => update("model", e.target.value)}>
              {provider.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Temperature ({settings.temperature.toFixed(1)})</span>
            <input
              className="field__input"
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={settings.temperature}
              onChange={(e) => update("temperature", Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span className="field__label">Max tokens</span>
            <input
              className="field__input"
              type="number"
              min={256}
              max={8192}
              value={settings.maxTokens}
              onChange={(e) => update("maxTokens", Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span className="field__label">Retention (days)</span>
            <input
              className="field__input"
              type="number"
              min={1}
              max={365}
              value={settings.retentionDays}
              onChange={(e) => update("retentionDays", Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span className="field__label">Privacy</span>
            <select className="field__input" value={settings.privacyMode} onChange={(e) => update("privacyMode", e.target.value as AiSettings["privacyMode"])}>
              <option value="standard">Standard</option>
              <option value="strict">Strict (minimize context)</option>
            </select>
          </label>
          <label className="p5-check">
            <input type="checkbox" checked={settings.shareWorkspaceContext} onChange={(e) => update("shareWorkspaceContext", e.target.checked)} />
            Share workspace context (module/page/record)
          </label>
          <label className="p5-check">
            <input type="checkbox" checked={settings.streamEnabled} onChange={(e) => update("streamEnabled", e.target.checked)} />
            Streaming responses
          </label>
        </div>
      </section>
    </div>
  );
}

function AiUsagePage() {
  const usage = loadUsage();
  const successRate = usage.requests ? Math.round((usage.successes / usage.requests) * 100) : 0;

  return (
    <div className="stack ai-page">
      <PageHeader title="AI Usage Dashboard" lead="Tokens, requests, conversations, success rate, errors, cost placeholders, and activity timeline." />
      <div className="bi-kpi-grid">
        <article className="bi-kpi"><span className="bi-kpi__label">Requests</span><strong className="bi-kpi__value">{usage.requests}</strong></article>
        <article className="bi-kpi"><span className="bi-kpi__label">Tokens (approx)</span><strong className="bi-kpi__value">{usage.tokensApprox.toLocaleString()}</strong></article>
        <article className="bi-kpi"><span className="bi-kpi__label">Conversations</span><strong className="bi-kpi__value">{loadConversations().length}</strong></article>
        <article className="bi-kpi"><span className="bi-kpi__label">Success rate</span><strong className="bi-kpi__value">{successRate}%</strong></article>
        <article className="bi-kpi"><span className="bi-kpi__label">Errors</span><strong className="bi-kpi__value">{usage.errors}</strong></article>
        <article className="bi-kpi"><span className="bi-kpi__label">Cost placeholder</span><strong className="bi-kpi__value">—</strong><span className="p5-muted">Billing via provider contracts</span></article>
      </div>
      <div className="bi-grid">
        <section className="ws-card">
          <div className="ws-card__body" style={{ display: "grid", justifyItems: "center" }}>
            <GaugeChart value={successRate} label="Success" />
            <Sparkline values={[40, 55, 50, 70, 65, 80, 78, successRate]} label="Requests trend" />
          </div>
        </section>
        <section className="ws-card">
          <header className="ws-card__head"><h2>Activity timeline</h2></header>
          <ul className="ws-feed">
            {usage.timeline.map((t, i) => (
              <li key={`${t.at}-${i}`}>
                <strong>{t.label}</strong>
                <span>{new Date(t.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function AiChatWithQueryPrompt() {
  const params = new URLSearchParams(window.location.search);
  const prompt = params.get("prompt");
  return (
    <div className="stack ai-page">
      <PageHeader
        title="Enterprise AI Assistant"
        lead="Context-aware assist over existing ERP, analytics, and search — assists users; does not replace workflows, policies, or calculations."
        actions={
          <Toolbar>
            <Link className="btn btn--ghost" to="/app/ai/workspace">Workspace</Link>
            <Link className="btn btn--ghost" to="/app/ai/writing">Writing studio</Link>
            <Link className="btn btn--ghost" to="/app/settings/ai">Settings</Link>
            <Link className="btn btn--primary" to="/app/ai/usage">Usage</Link>
          </Toolbar>
        }
      />
      <AiSubnav />
      <ChatShell title="Enterprise chat" {...(prompt ? { seedPrompt: prompt } : {})} />
    </div>
  );
}

export function AiRoutes() {
  return (
    <Routes>
      <Route index element={<AiChatWithQueryPrompt />} />
      <Route path="workspace" element={<AiWorkspacePage />} />
      <Route path="writing" element={<WritingStudioPage />} />
      <Route path="documents" element={<DocumentIntelligencePage />} />
      <Route path="knowledge" element={<KnowledgePage />} />
      <Route path="prompts" element={<PromptLibraryPage />} />
      <Route path="search" element={<SmartSearchPage />} />
      <Route path="modules" element={<ModuleCopilotsPage />} />
      <Route path="usage" element={<AiUsagePage />} />
      <Route path="*" element={<Navigate to="/app/ai" replace />} />
    </Routes>
  );
}

export { AiSettingsPage, AiUsagePage, SmartSearchPage };
