import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { CATALOGUE, formatPkr, getCatalogueProduct } from "../data/catalogue";
import { clearCompare, getCompareIds, toggleCompare } from "../cx/stores";
import { enqueueLead } from "../cx/stores";

const ROWS: { key: string; label: string; get: (id: string) => string }[] = [
  { key: "price", label: "Price", get: (id) => getCatalogueProduct(id)?.priceFrom ?? "—" },
  {
    key: "dims",
    label: "Dimensions",
    get: (id) => getCatalogueProduct(id)?.dimensions ?? getCatalogueProduct(id)?.specs.find((s) => /width|length|size|depth/i.test(s.label))?.value ?? "—",
  },
  {
    key: "material",
    label: "Materials",
    get: (id) =>
      getCatalogueProduct(id)?.material ??
      getCatalogueProduct(id)?.specs.find((s) => /wood|top|surface|frame|upholstery|material/i.test(s.label))
        ?.value ??
      "—",
  },
  {
    key: "finish",
    label: "Finish",
    get: (id) => getCatalogueProduct(id)?.specs.find((s) => /finish/i.test(s.label))?.value ?? "—",
  },
  { key: "brand", label: "Brand", get: (id) => getCatalogueProduct(id)?.brand ?? "—" },
  { key: "color", label: "Color", get: (id) => getCatalogueProduct(id)?.color ?? "—" },
  {
    key: "rating",
    label: "Rating",
    get: (id) => {
      const r = getCatalogueProduct(id)?.rating;
      return r != null ? String(r) : "—";
    },
  },
  { key: "warranty", label: "Warranty", get: (id) => getCatalogueProduct(id)?.warranty ?? "—" },
  {
    key: "availability",
    label: "Availability",
    get: (id) => getCatalogueProduct(id)?.availability ?? "—",
  },
  { key: "lead", label: "Lead time", get: (id) => getCatalogueProduct(id)?.leadTime ?? "—" },
  {
    key: "downloads",
    label: "Downloads",
    get: (id) =>
      (getCatalogueProduct(id)?.downloads ?? []).map((d) => d.label).join(", ") || "Catalogue PDF",
  },
];

function valuesDiffer(ids: readonly string[], get: (id: string) => string): boolean {
  if (ids.length < 2) return false;
  const first = get(ids[0]!);
  return ids.some((id) => get(id) !== first);
}

export function ComparePage() {
  const [ids, setIds] = useState(getCompareIds);
  const products = useMemo(
    () => ids.map((id) => getCatalogueProduct(id)).filter(Boolean),
    [ids],
  );

  return (
    <>
      <Seo title="Compare products" description="Compare 2–4 Rao Liaqat Furniture products." path="/compare" />
      <header className="site-page-hero">
        <Breadcrumbs items={[{ label: "Compare" }]} />
        <h1>Compare</h1>
        <p>Compare up to four products across dimensions, materials, pricing, and lead time.</p>
        <div className="site-hero__actions">
          <button
            type="button"
            className="site-btn site-btn--ghost"
            onClick={() => {
              clearCompare();
              setIds([]);
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            onClick={() => {
              const body = products
                .map((p) => p && `${p.name}: ${p.priceFrom}`)
                .filter(Boolean)
                .join("\n");
              void navigator.clipboard?.writeText(body);
            }}
          >
            Share / copy
          </button>
          <button
            type="button"
            className="site-btn site-btn--primary"
            onClick={() => {
              window.print();
            }}
          >
            Export / print
          </button>
        </div>
      </header>
      {products.length < 2 ? (
        products.length === 0 ? (
          <div className="site-section cx-empty" role="status">
            <h2>Add 2–4 products to compare</h2>
            <p>Use Compare on product cards or detail pages.</p>
            <Link to="/products" className="site-btn site-btn--primary">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="site-section cx-skeleton-compare" aria-live="polite">
            <div className="cx-skeleton-card__line" />
            <p className="cx-muted">Add one more product to open the comparison table.</p>
            <Link to="/products" className="site-btn site-btn--ghost">
              Browse products
            </Link>
          </div>
        )
      ) : (
        <div className="site-section cx-compare-wrap">
          <table className="cx-compare">
            <thead>
              <tr>
                <th scope="col">Attribute</th>
                {products.map((p) =>
                  p ? (
                    <th key={p.id} scope="col">
                      <Link to={`/products/${p.id}`}>{p.name}</Link>
                      <button
                        type="button"
                        className="site-btn site-btn--ghost"
                        onClick={() => setIds(toggleCompare(p.id))}
                      >
                        Remove
                      </button>
                    </th>
                  ) : null,
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Image</th>
                {products.map((p) =>
                  p ? (
                    <td key={p.id}>
                      <img src={p.image} alt={p.name} loading="lazy" />
                    </td>
                  ) : null,
                )}
              </tr>
              {ROWS.map((row) => {
                const differ = valuesDiffer(ids, row.get);
                return (
                  <tr key={row.key} className={differ ? "cx-compare-diff" : undefined}>
                    <th scope="row">{row.label}</th>
                    {ids.map((id) => (
                      <td key={`${row.key}-${id}`} className={differ ? "is-diff" : undefined}>
                        {row.get(id)}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <th scope="row">Features</th>
                {products.map((p) =>
                  p ? (
                    <td key={p.id}>
                      <ul>
                        {p.specs.map((s) => (
                          <li key={s.label}>
                            {s.label}: {s.value}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ) : null,
                )}
              </tr>
            </tbody>
          </table>
          <p className="cx-muted">
            Related browsing:{" "}
            {CATALOGUE.filter((c) => !ids.includes(c.id))
              .slice(0, 3)
              .map((c) => (
                <Link key={c.id} to={`/products/${c.id}`} style={{ marginRight: "0.75rem" }}>
                  {c.name}
                </Link>
              ))}
          </p>
          <button
            type="button"
            className="site-btn site-btn--primary"
            onClick={() => {
              enqueueLead({
                intent: "Compare shortlist quotation",
                name: "Compare visitor",
                email: "visitor@example.com",
                message: `Please quote: ${ids.join(", ")}`,
                source: "compare",
                meta: { productIds: ids, totalHint: products.reduce((s, p) => s + (p?.pricePkr ?? 0), 0) },
              });
              window.alert(`Inquiry queued for ${formatPkr(products.reduce((s, p) => s + (p?.pricePkr ?? 0), 0))}`);
            }}
          >
            Move shortlist to quotation inquiry
          </button>
        </div>
      )}
    </>
  );
}
