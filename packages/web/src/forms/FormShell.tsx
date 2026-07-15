/**
 * Reusable form shell — display validation/loading/errors from API.
 * Business validation remains backend.
 */

import type { FormEvent, ReactNode } from "react";
import { Button, Spinner } from "../components/ui";

export function FormShell({
  onSubmit,
  submitting,
  submitLabel,
  children,
  footer,
}: {
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  readonly submitting?: boolean;
  readonly submitLabel: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}) {
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(event);
      }}
      noValidate
    >
      {children}
      <div className="row">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Spinner label="Working…" /> : submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  );
}
