import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui";
import { Toolbar, StatusBadge } from "../workspace/widgets";
import { DEPT_PERFORMANCE, INSIGHTS } from "./data";
import { HorizontalBarChart } from "../workspace/charts";
import { AnalyticsErrorBoundary } from "./shared";

export function InsightsCenterPage() {
  const top = [...DEPT_PERFORMANCE].sort((a, b) => b.score - a.score).slice(0, 4);
  const bottom = [...DEPT_PERFORMANCE].sort((a, b) => a.score - b.score).slice(0, 4);

  return (
    <div className="stack bi-page">
      <PageHeader
        title="Insight Center"
        lead="Business highlights, opportunities, risks, and trends. Use AFH Assist for explanations — autonomous agents are out of scope."
        actions={
          <Toolbar>
            <Link className="btn btn--ghost" to="/app/ai">AI Assistant</Link>
            <Link className="btn btn--ghost" to="/app/analytics">Intelligence</Link>
            <Link className="btn btn--primary" to="/app/reports">Reports</Link>
          </Toolbar>
        }
      />

      <AnalyticsErrorBoundary>
        <div className="bi-insight-grid">
          {INSIGHTS.map((insight) => (
            <article key={insight.id} className={`bi-insight bi-insight--${insight.kind}`}>
              <StatusBadge status={insight.kind} tone={insight.kind === "risk" ? "danger" : insight.kind === "opportunity" ? "ok" : "neutral"} />
              <h3>{insight.title}</h3>
              <p>{insight.body}</p>
            </article>
          ))}
        </div>

        <div className="bi-grid">
          <section className="ws-card">
            <header className="ws-card__head"><h2>Top-performing departments</h2></header>
            <div className="ws-card__body">
              <HorizontalBarChart
                label="Top"
                color="var(--afh-teal)"
                items={top.map((d) => ({ name: d.name, value: d.score }))}
              />
              <ul className="ws-feed">
                {top.map((d) => (
                  <li key={d.name}>
                    <Link to={d.href}>{d.name}</Link>
                    <span>{d.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="ws-card">
            <header className="ws-card__head"><h2>Bottom-performing departments</h2></header>
            <div className="ws-card__body">
              <HorizontalBarChart
                label="Bottom"
                color="var(--afh-copper)"
                items={bottom.map((d) => ({ name: d.name, value: d.score }))}
              />
              <ul className="ws-feed">
                {bottom.map((d) => (
                  <li key={d.name}>
                    <Link to={d.href}>{d.name}</Link>
                    <span>{d.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </AnalyticsErrorBoundary>
    </div>
  );
}
