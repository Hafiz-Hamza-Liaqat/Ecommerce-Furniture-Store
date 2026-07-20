import { startTransition, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, TextField } from "../components/ui";
import { FormShell } from "../forms/FormShell";
import { useSession } from "../state/session";
import { ApiClientError } from "../api/types";
import { BrandLogo } from "../brand/BrandLogo";
import { BRAND } from "../brand";
import { Seo } from "../marketing/Seo";
import { sanitizeReturnUrl } from "../marketing/nav/role-home";
import { mergeWishlistOnLogin } from "../marketing/cx/stores";

export function LoginPage() {
  const { api, setSession, setLastCorrelationId } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnUrl = sanitizeReturnUrl(params.get("returnUrl"));
  const reason = params.get("reason");
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
      mergeWishlistOnLogin();
      const destination = returnUrl ?? "/workspace";
      startTransition(() => {
        void navigate(destination, { replace: true });
      });
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
    <main className="auth-layout" data-testid="login-page">
      <Seo
        title="Sign in"
        description={`Sign in to the ${BRAND.name} enterprise operations console.`}
        path="/login"
        organizationSchema={false}
      />
      <div className="panel auth-card">
        <BrandLogo variant="full" className="auth-brand-logo" asLink={false} />
        <h1 className="sr-only">{BRAND.name}</h1>
        <p>
          Sign in to the enterprise operations console. Authorization is enforced by
          backend Policy.
        </p>
        {reason === "workspace" ? (
          <Alert tone="info">Please sign in to access your workspace.</Alert>
        ) : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <FormShell
          submitLabel="Sign in"
          submitting={submitting}
          onSubmit={() => onSubmit()}
          footer={
            <span className="row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
              <Link to="/password-reset" className="nav-link auth-card__link">
                Reset password
              </Link>
              <Link to="/register" className="nav-link auth-card__link">
                Create account
              </Link>
            </span>
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
    </main>
  );
}
