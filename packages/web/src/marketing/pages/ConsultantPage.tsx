import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { BRAND } from "../data/content";
import {
  initialAssistantMessage,
  nextConsultantTurn,
  type ConsultantState,
} from "../cx/consultant";
import {
  enqueueLead,
  loadConsultantHistory,
  saveConsultantHistory,
  type ConsultantMessage,
} from "../cx/stores";

/**
 * AI Furniture Consultant — showroom consultant UX.
 * Uses the existing public chat pattern + client conversation engine.
 * Future: swap engine for RC9 gateway without replacing the shell.
 */
export function ConsultantPage() {
  const [messages, setMessages] = useState<ConsultantMessage[]>(() => {
    const hist = loadConsultantHistory();
    return hist.length ? hist : [initialAssistantMessage()];
  });
  const [state, setState] = useState<ConsultantState>({});
  const [input, setInput] = useState("");

  useEffect(() => {
    saveConsultantHistory(messages);
  }, [messages]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === "restart") {
      setState({});
      setMessages([initialAssistantMessage()]);
      setInput("");
      return;
    }
    const userMsg: ConsultantMessage = {
      role: "user",
      text: trimmed,
      at: new Date().toISOString(),
    };
    const turn = nextConsultantTurn(state, trimmed);
    setState(turn.state);
    setMessages((m) => [...m, userMsg, ...turn.replies]);
    setInput("");
  }

  return (
    <>
      <Seo
        title="AI Furniture Consultant"
        description="Showroom-style furniture consulting for rooms, budgets, and packages."
        path="/consultant"
      />
      <header className="site-page-hero">
        <Breadcrumbs items={[{ label: "AI Furniture Consultant" }]} />
        <p className="site-eyebrow">Showroom consultant</p>
        <h1>AI Furniture Consultant</h1>
        <p>
          Not a generic chatbot — we ask about room type, dimensions, headcount, style, and budget,
          then recommend products, collections, colours, and next steps.
        </p>
      </header>

      <div className="site-section cx-consultant">
        <div className="cx-consultant__thread" role="log" aria-live="polite">
          {messages.map((m, i) => (
            <div key={`${m.at}-${i}`} className={`cx-consultant__bubble cx-consultant__bubble--${m.role}`}>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        <form
          className="cx-consultant__composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label htmlFor="consultant-input" className="site-sr">
            Message
          </label>
          <input
            id="consultant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer…"
          />
          <button type="submit" className="site-btn site-btn--primary">
            Send
          </button>
        </form>
        <div className="site-hero__actions">
          <Link to="/planner" className="site-btn site-btn--ghost">
            Open budget planner
          </Link>
          <Link to="/quote" className="site-btn site-btn--primary">
            Request quotation
          </Link>
          <Link to="/demo" className="site-btn site-btn--ghost">
            Book meeting
          </Link>
          <a
            className="site-btn site-btn--ghost"
            href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent("Hi AFH — I spoke with the furniture consultant and need a handoff.")}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp handoff
          </a>
          <Link to="/contact" className="site-btn site-btn--ghost">
            Live sales / contact
          </Link>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            onClick={() => {
              enqueueLead({
                intent: "AI consultant handoff",
                name: "Consultant visitor",
                email: "visitor@example.com",
                message: messages
                  .slice(-6)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n"),
                source: "ai-consultant",
                meta: { state },
              });
              window.alert("CRM lead draft created from conversation history.");
            }}
          >
            Create CRM lead
          </button>
        </div>
      </div>
    </>
  );
}
