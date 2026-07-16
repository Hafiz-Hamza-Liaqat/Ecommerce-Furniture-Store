import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: "primary" | "ghost" | "danger";
  readonly children: ReactNode;
}) {
  return (
    <button className={`btn btn--${variant}`} type={rest.type ?? "button"} {...rest}>
      {children}
    </button>
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
