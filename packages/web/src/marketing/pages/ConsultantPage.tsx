import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { BRAND } from "../data/content";
import {
  clearConsultantMemory,
  getConsultantProvider,
  initialAssistantMessage,
  loadConsultantMemory,
  saveConsultantMemory,
  type ConsultantAction,
  type ConsultantCard,
  type ConsultantMemory,
  type ConsultantTurnResult,
} from "../cx/consultant";
import {
  enqueueLead,
  loadConsultantHistory,
  saveConsultantHistory,
  type ConsultantMessage,
} from "../cx/stores";
import { useReveal } from "../useReveal";

/**
 * AI Furniture Consultant — showroom consultant UX (RC9.2).
 * Shell retained; conversation engine is grounded + provider-abstracted.
 */
export function ConsultantPage() {
  useReveal();
  const threadId = useId();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ConsultantMessage[]>(() => {
    const hist = loadConsultantHistory();
    return hist.length ? hist : [initialAssistantMessage()];
  });
  const [state, setState] = useState<ConsultantMemory>(() => loadConsultantMemory());
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [streamPreview, setStreamPreview] = useState("");

  useEffect(() => {
    saveConsultantHistory(messages);
  }, [messages]);

  useEffect(() => {
    saveConsultantMemory(state);
  }, [state]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing, streamPreview]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing) return;

    if (trimmed.toLowerCase() === "restart") {
      clearConsultantMemory();
      setState({});
      setMessages([initialAssistantMessage()]);
      setInput("");
      setStreamPreview("");
      return;
    }

    const userMsg: ConsultantMessage = {
      role: "user",
      text: trimmed,
      at: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    setStreamPreview("");

    const provider = getConsultantProvider();
    let finalTurn: ConsultantTurnResult | undefined;
    let preview = "";

    try {
      for await (const chunk of provider.chat({
        memory: state,
        userText: trimmed,
        history: [...messages, userMsg].map((m) => ({ role: m.role, text: m.text })),
      })) {
        if (chunk.delta) {
          preview += chunk.delta;
          setStreamPreview(preview);
        }
        if (chunk.turn) finalTurn = chunk.turn;
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "I hit a temporary issue generating a reply. Please try again — I will not invent products or prices.",
          at: new Date().toISOString(),
        },
      ]);
      setTyping(false);
      setStreamPreview("");
      return;
    }

    if (finalTurn) {
      setState(finalTurn.state);
      setMessages((m) => [...m, ...finalTurn!.replies]);
    }
    setTyping(false);
    setStreamPreview("");
  }

  function onAction(action: ConsultantAction) {
    if (action.kind === "chip" && action.value) {
      void send(action.value);
      return;
    }
    if (action.kind === "lead") {
      enqueueLead({
        intent: "AI consultant handoff",
        name: "Consultant visitor",
        email: "visitor@example.com",
        message: messages
          .slice(-8)
          .map((m) => `${m.role}: ${m.text}`)
          .join("\n"),
        source: "ai-consultant",
        meta: { state },
      });
      window.alert("CRM lead draft created from conversation history.");
      return;
    }
    if (action.href) {
      if (action.kind === "whatsapp") {
        window.open(action.href, "_blank", "noreferrer");
        return;
      }
      window.location.assign(action.href);
    }
  }

  return (
    <>
      <Seo
        title="AI Furniture Consultant"
        description="Grounded AFH furniture consulting — natural language, catalogue recommendations, packages, and quotation handoff."
        path="/consultant"
      />
      <header className="site-page-hero">
        <Breadcrumbs items={[{ label: "AI Furniture Consultant" }]} />
        <p className="site-eyebrow">Showroom consultant</p>
        <h1>AI Furniture Consultant</h1>
        <p>
          Speak naturally about rooms, headcount, style, and budget. Recommendations are grounded in the
          AFH catalogue — never invented — with packages, alternatives, and sales handoff when you are ready.
        </p>
      </header>

      <div className="site-section cx-consultant">
        <div
          id={threadId}
          className="cx-consultant__thread"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          tabIndex={0}
        >
          {messages.map((m, i) => (
            <article
              key={`${m.at}-${i}`}
              className={`cx-consultant__bubble cx-consultant__bubble--${m.role}`}
            >
              <p>{m.text}</p>
              {m.cards?.length ? (
                <div className="cx-consultant__cards">
                  {m.cards.map((card, ci) => (
                    <ConsultantCardView key={`${card.type}-${ci}`} card={card} onAction={onAction} />
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {typing ? (
            <div className="cx-consultant__bubble cx-consultant__bubble--assistant cx-consultant__typing" aria-busy="true">
              <span className="cx-consultant__typing-dots" aria-hidden>
                <i /><i /><i />
              </span>
              <span className="site-sr">Consultant is typing</span>
              {streamPreview ? <p className="cx-consultant__stream">{streamPreview}</p> : null}
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form
          className="cx-consultant__composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <label htmlFor="consultant-input" className="site-sr">
            Message the furniture consultant
          </label>
          <input
            id="consultant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. I need furniture for a 20-person software company…"
            disabled={typing}
            autoComplete="off"
          />
          <button type="submit" className="site-btn site-btn--primary" disabled={typing || !input.trim()}>
            Send
          </button>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            onClick={() => void send("restart")}
            disabled={typing}
          >
            Restart
          </button>
        </form>

        <div className="cx-consultant__quick" aria-label="Quick actions">
          <Link to="/planner" className="site-btn site-btn--ghost">
            Budget planner
          </Link>
          <Link to="/quote?from=consultant" className="site-btn site-btn--primary">
            Request quotation
          </Link>
          <Link to="/demo" className="site-btn site-btn--ghost">
            Book consultation
          </Link>
          <a
            className="site-btn site-btn--ghost"
            href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent("Hi AFH — I spoke with the furniture consultant and need a handoff.")}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <Link to="/contact" className="site-btn site-btn--ghost">
            Contact sales
          </Link>
        </div>
      </div>
    </>
  );
}

function ConsultantCardView({
  card,
  onAction,
}: {
  card: ConsultantCard;
  onAction: (a: ConsultantAction) => void;
}) {
  if (card.type === "product") {
    return (
      <div className="cx-consultant-card cx-consultant-card--product">
        <Link to={card.href} className="cx-consultant-card__media">
          <img src={card.image} alt="" loading="lazy" decoding="async" />
        </Link>
        <div className="cx-consultant-card__body">
          <p className="cx-consultant-card__eyebrow">Recommended</p>
          <h3>
            <Link to={card.href}>{card.name}</Link>
          </h3>
          <p className="site-product__price">{card.priceFrom}</p>
          <ul className="cx-consultant-card__reasons">
            {card.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {card.alternatives.length ? (
            <div className="cx-consultant-card__alts">
              <p className="cx-consultant-card__eyebrow">Alternatives</p>
              <ul>
                {card.alternatives.map((a) => (
                  <li key={a.productId}>
                    <Link to={a.href}>{a.name}</Link>
                    <span> — {a.tradeoff}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (card.type === "package") {
    return (
      <div className={`cx-consultant-card cx-consultant-card--package cx-consultant-card--${card.tier}`}>
        <div className="cx-consultant-card__body">
          <p className="cx-consultant-card__eyebrow">{card.tier} package</p>
          <h3>{card.name}</h3>
          <p className="site-product__price">{card.totalLabel}</p>
          {card.budgetLabel ? (
            <p className="cx-meta-line">
              Budget {card.budgetLabel}
              {card.utilizationPercent != null ? ` · ${card.utilizationPercent}% used` : ""}
              {card.remainingLabel ? ` · ${card.remainingLabel} remaining` : ""}
            </p>
          ) : null}
          <ul className="cx-consultant-card__lines">
            {card.lines.map((l) => (
              <li key={`${l.productId}-${l.role}`}>
                <Link to={l.href}>{l.name}</Link>
                <span>
                  {" "}
                  · {l.role} × {l.qty} · {l.lineTotalLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (card.type === "quote") {
    return (
      <div className="cx-consultant-card cx-consultant-card--quote">
        <div className="cx-consultant-card__body">
          <p className="cx-consultant-card__eyebrow">Draft quotation</p>
          <h3>{card.title}</h3>
          <ul className="cx-consultant-card__lines">
            {card.lines.map((l) => (
              <li key={l.productId}>
                {l.name} × {l.qty} · {l.lineTotalLabel}
              </li>
            ))}
          </ul>
          <p className="site-product__price">Subtotal {card.subtotalLabel}</p>
          <ul className="cx-consultant-card__reasons">
            {card.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <Link to={card.quoteHref} className="site-btn site-btn--primary">
            Continue to quotation
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cx-consultant-card cx-consultant-card--actions" role="group" aria-label="Suggestions">
      {card.actions.map((a) =>
        a.kind === "chip" || a.kind === "lead" ? (
          <button
            key={a.id}
            type="button"
            className="site-btn site-btn--ghost"
            onClick={() => onAction(a)}
          >
            {a.label}
          </button>
        ) : (
          <a
            key={a.id}
            className="site-btn site-btn--ghost"
            href={a.href}
            {...(a.kind === "whatsapp" ? { target: "_blank", rel: "noreferrer" } : {})}
            onClick={(e) => {
              if (a.kind === "whatsapp" || a.kind === "link" || a.kind === "quote" || a.kind === "planner") {
                /* allow default navigation */
                return;
              }
              e.preventDefault();
              onAction(a);
            }}
          >
            {a.label}
          </a>
        ),
      )}
    </div>
  );
}
