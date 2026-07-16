import { useState } from "react";

export function InquiryForm({ intent }: { intent: string }) {
  const [sent, setSent] = useState(false);
  if (sent) {
    return <p className="site-form-success" role="status">Thank you — our studio will respond shortly.</p>;
  }
  return (
    <form
      className="site-form"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
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
        <textarea name="message" rows={4} required defaultValue={`Regarding: ${intent}`} />
      </label>
      <button type="submit" className="site-btn site-btn--primary">
        Send inquiry
      </button>
    </form>
  );
}
