import { useRef, useState, type DragEvent } from "react";
import { pushDownloadHistory, loadDownloadHistory } from "../workspace/prefs";
import { Button } from "../components/ui";

export type StagedFile = {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  readonly progress: number;
  readonly previewUrl?: string;
  readonly version: number;
};

function isImage(mime: string) {
  return mime.startsWith("image/");
}

function isPdf(mime: string) {
  return mime === "application/pdf" || mime.endsWith("pdf");
}

export function FileDropzone({
  onRegistered,
  multi = true,
}: {
  readonly onRegistered: (files: StagedFile[]) => void;
  readonly multi?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [staging, setStaging] = useState<StagedFile[]>([]);

  function ingest(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list).slice(0, multi ? 12 : 1);
    const staged: StagedFile[] = files.map((f, i) => {
      const previewUrl =
        isImage(f.type) || isPdf(f.type) ? URL.createObjectURL(f) : null;
      const base = {
        id: `f-${Date.now()}-${i}`,
        name: f.name,
        mimeType: f.type || "application/octet-stream",
        size: f.size,
        progress: 0,
        version: 1,
      };
      return previewUrl ? { ...base, previewUrl } : base;
    });
    setStaging(staged);
    staged.forEach((s, idx) => {
      let p = 0;
      const tick = window.setInterval(() => {
        p = Math.min(100, p + 18 + Math.floor(Math.random() * 12));
        setStaging((prev) => prev.map((x) => (x.id === s.id ? { ...x, progress: p } : x)));
        if (p >= 100) {
          window.clearInterval(tick);
          if (idx === staged.length - 1) {
            window.setTimeout(() => {
              onRegistered(staged.map((x) => ({ ...x, progress: 100 })));
              setStaging([]);
            }, 200);
          }
        }
      }, 120);
    });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    ingest(e.dataTransfer.files);
  }

  return (
    <div className="stack">
      <div
        className={`p5-dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onClick={() => inputRef.current?.click()}
      >
        <strong>Drop files here</strong>
        <span>or click to browse — images, PDF, CAD metadata, and documents</span>
        <input
          ref={inputRef}
          type="file"
          multiple={multi}
          className="sr-only"
          onChange={(e) => ingest(e.target.files)}
        />
      </div>
      {staging.length > 0 ? (
        <ul className="p5-upload-list">
          {staging.map((f) => (
            <li key={f.id}>
              <div>
                <strong>{f.name}</strong>
                <span>
                  {(f.size / 1024).toFixed(1)} KB · v{f.version}
                </span>
              </div>
              <div className="p5-progress" aria-valuenow={f.progress} role="progressbar">
                <div style={{ width: `${f.progress}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function FilePreviewPanel({
  files,
}: {
  readonly files: readonly StagedFile[];
}) {
  const [active, setActive] = useState<StagedFile | null>(files[0] ?? null);
  const history = loadDownloadHistory();

  if (files.length === 0) {
    return <p className="p5-muted">No files yet. Upload to preview images and PDFs in-browser.</p>;
  }

  return (
    <div className="p5-preview">
      <ul className="p5-preview__list">
        {files.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              className={active?.id === f.id ? "is-active" : undefined}
              onClick={() => setActive(f)}
            >
              {f.name}
              <span>v{f.version}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="p5-preview__pane">
        {active ? (
          <>
            <header className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{active.name}</strong>
                <p className="p5-muted">
                  {active.mimeType} · version {active.version}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  pushDownloadHistory({ name: active.name, mimeType: active.mimeType });
                  if (active.previewUrl) {
                    const a = document.createElement("a");
                    a.href = active.previewUrl;
                    a.download = active.name;
                    a.click();
                  }
                }}
              >
                Download
              </Button>
            </header>
            {active.previewUrl && isImage(active.mimeType) ? (
              <img src={active.previewUrl} alt={active.name} className="p5-preview__img" />
            ) : active.previewUrl && isPdf(active.mimeType) ? (
              <iframe title={active.name} src={active.previewUrl} className="p5-preview__pdf" />
            ) : (
              <p className="p5-muted">Preview unavailable for this type — metadata and download still work.</p>
            )}
          </>
        ) : null}
        {history.length > 0 ? (
          <div className="p5-download-history">
            <h4>Download history</h4>
            <ul>
              {history.slice(0, 6).map((h) => (
                <li key={h.id}>
                  {h.name}
                  <span>{new Date(h.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
