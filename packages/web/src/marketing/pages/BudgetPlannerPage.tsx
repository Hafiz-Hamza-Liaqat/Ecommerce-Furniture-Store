import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { formatPkr, type CatalogueProduct } from "../data/catalogue";
import {
  buildPackages,
  utilization,
  type EndUse,
  type PackageLine,
  type PlannerStyle,
} from "../cx/budget-planner";
import { enqueueLead, savePlan } from "../cx/stores";

const END_USES: EndUse[] = [
  "office",
  "home",
  "hotel",
  "restaurant",
  "school",
  "university",
  "hospital",
  "coworking",
  "clinic",
  "government",
];

type EditableLine = {
  product: CatalogueProduct;
  qty: number;
  role: string;
};

function cloneLines(lines: readonly PackageLine[]): EditableLine[] {
  return lines.map((l) => ({ product: l.product, qty: l.qty, role: l.role }));
}

function lineTotal(lines: readonly EditableLine[]): number {
  return lines.reduce((sum, l) => sum + l.product.pricePkr * l.qty, 0);
}

function buildQuoteQuery(lines: readonly EditableLine[]): string {
  const ids = lines.map((l) => `${l.product.id}:${l.qty}`).join(",");
  return `/quote?from=planner&lines=${encodeURIComponent(ids)}`;
}

function downloadPlannerPdf(opts: {
  title: string;
  budget: number;
  endUse: string;
  style: string;
  seats: number;
  lines: readonly EditableLine[];
  total: number;
}) {
  const rows = opts.lines
    .map(
      (l) =>
        `<tr><td>${l.role}</td><td>${l.product.name}</td><td>${l.qty}</td><td>${formatPkr(l.product.pricePkr * l.qty)}</td></tr>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${opts.title}</title>
<style>
body{font-family:Georgia,serif;color:#14201a;padding:2rem;max-width:720px;margin:auto}
h1{font-size:1.5rem} table{width:100%;border-collapse:collapse;margin-top:1rem}
th,td{border:1px solid #ccc;padding:.5rem;text-align:left;font-size:.9rem}
.meta{color:#555;font-size:.9rem}
@media print{button{display:none}}
</style></head><body>
<h1>${opts.title}</h1>
<p class="meta">${opts.endUse} · ${opts.style} · ${opts.seats} seats · Budget ${formatPkr(opts.budget)}</p>
<table><thead><tr><th>Role</th><th>Product</th><th>Qty</th><th>Line total</th></tr></thead>
<tbody>${rows}</tbody></table>
<p><strong>Package total: ${formatPkr(opts.total)}</strong></p>
<p class="meta">AFH presentation estimate — Sales quotation remains authoritative.</p>
<button onclick="window.print()">Print / Save as PDF</button>
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `afh-planner-${opts.endUse}.html`;
    a.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function BudgetPlannerPage() {
  const [budget, setBudget] = useState(2_000_000);
  const [endUse, setEndUse] = useState<EndUse>("office");
  const [style, setStyle] = useState<PlannerStyle>("modern");
  const [seats, setSeats] = useState(12);
  const [active, setActive] = useState<"economy" | "recommended" | "premium">("recommended");
  const [savedMsg, setSavedMsg] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [booting, setBooting] = useState(true);

  const packages = useMemo(
    () => buildPackages({ budgetPkr: budget, endUse, style, seats }),
    [budget, endUse, style, seats],
  );
  const pkg = packages.find((p) => p.tier === active) ?? packages[1]!;

  useEffect(() => {
    setBooting(true);
    const t = window.setTimeout(() => {
      const source = packages.find((p) => p.tier === active) ?? packages[1]!;
      setLines(cloneLines(source.lines));
      setBooting(false);
    }, 280);
    return () => window.clearTimeout(t);
  }, [packages, active]);

  const total = lineTotal(lines);
  const { remaining, percent } = utilization(budget, total);

  return (
    <>
      <Seo
        title="Furniture budget planner"
        description="Enter a PKR budget and receive recommended furniture packages."
        path="/planner"
      />
      <header className="site-page-hero">
        <Breadcrumbs items={[{ label: "Budget planner" }]} />
        <p className="site-eyebrow">Product finder</p>
        <h1>Furniture budget planner</h1>
        <p>
          Example: PKR 2,000,000 for an office — we recommend desks, chairs, conference, reception,
          storage, and accessories. Edit quantities live; architecture is ready for future AI
          recommendations.
        </p>
      </header>

      <form
        className="site-section site-form cx-planner-form"
        onSubmit={(e) => e.preventDefault()}
      >
        <label>
          Budget (PKR)
          <input
            type="number"
            min={50_000}
            step={50_000}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value) || 0)}
          />
        </label>
        <label>
          End use
          <select value={endUse} onChange={(e) => setEndUse(e.target.value as EndUse)}>
            {END_USES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label>
          Style
          <select value={style} onChange={(e) => setStyle(e.target.value as PlannerStyle)}>
            <option value="modern">Modern</option>
            <option value="executive">Executive</option>
            <option value="heritage">Heritage</option>
          </select>
        </label>
        <label>
          Seats / employees
          <input
            type="number"
            min={1}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value) || 1)}
          />
        </label>
      </form>

      <div className="site-section cx-package-tabs" role="tablist">
        {packages.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            className={p.tier === active ? "is-active" : ""}
            onClick={() => setActive(p.tier)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <section className="site-section cx-planner-result" aria-live="polite">
        <h2>{pkg.name}</h2>
        {booting ? (
          <div className="cx-skeleton-planner" aria-label="Loading package">
            <div className="cx-skeleton-card__line" />
            <div className="cx-skeleton-card__line" />
            <div className="cx-skeleton-card__line cx-skeleton-card__line--short" />
          </div>
        ) : (
          <>
            <p className="site-product__price">{formatPkr(total)}</p>
            <p>
              Budget utilization <strong>{percent}%</strong> · Remaining{" "}
              <strong>{formatPkr(remaining)}</strong>
            </p>
            <div className="cx-util-bar" aria-hidden="true">
              <span style={{ width: `${Math.min(100, percent)}%` }} />
            </div>
            <ul className="cx-planner-lines">
              {lines.map((l, i) => (
                <li key={`${l.product.id}-${l.role}`}>
                  <div className="cx-planner-line">
                    <Link to={`/products/${l.product.id}`}>
                      {l.role}: {l.product.name}
                    </Link>
                    <label className="cx-planner-qty">
                      Qty
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={l.qty}
                        onChange={(e) => {
                          const qty = Math.max(1, Math.min(99, Number(e.target.value) || 1));
                          setLines((prev) => prev.map((row, idx) => (idx === i ? { ...row, qty } : row)));
                        }}
                      />
                    </label>
                    <span>{formatPkr(l.product.pricePkr * l.qty)}</span>
                    <button
                      type="button"
                      className="site-btn site-btn--ghost"
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {lines.length === 0 ? (
              <p className="cx-muted" role="status">
                All lines removed — switch package tier or adjust inputs to rebuild.
              </p>
            ) : null}
          </>
        )}
        <div className="site-hero__actions">
          <button
            type="button"
            className="site-btn site-btn--ghost"
            disabled={lines.length === 0}
            onClick={() => {
              savePlan({
                budgetPkr: budget,
                endUse,
                style,
                seats,
                packageId: pkg.id,
                lineIds: lines.map((l) => l.product.id),
                totalPkr: total,
              });
              setSavedMsg("Plan saved in this browser.");
            }}
          >
            Save plan
          </button>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            disabled={lines.length === 0}
            onClick={() =>
              downloadPlannerPdf({
                title: pkg.name,
                budget,
                endUse,
                style,
                seats,
                lines,
                total,
              })
            }
          >
            Export PDF
          </button>
          <Link
            to={lines.length ? buildQuoteQuery(lines) : "/quote"}
            className="site-btn site-btn--primary"
            aria-disabled={lines.length === 0}
            onClick={(e) => {
              if (lines.length === 0) e.preventDefault();
            }}
          >
            Convert to quotation
          </Link>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            disabled={lines.length === 0}
            onClick={() => {
              enqueueLead({
                intent: "Budget planner inquiry",
                name: "Planner visitor",
                email: "visitor@example.com",
                message: `${pkg.name} for ${endUse}, seats ${seats}, budget ${budget}, total ${total}`,
                source: "budget-planner",
                meta: {
                  packageId: pkg.id,
                  lineIds: lines.map((l) => l.product.id),
                  quantities: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
                  budget,
                  total,
                },
              });
              setSavedMsg("CRM lead draft queued (local + ready for crm.CreateLead when authenticated).");
            }}
          >
            Create CRM lead
          </button>
          <Link to="/consultant" className="site-btn site-btn--ghost">
            Ask AI Furniture Consultant
          </Link>
        </div>
        {savedMsg ? (
          <p className="site-form-success" role="status">
            {savedMsg}
          </p>
        ) : null}
      </section>
    </>
  );
}
