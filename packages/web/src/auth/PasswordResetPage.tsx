import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, TextField } from "../components/ui";
import { FormShell } from "../forms/FormShell";
import { useSession } from "../state/session";
import { ApiClientError } from "../api/types";

export function PasswordResetPage() {
  const { api, setLastCorrelationId } = useSession();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mode, setMode] = useState<"request" | "confirm">("request");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onRequest() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.requestPasswordReset(email);
      setLastCorrelationId(result.correlationId);
      setMessage("If the account exists, a reset token was issued by the backend.");
      setMode("confirm");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.confirmPasswordReset({ token, newPassword });
      setLastCorrelationId(result.correlationId);
      setMessage("Password updated. You can sign in.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="panel auth-card">
        <h1>Password reset</h1>
        <p>Token issuance and policy checks run on the backend Identity service.</p>
        {message ? <Alert tone="ok">{message}</Alert> : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {mode === "request" ? (
          <FormShell
            submitLabel="Request reset"
            submitting={submitting}
            onSubmit={() => onRequest()}
            footer={<Link to="/login">Back to sign in</Link>}
          >
            <TextField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormShell>
        ) : (
          <FormShell
            submitLabel="Confirm new password"
            submitting={submitting}
            onSubmit={() => onConfirm()}
            footer={<Link to="/login">Back to sign in</Link>}
          >
            <TextField
              id="token"
              label="Reset token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <TextField
              id="newPassword"
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </FormShell>
        )}
      </div>
    </div>
  );
}
