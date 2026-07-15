import { useState } from "react";
import { Alert, PageHeader, TextField } from "../components/ui";
import { FormShell } from "../forms/FormShell";
import { useSession } from "../state/session";
import { ApiClientError } from "../api/types";

export function DamPage() {
  const { api, user, setLastCorrelationId } = useSession();
  const [name, setName] = useState("");
  const [mimeType, setMimeType] = useState("application/octet-stream");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onUpload() {
    setSubmitting(true);
    setError(null);
    try {
      const companyId = user?.companyId;
      if (!companyId) {
        setError("Company context required for DAM upload.");
        return;
      }
      const response = await api.upload({
        companyId,
        name,
        mimeType,
        assetType: "document",
      });
      setLastCorrelationId(response.correlationId);
      setResult(JSON.stringify(response.data, null, 2));
    } catch (err) {
      if (err instanceof ApiClientError) {
        setLastCorrelationId(err.correlationId);
        setError(err.message);
      } else {
        setError("Upload failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Digital asset management"
        lead="Frontend uploads metadata through the API. DAM owns assets and storage."
      />
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <section className="panel widget">
        <FormShell
          submitLabel="Route upload"
          submitting={submitting}
          onSubmit={() => onUpload()}
        >
          <TextField
            id="name"
            label="Asset name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            id="mimeType"
            label="MIME type"
            value={mimeType}
            onChange={(e) => setMimeType(e.target.value)}
          />
        </FormShell>
      </section>
      {result ? (
        <pre className="panel widget" style={{ overflow: "auto" }}>
          {result}
        </pre>
      ) : null}
    </div>
  );
}
