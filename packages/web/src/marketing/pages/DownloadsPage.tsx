import { Link } from "react-router-dom";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { CATALOGUE } from "../data/catalogue";
import { IMG } from "../data/content";

export function DownloadsPage() {
  const docs = [
    { title: "Master catalogue PDF", url: "/catalogue.pdf", kind: "Catalogue" },
    { title: "Atelier collection brochure", url: "/catalogue.pdf", kind: "Brochure" },
    { title: "Studio workplace brochure", url: "/catalogue.pdf", kind: "Brochure" },
    { title: "Finish & material board", url: "/catalogue.pdf", kind: "Specification" },
  ];

  return (
    <>
      <Seo
        title="Downloads & catalogues"
        description="Download AFH catalogues, brochures, and specification sheets."
        path="/downloads"
        image={IMG.catalog1}
      />
      <header className="site-page-hero">
        <Breadcrumbs items={[{ label: "Downloads" }]} />
        <h1>Downloads & catalogues</h1>
        <p>PDFs and specification sheets. Media is DAM-ready via asset references on each product.</p>
      </header>
      <div className="site-section">
        <ul className="cx-downloads cx-downloads--page">
          {docs.map((d) => (
            <li key={d.title}>
              <a href={d.url} download>
                {d.title}
              </a>
              <span>{d.kind}</span>
            </li>
          ))}
        </ul>
        <h2>Product specification sheets</h2>
        <ul className="cx-downloads cx-downloads--page">
          {CATALOGUE.map((p) => (
            <li key={p.id}>
              <Link to={`/products/${p.id}`}>{p.name}</Link>
              <span>{(p.downloads ?? []).map((d) => d.label).join(", ") || "See product"}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function CookiesPage() {
  return (
    <>
      <Seo title="Cookie preferences" description="Manage AFH cookie preferences." path="/cookies" />
      <header className="site-page-hero">
        <Breadcrumbs items={[{ label: "Cookies" }]} />
        <h1>Cookie preferences</h1>
        <p>Essential cookies keep the session and preferences working. Analytics are optional.</p>
      </header>
      <div className="site-section site-form">
        <label>
          <input
            type="checkbox"
            defaultChecked
            disabled
          />{" "}
          Essential (required)
        </label>
        <label>
          <input
            type="checkbox"
            defaultChecked={localStorage.getItem("afh.site.analytics") === "1"}
            onChange={(e) => {
              localStorage.setItem("afh.site.analytics", e.target.checked ? "1" : "0");
            }}
          />{" "}
          Analytics (optional)
        </label>
        <p>
          See also <Link to="/privacy">Privacy</Link> and <Link to="/terms">Terms</Link>.
        </p>
      </div>
    </>
  );
}
