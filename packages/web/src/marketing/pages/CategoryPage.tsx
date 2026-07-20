import { Link, useParams, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { CATALOGUE, productsForTaxonomySlug, type CatalogueProduct } from "../data/catalogue";
import { COLLECTIONS, IMG } from "../data/content";
import { findTaxonomyBySlug, taxonomyPath, FURNITURE_TAXONOMY } from "../data/taxonomy";
import { getRecentlyViewed, toggleCompare, toggleWishlist, getCompareIds, getWishlistIds } from "../cx/stores";
import { useFocusTrap } from "../../a11y/useFocusTrap";
import { useReveal } from "../useReveal";

type SortKey = "featured" | "price-asc" | "price-desc" | "name" | "newest";

function sortProducts(items: CatalogueProduct[], sort: SortKey): CatalogueProduct[] {
  const list = [...items];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.pricePkr - b.pricePkr);
    case "price-desc":
      return list.sort((a, b) => b.pricePkr - a.pricePkr);
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "newest":
      return list.reverse();
    default:
      return list.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  }
}

function uniqueSorted(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function FurnitureHubPage() {
  useReveal();
  return (
    <>
      <Seo
        title="All Furniture"
        description="Browse Rao Liaqat Furniture by room and product family."
        path="/furniture"
        image={IMG.lounge}
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Furniture", path: "/furniture" },
        ]}
      />
      <header className="site-page-hero">
        <Breadcrumbs items={[{ label: "Furniture" }]} />
        <p className="site-eyebrow">Catalogue</p>
        <h1>All Furniture</h1>
        <p>Explore rooms and product families — every destination is a live category journey.</p>
      </header>
      <div className="site-section site-reveal">
        <div className="site-category-grid cx-stagger">
        {FURNITURE_TAXONOMY.map((n) => (
          <Link key={n.id} to={`/furniture/${n.slug}`} className="site-category">
            <img src={n.image ?? IMG.lounge} alt={`${n.name} furniture`} loading="lazy" width={640} height={480} />
            <span>{n.name}</span>
          </Link>
        ))}
        </div>
      </div>
    </>
  );
}

export function CategoryPage() {
  const { categorySlug = "", subSlug } = useParams();
  const slug = subSlug ?? categorySlug;
  const found = findTaxonomyBySlug(slug);
  const [params, setParams] = useSearchParams();
  const sort = (params.get("sort") as SortKey) || "featured";
  const q = params.get("q")?.trim().toLowerCase() ?? "";
  const collection = params.get("collection")?.toLowerCase() ?? "";
  const material = params.get("material")?.toLowerCase() ?? "";
  const brand = params.get("brand")?.toLowerCase() ?? "";
  const color = params.get("color")?.toLowerCase() ?? "";
  const availability = params.get("availability")?.toLowerCase() ?? "";
  const minPrice = Number(params.get("minPrice") ?? "") || 0;
  const maxPrice = Number(params.get("maxPrice") ?? "") || 0;
  const minRating = Number(params.get("rating") ?? "") || 0;
  const dimensions = params.get("dimensions")?.toLowerCase() ?? "";
  const view = params.get("view") === "list" ? "list" : "grid";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const pageSize = 6;
  const [wish, setWish] = useState(getWishlistIds);
  const [cmp, setCmp] = useState(getCompareIds);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const path = taxonomyPath(slug);

  const baseList = useMemo(() => {
    if (!found) return [] as CatalogueProduct[];
    let list = [...productsForTaxonomySlug(slug)];
    if (!list.length && found.node.productTags?.length) {
      list = CATALOGUE.filter((p) =>
        found.node.productTags!.some((t) => p.tags.includes(t) || p.category === t),
      );
    }
    return list;
  }, [found, slug]);

  const facets = useMemo(() => {
    return {
      collections: uniqueSorted(baseList.map((p) => p.collection)),
      materials: uniqueSorted(baseList.map((p) => p.material)),
      brands: uniqueSorted(baseList.map((p) => p.brand)),
      colors: uniqueSorted(baseList.map((p) => p.color)),
      availability: uniqueSorted(baseList.map((p) => p.availability)),
      dimensions: uniqueSorted(baseList.map((p) => p.dimensions)),
      priceMax: Math.max(...baseList.map((p) => p.pricePkr), 1),
    };
  }, [baseList]);

  const products = useMemo(() => {
    let list = [...baseList];
    if (collection) list = list.filter((p) => p.collection.toLowerCase() === collection);
    if (material) list = list.filter((p) => (p.material ?? "").toLowerCase() === material);
    if (brand) list = list.filter((p) => (p.brand ?? "").toLowerCase() === brand);
    if (color) list = list.filter((p) => (p.color ?? "").toLowerCase() === color);
    if (availability) list = list.filter((p) => (p.availability ?? "").toLowerCase() === availability);
    if (dimensions) list = list.filter((p) => (p.dimensions ?? "").toLowerCase() === dimensions);
    if (minPrice > 0) list = list.filter((p) => p.pricePkr >= minPrice);
    if (maxPrice > 0) list = list.filter((p) => p.pricePkr <= maxPrice);
    if (minRating > 0) list = list.filter((p) => (p.rating ?? 0) >= minRating);
    if (q) {
      list = list.filter((p) =>
        `${p.name} ${p.summary} ${p.collection} ${p.brand ?? ""} ${p.material ?? ""}`
          .toLowerCase()
          .includes(q),
      );
    }
    return sortProducts(list, sort);
  }, [
    baseList,
    collection,
    material,
    brand,
    color,
    availability,
    dimensions,
    minPrice,
    maxPrice,
    minRating,
    q,
    sort,
  ]);

  const total = products.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageItems = products.slice((safePage - 1) * pageSize, safePage * pageSize);
  const recent = getRecentlyViewed()
    .map((id) => CATALOGUE.find((p) => p.id === id))
    .filter(Boolean)
    .slice(0, 4) as CatalogueProduct[];

  // Catalogue is sync — reveal after products mount (no artificial boot delay).
  useReveal([slug, safePage, sort, q, view, pageItems.length, total]);

  // Drop stale out-of-range page query when filters shrink the result set.
  useEffect(() => {
    if (page === safePage) return;
    const next = new URLSearchParams(params);
    if (safePage <= 1) next.delete("page");
    else next.set("page", String(safePage));
    setParams(next, { replace: true });
    // Intentionally omit `params` — only react when page bounds change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, safePage, setParams]);

  function patchParams(mutator: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    mutator(next);
    next.delete("page");
    setParams(next);
  }

  function clearFilters() {
    const next = new URLSearchParams();
    if (sort !== "featured") next.set("sort", sort);
    if (view === "list") next.set("view", "list");
    setParams(next);
  }

  if (!found) {
    return (
      <>
        <Seo title="Category not found" description="Unknown furniture category." path="/furniture" />
        <header className="site-page-hero">
          <h1>Category not found</h1>
          <p>That furniture path does not exist.</p>
          <Link to="/furniture" className="site-btn site-btn--primary">
            Back to furniture
          </Link>
        </header>
      </>
    );
  }

  const { node, parent } = found;
  const crumbs: { label: string; to?: string }[] = [
    { label: "Furniture", to: "/furniture" },
    ...path.map((n, i) => {
      if (i < path.length - 1) return { label: n.name, to: `/furniture/${n.slug}` };
      return { label: n.name };
    }),
  ];

  const related = (parent?.children ?? FURNITURE_TAXONOMY)
    .filter((c) => c.slug !== node.slug)
    .slice(0, 6);

  const filterPanel = (
    <aside className="cx-filters" aria-label="Product filters">
      <div className="cx-filters__head">
        <h2>Filters</h2>
        <button type="button" className="site-btn site-btn--ghost" onClick={clearFilters}>
          Clear
        </button>
      </div>

      <label className="cx-filters__field">
        Search
        <input
          value={q}
          onChange={(e) =>
            patchParams((next) => {
              if (e.target.value) next.set("q", e.target.value);
              else next.delete("q");
            })
          }
          placeholder="Search in category"
        />
      </label>

      <fieldset className="cx-filters__group">
        <legend>Price range (PKR)</legend>
        <div className="cx-filters__row">
          <input
            type="number"
            min={0}
            step={10000}
            placeholder="Min"
            value={minPrice || ""}
            onChange={(e) =>
              patchParams((next) => {
                if (e.target.value) next.set("minPrice", e.target.value);
                else next.delete("minPrice");
              })
            }
          />
          <input
            type="number"
            min={0}
            step={10000}
            placeholder={`Max · ${facets.priceMax.toLocaleString("en-PK")}`}
            value={maxPrice || ""}
            onChange={(e) =>
              patchParams((next) => {
                if (e.target.value) next.set("maxPrice", e.target.value);
                else next.delete("maxPrice");
              })
            }
          />
        </div>
      </fieldset>

      <FilterSelect
        label="Material"
        value={material}
        options={facets.materials}
        onChange={(v) =>
          patchParams((next) => {
            if (v) next.set("material", v);
            else next.delete("material");
          })
        }
      />
      <FilterSelect
        label="Brand"
        value={brand}
        options={facets.brands}
        onChange={(v) =>
          patchParams((next) => {
            if (v) next.set("brand", v);
            else next.delete("brand");
          })
        }
      />
      <FilterSelect
        label="Collection"
        value={collection}
        options={facets.collections}
        onChange={(v) =>
          patchParams((next) => {
            if (v) next.set("collection", v);
            else next.delete("collection");
          })
        }
      />
      <FilterSelect
        label="Color"
        value={color}
        options={facets.colors}
        onChange={(v) =>
          patchParams((next) => {
            if (v) next.set("color", v);
            else next.delete("color");
          })
        }
      />
      <FilterSelect
        label="Availability"
        value={availability}
        options={facets.availability}
        onChange={(v) =>
          patchParams((next) => {
            if (v) next.set("availability", v);
            else next.delete("availability");
          })
        }
      />
      <label className="cx-filters__field">
        Rating
        <select
          value={minRating || ""}
          onChange={(e) =>
            patchParams((next) => {
              if (e.target.value) next.set("rating", e.target.value);
              else next.delete("rating");
            })
          }
        >
          <option value="">Any</option>
          <option value="4.5">4.5+</option>
          <option value="4.7">4.7+</option>
          <option value="4.8">4.8+</option>
        </select>
      </label>
      <FilterSelect
        label="Dimensions"
        value={dimensions}
        options={facets.dimensions}
        onChange={(v) =>
          patchParams((next) => {
            if (v) next.set("dimensions", v);
            else next.delete("dimensions");
          })
        }
      />
    </aside>
  );

  return (
    <>
      <Seo
        title={node.name}
        description={node.blurb}
        path={parent ? `/furniture/${parent.slug}/${node.slug}` : `/furniture/${node.slug}`}
        image={node.image ?? IMG.lounge}
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Furniture", path: "/furniture" },
          ...(parent
            ? [
                { name: parent.name, path: `/furniture/${parent.slug}` },
                { name: node.name, path: `/furniture/${parent.slug}/${node.slug}` },
              ]
            : [{ name: node.name, path: `/furniture/${node.slug}` }]),
        ]}
      />
      <header className="site-page-hero cx-category-hero">
        <Breadcrumbs items={crumbs} />
        <p className="site-eyebrow">Category</p>
        <h1>{node.name}</h1>
        <p>{node.blurb}</p>
        <p className="cx-product-count" aria-live="polite">
          {total} product{total === 1 ? "" : "s"}
        </p>
        {node.children?.length ? (
          <div className="site-filter-row" aria-label="Subcategories">
            {node.children.map((c) => (
              <Link key={c.id} to={`/furniture/${node.slug}/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <section className="site-section cx-cms-block" aria-label="Featured collections">
        <h2>Featured collections</h2>
        <div className="site-filter-row">
          {COLLECTIONS.map((c) => (
            <Link
              key={c.id}
              to={`?collection=${encodeURIComponent(c.name.toLowerCase())}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <div className="site-section cx-category-layout">
        <div className="cx-filters-desktop">{filterPanel}</div>

        <div className="cx-category-main">
          <div className="cx-toolbar">
            <button
              type="button"
              className="site-btn site-btn--ghost cx-filters-mobile-trigger"
              onClick={() => setFiltersOpen(true)}
            >
              Filters
            </button>
            <label>
              Sort
              <select
                value={sort}
                onChange={(e) =>
                  patchParams((next) => {
                    next.set("sort", e.target.value);
                  })
                }
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
                <option value="name">Alphabetical</option>
              </select>
            </label>
            <div className="cx-view-toggle" role="group" aria-label="Layout">
              <button
                type="button"
                className={view === "grid" ? "is-active" : ""}
                onClick={() =>
                  patchParams((next) => {
                    next.delete("view");
                  })
                }
              >
                Grid
              </button>
              <button
                type="button"
                className={view === "list" ? "is-active" : ""}
                onClick={() =>
                  patchParams((next) => {
                    next.set("view", "list");
                  })
                }
              >
                List
              </button>
            </div>
          </div>

          {pageItems.length === 0 ? (
            <div className="cx-empty" role="status">
              <h2>No products match</h2>
              <p>Try clearing filters or browse related categories.</p>
              <button type="button" className="site-btn site-btn--ghost" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className={`site-product-grid cx-stagger site-product-grid--catalogue${view === "list" ? " is-list" : ""}`}>
              {pageItems.map((p) => (
                <article key={p.id} className="site-product">
                  <Link to={`/products/${p.id}`}>
                    <img src={p.image} alt={p.name} loading="lazy" decoding="async" />
                    <div className="site-product__body">
                      <p className="site-product__meta">
                        {p.category} · {p.collection}
                      </p>
                      <h2 className="site-product__title">{p.name}</h2>
                      <p className="site-product__summary">{p.summary}</p>
                      <p className="site-product__price">{p.priceFrom}</p>
                      {p.rating ? (
                        <p className="cx-meta-line">★ {p.rating.toFixed(1)}</p>
                      ) : null}
                    </div>
                  </Link>
                  <div className="cx-card-actions">
                    <button
                      type="button"
                      className="site-btn site-btn--ghost"
                      aria-pressed={wish.includes(p.id)}
                      onClick={() => setWish(toggleWishlist(p.id))}
                    >
                      {wish.includes(p.id) ? "Wishlisted" : "Wishlist"}
                    </button>
                    <button
                      type="button"
                      className="site-btn site-btn--ghost"
                      aria-pressed={cmp.includes(p.id)}
                      disabled={!cmp.includes(p.id) && cmp.length >= 4}
                      onClick={() => setCmp(toggleCompare(p.id))}
                    >
                      Compare
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {pageCount > 1 ? (
            <nav className="cx-pagination" aria-label="Pagination">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === safePage ? "is-active" : ""}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set("page", String(n));
                    setParams(next);
                  }}
                >
                  {n}
                </button>
              ))}
            </nav>
          ) : null}
        </div>
      </div>

      {filtersOpen ? (
        <FiltersDrawer
          total={total}
          onClose={() => setFiltersOpen(false)}
          filterPanel={filterPanel}
        />
      ) : null}

      {related.length ? (
        <section className="site-section" aria-labelledby="rel-cat">
          <h2 id="rel-cat">Related categories</h2>
          <div className="site-filter-row">
            {related.map((c) => (
              <Link
                key={c.id}
                to={parent ? `/furniture/${parent.slug}/${c.slug}` : `/furniture/${c.slug}`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {recent.length ? (
        <section className="site-section" aria-labelledby="recent-title">
          <h2 id="recent-title">Recently viewed</h2>
          <div className="site-product-grid cx-stagger">
            {recent.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} className="site-product">
                <img src={p.image} alt={p.name} loading="lazy" />
                <div>
                  <h3>{p.name}</h3>
                  <p className="site-product__price">{p.priceFrom}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="cx-filters__field">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o.toLowerCase()}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function FiltersDrawer({
  total,
  onClose,
  filterPanel,
}: {
  total: number;
  onClose: () => void;
  filterPanel: React.ReactNode;
}) {
  const close = useCallback(() => onClose(), [onClose]);
  const trapRef = useFocusTrap(true, close);
  return (
    <div
      ref={trapRef}
      className="cx-filters-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cx-filters-drawer__panel cx-motion-fade">
        {filterPanel}
        <button type="button" className="site-btn site-btn--primary" onClick={onClose}>
          Show {total} results
        </button>
      </div>
    </div>
  );
}

