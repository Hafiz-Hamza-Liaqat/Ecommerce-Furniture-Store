import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

export type ButtonVariant = "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonSurface = "app" | "site";

type ButtonBaseProps = {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly surface?: ButtonSurface;
  readonly loading?: boolean;
  readonly icon?: ReactNode;
  readonly iconPosition?: "start" | "end";
  readonly children: ReactNode;
};

function buttonClasses({
  variant = "primary",
  size = "md",
  surface = "app",
  loading = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  surface?: ButtonSurface;
  loading?: boolean;
  className?: string | undefined;
}): string {
  const base = surface === "site" ? "site-btn" : "btn";
  const parts = [
    base,
    `${base}--${variant}`,
    size === "sm" ? `${base}--sm` : "",
    size === "lg" ? `${base}--lg` : "",
    loading ? "is-loading" : "",
    className ?? "",
  ];
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  surface = "app",
  loading = false,
  disabled,
  icon,
  iconPosition = "start",
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & ButtonBaseProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      className={buttonClasses({ variant, size, surface, loading, className })}
      type={rest.type ?? "button"}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon && iconPosition === "start" ? icon : null}
      {children}
      {icon && iconPosition === "end" ? icon : null}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  surface = "site",
  loading = false,
  icon,
  iconPosition = "start",
  children,
  className,
  ...rest
}: LinkProps & ButtonBaseProps) {
  return (
    <Link
      className={buttonClasses({ variant, size, surface, loading, className })}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon && iconPosition === "start" ? icon : null}
      {children}
      {icon && iconPosition === "end" ? icon : null}
    </Link>
  );
}

export function TextField({
  label,
  id,
  error,
  required,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  readonly label: string;
  readonly id: string;
  readonly error?: string;
}) {
  const isRequired = required ?? rest["aria-required"] === true;
  return (
    <label className="field" htmlFor={id}>
      <span className={`field__label${isRequired ? " field__label--required" : ""}`}>{label}</span>
      <input
        id={id}
        className="field__input"
        aria-invalid={Boolean(error)}
        required={required}
        {...rest}
      />
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  readonly tone?: "info" | "danger" | "ok" | "warn";
  readonly title?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className={`alert alert--${tone}`} role={tone === "danger" ? "alert" : "status"}>
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { readonly label?: string }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner__dot" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function PageHeader({
  title,
  lead,
  actions,
}: {
  readonly title: string;
  readonly lead?: string;
  readonly actions?: ReactNode;
}) {
  return (
    <header className="page-header row" style={{ justifyContent: "space-between" }}>
      <div>
        <h1 className="page-title">{title}</h1>
        {lead ? <p className="page-lead">{lead}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function EmptyState({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}) {
  return (
    <div className="panel empty-state">
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}
