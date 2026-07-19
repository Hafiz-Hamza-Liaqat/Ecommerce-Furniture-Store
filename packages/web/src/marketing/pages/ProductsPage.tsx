import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ProductGallery } from "../components/ProductGallery";
import { ProductSpinViewer } from "../components/ProductSpinViewer";
import {
  CATALOGUE,
  formatPkr,
  getCatalogueProduct,
  resolveVariantPrice,
  type CatalogueProduct,
} from "../data/catalogue";
import { COLLECTIONS, IMG } from "../data/content";
import { InquiryForm } from "../InquiryForm";
import {
  getCompareIds,
  getRecentlyViewed,
  getWishlistIds,
  pushRecentlyViewed,
  toggleCompare,
  toggleWishlist,
} from "../cx/stores";

type SortKey = "featured" | "price-asc" | "price-desc" | "name";

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category")?.toLowerCase();
  const collection = params.get("collection")?.toLowerCase();
  const sort = (params.get("sort") as SortKey) || "featured";
  const q = params.get("q")?.trim().toLowerCase() ?? "";

  const filtered = useMemo(() => {
    let list = [...CATALOGUE];
    if (category) {
      list = list.filter(
        (p) =>
          p.category.toLowerCase() === category ||
          p.taxonomySlugs.includes(category) ||
          p.tags.some((t) => t.toLowerCase() === category),
      );
    }
    if (collection) list = list.filter((p) => p.collection.toLowerCase() === collection);
    if (q) {
      list = list.filter((p) => `${p.name} ${p.summary} ${p.tags.join(" ")}`.toLowerCase().includes(q));
    }
    if (sort === "price-asc") list.sort((a, b) => a.pricePkr - b.pricePkr);
    else if (sort === "price-desc") list.sort((a, b) => b.pricePkr - a.pricePkr);
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return list;
  }, [category, collection, q, sort]);

  return (
    <>
      <Seo
        title="Product catalogue"
        description="Browse AFH furniture collections, categories, and featured pieces."
        path="/products"
        image={IMG.lounge}
      />
      <header className="site-page-hero">
        <Breadcrumbs items={[{ label: "Products" }]} />
        <p className="site-eyebrow">Catalogue</p>
        <h1>Products</h1>
        <p>
          Filter, sort, and open any piece. Prefer room browsing?{" "}
          <Link to="/furniture">All furniture</Link>.
        </p>
        <div className="site-filter-row" role="navigation" aria-label="Catalogue filters">
          <Link to="/products">All</Link>
          <Link to="/furniture">Furniture hub</Link>
          {COLLECTIONS.map((c) => (
            <Link key={c.id} to={`/products?collection=${c.id}`}>
              {c.name}
            </Link>
          ))}
        </div>
        <div className="cx-toolbar">
          <label>
            Search
            <input
              value={q}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                if (e.target.value) next.set("q", e.target.value);
                else next.delete("q");
                setParams(next);
              }}
            />
          </label>
          <label>
            Sort
            <select
              value={sort}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                next.set("sort", e.target.value);
                setParams(next);
              }}
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
              <option value="name">A–Z</option>
            </select>
          </label>
        </div>
        <p className="cx-product-count">{filtered.length} products</p>
      </header>
      {filtered.length === 0 ? (
        <div className="site-section cx-empty" role="status">
          <h2>No matches</h2>
          <p>Try another filter or open the furniture hub.</p>
        </div>
      ) : (
        <div className="site-section site-product-grid">
          {filtered.map((p) => (
            <Link key={p.id} to={`/products/${p.id}`} className="site-product cx-hover-lift">
              <img src={p.image} alt={p.name} loading="lazy" />
              <div>
                <p className="site-product__meta">
                  {p.category} · {p.collection}
                </p>
                <h2>{p.name}</h2>
                <p>{p.summary}</p>
                <p className="site-product__price">{p.priceFrom}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function relatedFor(product: CatalogueProduct): CatalogueProduct[] {
  const similar = CATALOGUE.filter(
    (p) => p.id !== product.id && (p.category === product.category || p.collection === product.collection),
  );
  const complementary = (product.complementaryIds ?? [])
    .map((id) => getCatalogueProduct(id))
    .filter(Boolean) as CatalogueProduct[];
  const paired = (product.pairedIds ?? [])
    .map((id) => getCatalogueProduct(id))
    .filter(Boolean) as CatalogueProduct[];
  const recent = getRecentlyViewed()
    .map((id) => getCatalogueProduct(id))
    .filter((p): p is CatalogueProduct => !!p && p.id !== product.id);
  const map = new Map<string, CatalogueProduct>();
  for (const p of [...complementary, ...paired, ...similar, ...recent]) map.set(p.id, p);
  return [...map.values()].slice(0, 6);
}

export function ProductDetailPage() {
  const { productId } = useParams();
  const product = productId ? getCatalogueProduct(productId) : undefined;
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [tab, setTab] = useState<"gallery" | "spin">("gallery");
  const [wish, setWish] = useState(getWishlistIds);
  const [cmp, setCmp] = useState(getCompareIds);

  useEffect(() => {
    if (product) pushRecentlyViewed(product.id);
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const initial = new Set<string>();
    const groups = new Set(product.variants.map((v) => v.group));
    for (const g of groups) {
      const first = product.variants.find((v) => v.group === g);
      if (first) initial.add(first.id);
    }
    setSelected(initial);
  }, [product]);

  if (!product) {
    return (
      <>
        <Seo title="Product not found" description="Unknown product." path="/products" />
        <header className="site-page-hero">
          <Breadcrumbs items={[{ label: "Products", to: "/products" }, { label: "Not found" }]} />
          <h1>Product not found</h1>
          <p>This product does not exist in the catalogue.</p>
          <Link to="/products" className="site-btn site-btn--primary">
            Back to products
          </Link>
        </header>
      </>
    );
  }

  const activeMediaIds = product.variants
    .filter((v) => selected.has(v.id) && v.mediaIds?.length)
    .flatMap((v) => v.mediaIds ?? []);
  const media =
    activeMediaIds.length > 0
      ? product.media.filter((m) => activeMediaIds.includes(m.id) || m.type === "video")
      : product.media;
  const galleryItems = media
    .filter((m) => m.type === "image" || m.type === "video")
    .map((m) => ({ id: m.id, type: m.type as "image" | "video", url: m.url, alt: m.alt }));

  const specMap = new Map(product.specs.map((s) => [s.label, s.value]));
  for (const v of product.variants) {
    if (!selected.has(v.id) || !v.specOverrides) continue;
    for (const s of v.specOverrides) specMap.set(s.label, s.value);
  }
  const specs = [...specMap.entries()].map(([label, value]) => ({ label, value }));
  const price = resolveVariantPrice(product, selected);
  const related = relatedFor(product);
  const groups = [...new Set(product.variants.map((v) => v.group))];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.summary,
    image: product.image,
    brand: { "@type": "Brand", name: "Artisan Furnish Hub" },
    offers: {
      "@type": "Offer",
      priceCurrency: "PKR",
      price: price,
      availability: "https://schema.org/PreOrder",
    },
  };

  return (
    <>
      <Seo
        title={product.name}
        description={product.summary}
        path={`/products/${product.id}`}
        image={product.image}
        type="product"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="site-pdp">
        <div className="site-pdp__gallery">
          <Breadcrumbs
            items={[
              { label: "Furniture", to: "/furniture" },
              { label: "Products", to: "/products" },
              { label: product.name },
            ]}
          />
          <div className="cx-pdp-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "gallery"}
              className={tab === "gallery" ? "is-active" : ""}
              onClick={() => setTab("gallery")}
            >
              Gallery
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "spin"}
              className={tab === "spin" ? "is-active" : ""}
              onClick={() => setTab("spin")}
              disabled={!product.spinFrames?.length}
            >
              360° Viewer
            </button>
          </div>
          {tab === "gallery" ? (
            <ProductGallery items={galleryItems} productName={product.name} />
          ) : (
            <ProductSpinViewer frames={product.spinFrames ?? []} productName={product.name} />
          )}
        </div>
        <div className="site-pdp__info">
          <p className="site-eyebrow">
            {product.collection} · {product.category}
          </p>
          <h1>{product.name}</h1>
          <p>{product.summary}</p>
          <p className="site-product__price">{formatPkr(price)}</p>
          <p className="cx-meta-line">
            {product.availability} · Lead time {product.leadTime} · {product.warranty}
          </p>

          <div className="cx-variants">
            {groups.map((group) => (
              <fieldset key={group} className="cx-variant-group">
                <legend>{group}</legend>
                <div className="cx-variant-options">
                  {product.variants
                    .filter((v) => v.group === group)
                    .map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={selected.has(v.id) ? "is-active" : ""}
                        aria-pressed={selected.has(v.id)}
                        onClick={() => {
                          const next = new Set(selected);
                          for (const other of product.variants.filter((x) => x.group === group)) {
                            next.delete(other.id);
                          }
                          next.add(v.id);
                          setSelected(next);
                        }}
                      >
                        {v.swatch ? (
                          <span className="cx-swatch" style={{ background: v.swatch }} aria-hidden="true" />
                        ) : null}
                        {v.label}
                      </button>
                    ))}
                </div>
              </fieldset>
            ))}
          </div>

          <h2>Specifications</h2>
          <dl className="site-specs">
            {specs.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>

          <h2>Downloads</h2>
          <ul className="cx-downloads">
            {(product.downloads ?? []).map((d) => (
              <li key={d.label}>
                <a href={d.url} download>
                  {d.label} ({d.kind})
                </a>
              </li>
            ))}
            <li>
              <Link to="/downloads">All catalogues & brochures</Link>
            </li>
          </ul>

          <div className="site-hero__actions cx-pdp-actions">
            <button
              type="button"
              className="site-btn site-btn--ghost"
              aria-pressed={wish.includes(product.id)}
              onClick={() => setWish(toggleWishlist(product.id))}
            >
              {wish.includes(product.id) ? "Wishlisted" : "Add to wishlist"}
            </button>
            <button
              type="button"
              className="site-btn site-btn--ghost"
              aria-pressed={cmp.includes(product.id)}
              disabled={!cmp.includes(product.id) && cmp.length >= 4}
              onClick={() => setCmp(toggleCompare(product.id))}
            >
              Compare
            </button>
            <Link to="/quote" className="site-btn site-btn--primary">
              Request quotation
            </Link>
            <Link to="/planner" className="site-btn site-btn--ghost">
              Budget planner
            </Link>
          </div>
          <InquiryForm
            intent={`Product inquiry: ${product.name}`}
            meta={{ productId: product.id, variants: [...selected] }}
          />
        </div>
      </article>

      <section className="site-section" aria-labelledby="related-title">
        <h2 id="related-title">Related products</h2>
        <p className="cx-muted">Similar, complementary, frequently paired, and recently viewed.</p>
        <div className="site-product-grid">
          {related.map((p) => (
            <Link key={p.id} to={`/products/${p.id}`} className="site-product cx-hover-lift">
              <img src={p.image} alt={p.name} loading="lazy" />
              <div>
                <h3>{p.name}</h3>
                <p className="site-product__price">{p.priceFrom}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
