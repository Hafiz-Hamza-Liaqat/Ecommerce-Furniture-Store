import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, TextField } from "../components/ui";
import { FormShell } from "../forms/FormShell";
import { useSession } from "../state/session";
import { ApiClientError } from "../api/types";

export function LoginPage() {
  const { api, setSession, setLastCorrelationId } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.signIn({
        email,
        password,
        ...(mfaToken ? { mfaToken } : {}),
      });
      setLastCorrelationId(result.correlationId);
      setSession(result.data.user, result.data.tokens);
      void navigate("/app");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setLastCorrelationId(err.correlationId);
        if (err.code === "mfa_required") {
          setNeedsMfa(true);
          setError("Multi-factor authentication required.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Unable to sign in.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="panel auth-card">
        <h1>Artisan Furnish Hub</h1>
        <p>Sign in to the enterprise operations console. Authorization is enforced by backend Policy.</p>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <FormShell
          submitLabel="Sign in"
          submitting={submitting}
          onSubmit={() => onSubmit()}
          footer={
            <Link to="/password-reset" className="nav-link" style={{ color: "var(--afh-copper)" }}>
              Reset password
            </Link>
          }
        >
          <TextField
            id="email"
            label="Email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {needsMfa ? (
            <TextField
              id="mfa"
              label="MFA code"
              autoComplete="one-time-code"
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value)}
            />
          ) : null}
        </FormShell>
      </div>
    </div>
  );
}
