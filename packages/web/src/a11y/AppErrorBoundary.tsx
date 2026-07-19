import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { EnterpriseError } from "../components/EnterpriseError";

type Props = {
  readonly children: ReactNode;
  readonly homeHref?: string;
  /** When this value changes, a previously caught error is cleared. */
  readonly resetKey?: string;
};

type State = {
  readonly error: Error | null;
};

/**
 * App-wide React error boundary → production EnterpriseError UI with retry.
 */
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidUpdate(prevProps: Props): void {
    if (
      this.state.error &&
      prevProps.resetKey !== undefined &&
      this.props.resetKey !== undefined &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ error: null });
    }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof console !== "undefined") {
      console.error("[afh] Uncaught UI error", error, info.componentStack);
    }
  }

  override render() {
    if (this.state.error) {
      const message = this.state.error.message;
      return (
        <EnterpriseError
          kind="server"
          title="Unexpected application error"
          {...(message
            ? {
                body: `${message}. You can retry or return to a safe page.`,
              }
            : {})}
          homeHref={this.props.homeHref ?? "/"}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

/** Resets the error boundary when the route changes (e.g. after login). */
export function RouteAwareErrorBoundary({
  children,
  homeHref,
}: {
  readonly children: ReactNode;
  readonly homeHref?: string;
}) {
  const location = useLocation();
  return (
    <AppErrorBoundary
      resetKey={`${location.pathname}${location.search}${location.key}`}
      {...(homeHref !== undefined ? { homeHref } : {})}
    >
      {children}
    </AppErrorBoundary>
  );
}
