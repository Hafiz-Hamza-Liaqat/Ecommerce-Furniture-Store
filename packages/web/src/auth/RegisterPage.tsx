import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, TextField } from "../components/ui";
import { FormShell } from "../forms/FormShell";
import { useSession } from "../state/session";
import { ApiClientError } from "../api/types";

export function RegisterPage() {
  const { api, setLastCorrelationId } = useSession();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.register({ email, password, fullName });
      setLastCorrelationId(result.correlationId);
      setMessage(
        "Account registered. Complete email verification after sign-in if required, then continue onboarding.",
      );
      window.setTimeout(() => void navigate("/login"), 1200);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setLastCorrelationId(err.correlationId);
        setError(err.message);
      } else {
        setError("Unable to register.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="panel auth-card">
        <h1>Create account</h1>
        <p>
          Registration uses the existing Identity AuthenticationService. Policy authorization and company activation
          remain server-side.
        </p>
        {message ? <Alert tone="ok">{message}</Alert> : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <FormShell
          submitLabel="Register"
          submitting={submitting}
          onSubmit={() => onSubmit()}
          footer={
            <span className="row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
              <Link to="/login">Sign in</Link>
              <Link to="/onboarding">Company onboarding</Link>
            </span>
          }
        >
          <TextField
            id="fullName"
            label="Full name"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormShell>
      </div>
    </div>
  );
}
