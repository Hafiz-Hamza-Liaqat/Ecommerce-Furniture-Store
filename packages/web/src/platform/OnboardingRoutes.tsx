import { useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { BRAND } from "../brand";
import { Alert, Button, TextField, PageHeader } from "../components/ui";
import { EmptyState, StatusBadge } from "../workspace/widgets";
import { ONBOARDING_STEPS, ROLE_PRESETS } from "./catalog";
import { PlatformPublicShell, SectionCard } from "./PlatformShell";
import { loadOnboarding, pushAudit, saveOnboarding } from "./store";
import type { OnboardingDraft } from "./types";

function markComplete(draft: OnboardingDraft, stepId: string): OnboardingDraft {
  if (draft.completed.includes(stepId)) return draft;
  return { ...draft, completed: [...draft.completed, stepId] };
}

function OnboardingWizard() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(loadOnboarding);
  const step = ONBOARDING_STEPS[draft.step] ?? ONBOARDING_STEPS[0]!;
  const progress = Math.round(((draft.step + 1) / ONBOARDING_STEPS.length) * 100);

  function update(patch: Partial<OnboardingDraft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    saveOnboarding(next);
  }

  function nextStep() {
    const withDone = markComplete(draft, step.id);
    const nextIndex = Math.min(draft.step + 1, ONBOARDING_STEPS.length - 1);
    const next = { ...withDone, step: nextIndex };
    setDraft(next);
    saveOnboarding(next);
  }

  function prevStep() {
    update({ step: Math.max(0, draft.step - 1) });
  }

  function finish() {
    const done = markComplete(
      { ...draft, completed: [...new Set([...draft.completed, ...ONBOARDING_STEPS.map((s) => s.id)])] },
      "tour",
    );
    const next = { ...done, step: ONBOARDING_STEPS.length - 1 };
    setDraft(next);
    saveOnboarding(next);
    pushAudit("config", `Onboarding completed for ${next.companyName || "company"}`);
    navigate("/app");
  }

  const checklist = useMemo(
    () =>
      ONBOARDING_STEPS.map((s) => ({
        ...s,
        done: draft.completed.includes(s.id),
      })),
    [draft.completed],
  );

  return (
    <div className="stack plt-page">
      <PageHeader
        title="Customer onboarding"
        lead="Welcome wizard — company, branding, branches, warehouses, fiscal setup, invites, and guided walkthrough."
        actions={
          <Link className="btn btn--ghost" to="/app/platform">
            Platform ops
          </Link>
        }
      />
      <div className="plt-progress" aria-label={`Onboarding ${progress}% complete`}>
        <div className="plt-progress__fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="plt-muted">
        Step {draft.step + 1} of {ONBOARDING_STEPS.length}: <strong>{step.label}</strong> — {step.description}
      </p>

      <SectionCard title={step.label} lead={step.description}>
        {step.id === "welcome" ? (
          <Alert tone="ok" title={`Welcome to ${BRAND.name}`}>
            This guided setup prepares your tenant for production use. No architecture or business rules are changed —
            preferences and company profile only.
          </Alert>
        ) : null}

        {step.id === "company" ? (
          <TextField
            id="ob-company"
            label="Company name"
            value={draft.companyName}
            onChange={(e) => update({ companyName: e.target.value })}
            placeholder="Rao Liaqat Furniture"
          />
        ) : null}

        {step.id === "branding" ? (
          <div className="plt-form-grid">
            <TextField
              id="ob-color"
              label="Brand color"
              type="color"
              value={draft.brandColor}
              onChange={(e) => update({ brandColor: e.target.value })}
            />
            <label className="field" htmlFor="ob-logo">
              <span className="field__label">Logo upload</span>
              <input
                id="ob-logo"
                className="field__input"
                type="file"
                accept="image/*"
                onChange={(e) => update({ logoName: e.target.files?.[0]?.name ?? "" })}
              />
              {draft.logoName ? <span className="field__hint">Selected: {draft.logoName}</span> : null}
            </label>
          </div>
        ) : null}

        {step.id === "branch" ? (
          <TextField
            id="ob-branch"
            label="Primary branch"
            value={draft.branchName}
            onChange={(e) => update({ branchName: e.target.value })}
            placeholder="Lahore HQ"
          />
        ) : null}

        {step.id === "warehouse" ? (
          <TextField
            id="ob-wh"
            label="Default warehouse"
            value={draft.warehouseName}
            onChange={(e) => update({ warehouseName: e.target.value })}
            placeholder="Lahore DC"
          />
        ) : null}

        {step.id === "fiscal" ? (
          <TextField
            id="ob-fy"
            label="Fiscal year start"
            type="date"
            value={draft.fiscalYearStart}
            onChange={(e) => update({ fiscalYearStart: e.target.value })}
          />
        ) : null}

        {step.id === "currency" ? (
          <label className="field" htmlFor="ob-cur">
            <span className="field__label">Base currency</span>
            <select
              id="ob-cur"
              className="field__input"
              value={draft.currency}
              onChange={(e) => update({ currency: e.target.value })}
            >
              {["PKR", "USD", "EUR", "AED", "GBP"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {step.id === "tax" ? (
          <label className="field" htmlFor="ob-tax">
            <span className="field__label">Tax profile</span>
            <select
              id="ob-tax"
              className="field__input"
              value={draft.taxProfile}
              onChange={(e) => update({ taxProfile: e.target.value })}
            >
              <option value="GST-standard">GST standard</option>
              <option value="VAT-export">VAT export</option>
              <option value="zero-rated">Zero-rated</option>
            </select>
          </label>
        ) : null}

        {step.id === "invites" ? (
          <label className="field" htmlFor="ob-inv">
            <span className="field__label">User invitations (comma-separated emails)</span>
            <textarea
              id="ob-inv"
              className="field__input"
              rows={3}
              value={draft.inviteEmails}
              onChange={(e) => update({ inviteEmails: e.target.value })}
              placeholder="ops@company.com, finance@company.com"
            />
          </label>
        ) : null}

        {step.id === "roles" ? (
          <div className="plt-role-grid">
            {ROLE_PRESETS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`plt-role ${draft.rolePreset === r.id ? "is-active" : ""}`}
                onClick={() => update({ rolePreset: r.id })}
              >
                <strong>{r.label}</strong>
                <span>{r.permissions}</span>
              </button>
            ))}
          </div>
        ) : null}

        {step.id === "prefs" ? (
          <Alert tone="info" title="Default preferences">
            Theme, density, and accessibility defaults follow the existing Preferences center (
            <Link to="/app/preferences">/app/preferences</Link>). No new preference engine.
          </Alert>
        ) : null}

        {step.id === "checklist" ? (
          <ul className="plt-checklist">
            {checklist.map((c) => (
              <li key={c.id}>
                <StatusBadge tone={c.done ? "ok" : "neutral"} status={c.done ? "Done" : "Pending"} />
                <span>
                  {c.label} — {c.description}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {step.id === "tour" ? (
          <div className="stack">
            <EmptyState
              title="Guided walkthrough ready"
              body="Open the executive dashboard to continue. Demo mode can seed a sample company without production data."
            />
            <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
              <Link className="btn btn--primary" to="/app">
                Enter workspace
              </Link>
              <Link className="btn btn--ghost" to="/app/platform/demo">
                Demo mode
              </Link>
              <Link className="btn btn--ghost" to="/app/platform/success">
                Success center
              </Link>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        <Button variant="ghost" onClick={prevStep} disabled={draft.step === 0}>
          Back
        </Button>
        {draft.step < ONBOARDING_STEPS.length - 1 ? (
          <Button variant="primary" onClick={nextStep}>
            Continue
          </Button>
        ) : (
          <Button variant="primary" onClick={finish}>
            Complete onboarding
          </Button>
        )}
      </div>
    </div>
  );
}

export function OnboardingRoutes() {
  return (
    <Routes>
      <Route
        element={
          <PlatformPublicShell
            brand={`${BRAND.name} Onboarding`}
            homeTo="/onboarding"
            nav={[
              { to: "/onboarding", label: "Wizard" },
              { to: "/app/platform/success", label: "Success" },
              { to: "/portal", label: "Customer portal" },
            ]}
          />
        }
      >
        <Route index element={<OnboardingWizard />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Route>
    </Routes>
  );
}
