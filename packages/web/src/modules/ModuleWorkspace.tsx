/**
 * Generic presentation module workspace — queries/commands via API only.
 */

import { useState } from "react";
import { Alert, Button, PageHeader, Spinner, TextField } from "../components/ui";
import { FormShell } from "../forms/FormShell";
import { useSession } from "../state/session";
import { ApiClientError } from "../api/types";

export type ModuleSpec = {
  readonly title: string;
  readonly lead: string;
  readonly queryType: string;
  readonly queryPayloadHint: string;
  readonly commandType?: string;
  readonly commandPayloadHint?: string;
  readonly statusNote?: string;
};

export function ModuleWorkspace({ spec }: { readonly spec: ModuleSpec }) {
  const { api, setLastCorrelationId, developerMode } = useSession();
  const [queryPayload, setQueryPayload] = useState("{}");
  const [commandPayload, setCommandPayload] = useState("{}");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runQuery() {
    setLoading(true);
    setError(null);
    try {
      const payload = JSON.parse(queryPayload) as Record<string, unknown>;
      const response = await api.dispatchQuery({
        queryType: spec.queryType,
        payload,
      });
      setLastCorrelationId(response.correlationId);
      setResult(JSON.stringify(response.data, null, 2));
    } catch (err) {
      if (err instanceof ApiClientError) {
        setLastCorrelationId(err.correlationId);
        setError(`${err.message} (${err.code})`);
      } else if (err instanceof SyntaxError) {
        setError("Query payload must be valid JSON.");
      } else {
        setError("Query failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function runCommand() {
    if (!spec.commandType) return;
    setLoading(true);
    setError(null);
    try {
      const payload = JSON.parse(commandPayload) as Record<string, unknown>;
      const response = await api.dispatchCommand({
        commandType: spec.commandType,
        payload,
        idempotencyKey: crypto.randomUUID(),
      });
      setLastCorrelationId(response.correlationId);
      setResult(JSON.stringify(response.data, null, 2));
    } catch (err) {
      if (err instanceof ApiClientError) {
        setLastCorrelationId(err.correlationId);
        setError(`${err.message} (${err.code})`);
      } else if (err instanceof SyntaxError) {
        setError("Command payload must be valid JSON.");
      } else {
        setError("Command failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="module-workspace">
      <PageHeader title={spec.title} lead={spec.lead} />
      {spec.statusNote ? <Alert tone="info">{spec.statusNote}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="module-workspace__grid">
        <section className="panel widget stack">
          <h2 style={{ margin: 0, fontFamily: "var(--afh-font-brand)" }}>Query</h2>
          <p style={{ margin: 0, color: "var(--afh-ink-soft)" }}>
            Type: <code>{spec.queryType}</code>
          </p>
          <TextField
            id={`${spec.title}-query`}
            label={spec.queryPayloadHint}
            value={queryPayload}
            onChange={(e) => setQueryPayload(e.target.value)}
          />
          <Button onClick={() => void runQuery()} disabled={loading}>
            {loading ? <Spinner label="Loading" /> : "Run query"}
          </Button>
        </section>
        {spec.commandType ? (
          <section className="panel widget stack">
            <h2 style={{ margin: 0, fontFamily: "var(--afh-font-brand)" }}>
              Command
            </h2>
            <p style={{ margin: 0, color: "var(--afh-ink-soft)" }}>
              Type: <code>{spec.commandType}</code>
            </p>
            <FormShell
              submitLabel="Dispatch command"
              submitting={loading}
              onSubmit={() => runCommand()}
            >
              <TextField
                id={`${spec.title}-command`}
                label={spec.commandPayloadHint ?? "JSON payload"}
                value={commandPayload}
                onChange={(e) => setCommandPayload(e.target.value)}
              />
            </FormShell>
          </section>
        ) : (
          <section className="panel widget">
            <h2 style={{ margin: "0 0 0.5rem", fontFamily: "var(--afh-font-brand)" }}>
              Commands
            </h2>
            <p style={{ margin: 0, color: "var(--afh-ink-soft)" }}>
              This module is query-oriented in the current presentation shell.
            </p>
          </section>
        )}
      </div>
      {result ? (
        <section className="panel widget">
          <h2 style={{ margin: "0 0 0.5rem", fontFamily: "var(--afh-font-brand)" }}>
            Response
          </h2>
          <pre
            style={{
              margin: 0,
              overflow: "auto",
              fontSize: "0.85rem",
              whiteSpace: "pre-wrap",
            }}
          >
            {result}
          </pre>
          {developerMode ? (
            <p style={{ color: "var(--afh-ink-soft)", fontSize: "0.85rem" }}>
              Presentation only — no local business rules applied.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
