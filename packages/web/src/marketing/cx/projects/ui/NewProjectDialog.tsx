/**
 * RC10.1 — New Project dialog (required name; optional type/description/budget/location).
 */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { SpaceTemplateId } from "../../intelligent/space-brief";

export const PROJECT_NAME_MAX_LEN = 100;

/** UI choices; "custom" seeds a general home brief without implying a named programme. */
export type ProjectTypeChoice = SpaceTemplateId | "custom" | "";

export const PROJECT_TYPE_OPTIONS: ReadonlyArray<{
  readonly value: ProjectTypeChoice;
  readonly label: string;
}> = [
  { value: "", label: "Select type (optional)" },
  { value: "home", label: "Home" },
  { value: "office", label: "Office" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "hospital", label: "Hospital" },
  { value: "school", label: "School" },
  { value: "retail", label: "Retail" },
  { value: "jahez", label: "Jahez" },
  { value: "custom", label: "Custom" },
];

export function templateIdFromProjectType(type: ProjectTypeChoice): SpaceTemplateId {
  if (type === "custom") return "home";
  if (!type) return "office";
  return type;
}

export type NewProjectDraft = {
  readonly title: string;
  readonly templateId: SpaceTemplateId;
  readonly description?: string;
  readonly budgetPkr?: number;
  readonly location?: string;
};

export function validateProjectName(raw: string): string | null {
  const title = raw.trim();
  if (!title) return "Project name is required.";
  if (title.length > PROJECT_NAME_MAX_LEN) {
    return `Project name must be ${PROJECT_NAME_MAX_LEN} characters or fewer.`;
  }
  return null;
}

export function parseOptionalBudget(raw: string): { value?: number; error?: string } {
  const t = raw.trim();
  if (!t) return {};
  const n = Number(t.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) {
    return { error: "Budget must be a non-negative number." };
  }
  return { value: Math.round(n) };
}

export function NewProjectDialog({
  open,
  onClose,
  onCreate,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: NewProjectDraft) => void;
  error?: string | null;
}) {
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectTypeChoice>("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setType("");
    setDescription("");
    setBudget("");
    setLocation("");
    setNameError(null);
    setBudgetError(null);
    const t = window.setTimeout(() => nameRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    const nameErr = validateProjectName(name);
    setNameError(nameErr);
    const budgetParsed = parseOptionalBudget(budget);
    setBudgetError(budgetParsed.error ?? null);
    if (nameErr || budgetParsed.error) return;

    const descriptionTrim = description.trim();
    const locationTrim = location.trim();
    onCreate({
      title: name.trim(),
      templateId: templateIdFromProjectType(type),
      ...(descriptionTrim ? { description: descriptionTrim } : {}),
      ...(budgetParsed.value != null ? { budgetPkr: budgetParsed.value } : {}),
      ...(locationTrim ? { location: locationTrim } : {}),
    });
  }

  return (
    <div className="cx-new-project-dialog" role="presentation">
      <button
        type="button"
        className="cx-new-project-dialog__backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="cx-new-project-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="cx-new-project-dialog__head">
          <h2 id={titleId}>New project</h2>
          <p className="cx-muted">
            Name your project to get started. Type, description, budget, and location are optional.
          </p>
        </header>
        <form className="site-form cx-new-project-dialog__form" onSubmit={submit} noValidate>
          <label>
            Project name <span className="cx-required">*</span>
            <input
              ref={nameRef}
              type="text"
              value={name}
              maxLength={PROJECT_NAME_MAX_LEN}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(validateProjectName(e.target.value));
              }}
              placeholder="e.g. Bahria Office Interior"
              aria-required="true"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "cx-new-project-name-error" : undefined}
              autoComplete="off"
            />
          </label>
          {nameError ? (
            <p id="cx-new-project-name-error" className="site-form-error" role="alert">
              {nameError}
            </p>
          ) : null}

          <label>
            Project type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProjectTypeChoice)}
              aria-label="Project type"
            >
              {PROJECT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Short description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Optional notes about the space or client"
            />
          </label>

          <label>
            Budget (PKR)
            <input
              type="text"
              inputMode="numeric"
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value);
                if (budgetError) {
                  setBudgetError(parseOptionalBudget(e.target.value).error ?? null);
                }
              }}
              placeholder="Optional"
              aria-invalid={budgetError ? true : undefined}
            />
          </label>
          {budgetError ? (
            <p className="site-form-error" role="alert">
              {budgetError}
            </p>
          ) : null}

          <label>
            Location
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={200}
              placeholder="e.g. DHA Phase 6, Lahore"
            />
          </label>

          {error ? (
            <p className="site-form-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="cx-new-project-dialog__actions">
            <button type="button" className="site-btn site-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="site-btn site-btn--primary">
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
