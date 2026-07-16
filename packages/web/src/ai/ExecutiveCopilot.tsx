import { Link } from "react-router-dom";
import { ChatShell } from "./ChatShell";
import { PageHeader } from "../components/ui";
import { Toolbar } from "../workspace/widgets";

/** Executive AI Copilot embedded in Analytics. */
export function ExecutiveCopilotPanel() {
  return (
    <section className="ws-card ai-copilot">
      <header className="ws-card__head">
        <h2>Executive AI Copilot</h2>
        <Toolbar>
          <Link className="btn btn--ghost" to="/app/ai">Open full assistant</Link>
        </Toolbar>
      </header>
      <div className="ws-card__body">
        <p className="p5-muted">
          Explain KPIs and trends, summarize reports, highlight risks/opportunities, and draft executive briefings — presentation over Analytics snapshots.
        </p>
        <ChatShell
          compact
          title="Analytics copilot"
          seedPrompt="Provide a weekly executive briefing: explain KPI trends, highlight risks and opportunities."
          fixedContext={{ module: "analytics", dashboard: "Executive intelligence" }}
        />
      </div>
    </section>
  );
}

export function ExecutiveCopilotPage() {
  return (
    <div className="stack ai-page">
      <PageHeader title="Executive AI Copilot" lead="Analytics-aware briefings and explanations." />
      <ExecutiveCopilotPanel />
    </div>
  );
}
