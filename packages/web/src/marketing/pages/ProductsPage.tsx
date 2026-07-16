import { Link, useParams, useSearchParams } from "react-router-dom";
import { Seo } from "../Seo";
import { PRODUCTS, COLLECTIONS, CATEGORIES, IMG } from "../data/content";
import { InquiryForm } from "../InquiryForm";

export function ProductsPage() {
  const [params] = useSearchParams();
  const category = params.get("category")?.toLowerCase();
  const collection = params.get("collection")?.toLowerCase();

  const filtered = PRODUCTS.filter((p) => {
    if (category && p.category.toLowerCase() !== category) return false;
    if (collection && p.collection.toLowerCase() !== collection) return false;
    return true;
  });

  return (
    <>
      <Seo
        title="Product catalogue"
        description="Browse AFH furniture collections, categories, and featured pieces."
        path="/products"
        image={IMG.lounge}
      />
      <header className="site-page-hero">
        <p className="site-eyebrow">Catalogue</p>
        <h1>Products</h1>
        <p>Filter by category or collection. Every piece is manufactured in our factory.</p>
        <div className="site-filter-row" role="navigation" aria-label="Catalogue filters">
          <Link to="/products">All</Link>
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/products?category=${c.id}`}>
              {c.name}
            </Link>
          ))}
          {COLLECTIONS.map((c) => (
            <Link key={c.id} to={`/products?collection=${c.id}`}>
              {c.name}
            </Link>
          ))}
        </div>
      </header>
      <div className="site-section site-product-grid">
        {filtered.map((p) => (
          <Link key={p.id} to={`/products/${p.id}`} className="site-product">
            <img src={p.image} alt="" loading="lazy" />
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
    </>
  );
}

export function ProductDetailPage() {
  const { productId } = useParams();
  const product = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0]!;
  const related = PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category,
  ).slice(0, 3);

  return (
    <>
      <Seo
        title={product.name}
        description={product.summary}
        path={`/products/${product.id}`}
        image={product.image}
        type="product"
      />
      <article className="site-pdp">
        <div className="site-pdp__gallery">
          <img src={product.image} alt={product.name} />
          <div className="site-pdp__thumbs" aria-hidden="true">
            <img src={product.image} alt="" />
            <img src={IMG.wood} alt="" />
            <img src={IMG.finish} alt="" />
          </div>
        </div>
        <div className="site-pdp__info">
          <p className="site-eyebrow">
            {product.collection} · {product.category}
          </p>
          <h1>{product.name}</h1>
          <p>{product.summary}</p>
          <p className="site-product__price">{product.priceFrom}</p>
          <h2>Specifications</h2>
          <dl className="site-specs">
            {product.specs.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
          <div className="site-hero__actions">
            <a className="site-btn site-btn--ghost" href="/catalogue.pdf" download>
              Downloads
            </a>
            <Link to="/quote" className="site-btn site-btn--primary">
              Inquiry / quote
            </Link>
          </div>
          <InquiryForm intent={`Product inquiry: ${product.name}`} />
        </div>
      </article>
      <section className="site-section" aria-labelledby="related-title">
        <h2 id="related-title">Related products</h2>
        <div className="site-product-grid">
          {related.map((p) => (
            <Link key={p.id} to={`/products/${p.id}`} className="site-product">
              <img src={p.image} alt="" loading="lazy" />
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
