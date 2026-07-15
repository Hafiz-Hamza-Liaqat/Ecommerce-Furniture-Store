import { useState } from "react";
import { Alert, Button, PageHeader, TextField } from "../components/ui";
import { useSession } from "../state/session";
import { ApiClientError } from "../api/types";

export function MfaPage() {
  const { api, setLastCorrelationId } = useSession();
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function enable() {
    setError(null);
    try {
      const result = await api.enableMfa();
      setLastCorrelationId(result.correlationId);
      const data = result.data as { token?: string; challengeId?: string };
      setChallenge(data.token ?? data.challengeId ?? "enabled");
      setMessage("MFA enabled via Identity hook. Provider verification remains pluggable.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "MFA enable failed");
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Multi-factor authentication"
        lead="Screens for MFA enrollment and challenge entry. Policy decides when MFA is required."
      />
      {message ? <Alert tone="ok">{message}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="panel widget stack">
        <Button onClick={() => void enable()}>Enable MFA</Button>
        {challenge ? <Alert tone="info">Challenge: {challenge}</Alert> : null}
        <TextField
          id="mfa-code"
          label="Challenge code (for sign-in)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
    </div>
  );
}
