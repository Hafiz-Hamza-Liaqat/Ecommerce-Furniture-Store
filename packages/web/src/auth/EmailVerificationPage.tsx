import { useState } from "react";
import { Alert, Button, TextField, PageHeader } from "../components/ui";
import { FormShell } from "../forms/FormShell";
import { useSession } from "../state/session";
import { ApiClientError } from "../api/types";

export function EmailVerificationPage() {
  const { api, setLastCorrelationId } = useSession();
  const [token, setToken] = useState("");
  const [issued, setIssued] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request() {
    setError(null);
    try {
      const result = await api.requestEmailVerification();
      setLastCorrelationId(result.correlationId);
      const data = result.data as { token?: string };
      setIssued(data.token ?? "issued");
      setMessage("Verification challenge issued by backend.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Request failed");
    }
  }

  async function confirm() {
    setError(null);
    try {
      const result = await api.confirmEmailVerification(token);
      setLastCorrelationId(result.correlationId);
      setMessage("Email verified.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Verify failed");
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Email verification"
        lead="UI only displays verification flow. Tokens are created and validated by Identity."
      />
      {message ? <Alert tone="ok">{message}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {issued ? <Alert tone="info">Challenge: {issued}</Alert> : null}
      <div className="panel widget stack">
        <Button onClick={() => void request()}>Request verification</Button>
        <FormShell submitLabel="Confirm token" onSubmit={() => confirm()}>
          <TextField
            id="token"
            label="Verification token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </FormShell>
      </div>
    </div>
  );
}
