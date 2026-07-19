import { useState } from "react";
import { enqueueLead } from "./cx/stores";
import { useSession } from "../state/session";

type Props = {
  readonly intent: string;
  readonly meta?: Record<string, unknown>;
  readonly defaultMessage?: string;
};

/**
 * Public inquiry form. Queues a lead locally always.
 * When authenticated, attempts crm.CreateLead (Policy-gated) with valid payload fields.
 */
export function InquiryForm({ intent, meta, defaultMessage }: Props) {
  const { api, tokens, user } = useSession();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  if (sent) {
    return (
      <p className="site-form-success" role="status">
        Thank you — your inquiry was received. Our studio will follow up shortly.
      </p>
    );
  }

  return (
    <form
      className="site-form"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
        const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
        const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value.trim();

        enqueueLead({
          intent,
          name,
          email,
          message,
          source: "inquiry-form",
          ...(meta ? { meta } : {}),
        });

        const tryCrm = async () => {
          const companyId = user?.companyId;
          if (!tokens?.sessionId || !companyId) {
            setSent(true);
            return;
          }
          setPending(true);
          try {
            await api.dispatchCommand({
              commandType: "crm.CreateLead",
              payload: {
                companyId,
                title: `${intent} — ${name} <${email}>`.slice(0, 180),
                sourceName: "web",
              },
            });
          } catch {
            // Local queue already saved.
          } finally {
            setPending(false);
            setSent(true);
          }
        };

        void tryCrm();
      }}
    >
      <input type="hidden" name="intent" value={intent} />
      <label>
        Name
        <input name="name" required autoComplete="name" />
      </label>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Message
        <textarea
          name="message"
          rows={6}
          required
          defaultValue={defaultMessage ?? `Regarding: ${intent}`}
        />
      </label>
      <button type="submit" className="site-btn site-btn--primary" disabled={pending}>
        {pending ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
