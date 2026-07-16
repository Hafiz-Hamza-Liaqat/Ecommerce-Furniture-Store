import type { ReactNode } from "react";
import { Suspense } from "react";
import { Link } from "react-router-dom";
import { ApiClientError } from "../api/types";
import { Button } from "./ui";

export type EnterpriseErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "server"
  | "network"
  | "timeout"
  | "validation"
  | "generic";

const PRESETS: Record<
  EnterpriseErrorKind,
  { readonly code: string; readonly title: string; readonly body: string }
> = {
  unauthorized: {
    code: "401",
    title: "Sign in required",
    body: "Your session expired or you are not signed in. Policy authorization happens on the server after authentication.",
  },
  forbidden: {
    code: "403",
    title: "Access denied",
    body: "Policy denied this action. The UI never authorizes — contact your administrator if you believe this is incorrect.",
  },
  "not-found": {
    code: "404",
    title: "Page not found",
    body: "The resource you requested does not exist or has moved.",
  },
  server: {
    code: "500",
    title: "Something went wrong",
    body: "The server encountered an error. Try again or contact support with your correlation ID.",
  },
  network: {
    code: "Offline",
    title: "Network unavailable",
    body: "Check your connection. Cached content may still be available while offline.",
  },
  timeout: {
    code: "Timeout",
    title: "Request timed out",
    body: "The server took too long to respond. Retry when connectivity improves.",
  },
  validation: {
    code: "Validation",
    title: "Check your input",
    body: "One or more fields failed validation. Correct the highlighted items and submit again.",
  },
  generic: {
    code: "Error",
    title: "Something went wrong",
    body: "An unexpected error occurred.",
  },
};

export function EnterpriseError({
  kind = "generic",
  title,
  body,
  code,
  inline = false,
  onRetry,
  homeHref = "/app",
  loginHref = "/login",
}: {
  readonly kind?: EnterpriseErrorKind;
  readonly title?: string;
  readonly body?: string;
  readonly code?: string;
  readonly inline?: boolean;
  readonly onRetry?: () => void;
  readonly homeHref?: string;
  readonly loginHref?: string;
}) {
  const preset = PRESETS[kind];
  const displayCode = code ?? preset.code;
  const displayTitle = title ?? preset.title;
  const displayBody = body ?? preset.body;
  const classKind = kind === "not-found" ? "not-found" : kind;

  return (
    <div
      className={`afh-error afh-error--${classKind}${inline ? " afh-error--inline" : ""}`}
      role={kind === "validation" || kind === "server" || kind === "network" ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="afh-error__code" aria-hidden>
        {displayCode}
      </div>
      <h2 className="afh-error__title">{displayTitle}</h2>
      <p className="afh-error__body">{displayBody}</p>
      <div className="afh-error__actions">
        {onRetry ? (
          <Button variant="primary" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
        {kind === "unauthorized" ? (
          <Link className="btn btn--primary" to={loginHref}>
            Sign in
          </Link>
        ) : (
          <Link className="btn btn--ghost" to={homeHref}>
            Go to workspace
          </Link>
        )}
        {kind === "not-found" ? (
          <Link className="btn btn--ghost" to="/">
            Marketing home
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function RouteFallback() {
  return (
    <div className="afh-route-fallback" aria-busy="true" aria-label="Loading page">
      <div className="ws-skeleton">
        <div className="ws-skeleton__row" />
        <div className="ws-skeleton__row" />
        <div className="ws-skeleton__row" style={{ width: "72%" }} />
      </div>
    </div>
  );
}

export function RouteSuspense({ children }: { readonly children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export function errorKindFromStatus(status: number): EnterpriseErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status >= 500) return "server";
  return "generic";
}

export function errorKindFromApi(err: unknown): EnterpriseErrorKind {
  if (err instanceof ApiClientError) {
    if (err.status === 401) return "unauthorized";
    if (err.status === 403) return "forbidden";
    if (err.status === 404) return "not-found";
    if (err.status >= 500) return "server";
    if (err.category === "validation") return "validation";
    return "generic";
  }
  if (err instanceof TypeError) return "network";
  if (err instanceof DOMException && err.name === "AbortError") return "timeout";
  return "generic";
}
