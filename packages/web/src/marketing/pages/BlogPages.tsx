import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BRAND } from "../../brand";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import {
  adjacentArticles,
  BLOG_ARTICLES,
  BLOG_CATEGORIES,
  getBlogArticle,
  getBlogCategory,
  relatedArticles,
  type BlogArticle,
} from "../data/blog";
import { useReveal } from "../useReveal";
import { InquiryForm } from "../InquiryForm";

const PAGE_SIZE = 6;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ArticleCard({ article }: { readonly article: BlogArticle }) {
  const cat = getBlogCategory(article.categoryId);
  return (
    <article className="afh-blog-card">
      <Link to={`/blog/${article.slug}`} className="afh-blog-card__media">
        <img src={article.heroImage} alt="" loading="lazy" width={800} height={500} />
      </Link>
      <div className="afh-blog-card__body">
        {cat ? (
          <Link to={`/blog?category=${cat.slug}`} className="afh-blog-card__cat">
            {cat.name}
          </Link>
        ) : null}
        <h2>
          <Link to={`/blog/${article.slug}`}>{article.title}</Link>
        </h2>
        <p>{article.excerpt}</p>
        <p className="afh-blog-card__meta">
          {article.author} · {formatDate(article.publishedAt)} · {article.readingMinutes} min
        </p>
      </div>
    </article>
  );
}

export function BlogIndexPage() {
  const [params, setParams] = useSearchParams();
  const categorySlug = params.get("category")?.toLowerCase() ?? "";
  const q = params.get("q")?.trim().toLowerCase() ?? "";
  const tag = params.get("tag")?.toLowerCase() ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  useReveal([categorySlug, q, tag, page]);

  const category = categorySlug ? getBlogCategory(categorySlug) : undefined;

  const filtered = useMemo(() => {
    let list = [...BLOG_ARTICLES];
    if (category) list = list.filter((a) => a.categoryId === category.id);
    if (tag) list = list.filter((a) => a.tags.some((t) => t.toLowerCase() === tag));
    if (q) {
      list = list.filter((a) =>
        `${a.title} ${a.excerpt} ${a.tags.join(" ")} ${a.author}`.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return list;
  }, [category, q, tag]);

  const featured = BLOG_ARTICLES.find((a) => a.featured) ?? BLOG_ARTICLES[0];
  const latest = [...BLOG_ARTICLES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 5);
  const allTags = [...new Set(BLOG_ARTICLES.flatMap((a) => a.tags))].sort();
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function patch(mut: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    mut(next);
    setParams(next);
  }

  return (
    <>
      <Seo
        title={category ? `${category.name} — Journal` : "Journal"}
        description="Insights on furniture, interiors, manufacturing, and project craft from Rao Liaqat Furniture."
        path="/blog"
        {...(featured?.heroImage ? { image: featured.heroImage } : {})}
      />

      <header className="afh-blog-hero site-reveal">
        <div className="afh-blog-hero__copy">
          <Breadcrumbs items={[{ label: "Journal" }]} />
          <p className="site-eyebrow">{BRAND.name} Journal</p>
          <h1>Ideas for lasting spaces</h1>
          <p>
            Original notes on design, materials, manufacturing, and project delivery — written for architects,
            hospitality teams, and homeowners.
          </p>
        </div>
        {featured ? (
          <Link to={`/blog/${featured.slug}`} className="afh-blog-hero__feature">
            <img src={featured.heroImage} alt="" width={1200} height={800} />
            <div>
              <span>Featured</span>
              <strong>{featured.title}</strong>
              <em>
                {featured.author} · {formatDate(featured.publishedAt)}
              </em>
            </div>
          </Link>
        ) : null}
      </header>

      <div className="afh-blog-layout site-section site-reveal">
        <div className="afh-blog-layout__main">
          <form
            className="afh-blog-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
              patch((next) => {
                if (input.value.trim()) next.set("q", input.value.trim());
                else next.delete("q");
                next.delete("page");
              });
            }}
          >
            <label htmlFor="blog-q" className="site-sr">
              Search journal
            </label>
            <input id="blog-q" name="q" defaultValue={q} placeholder="Search articles" />
            <button type="submit" className="site-btn site-btn--ghost">
              Search
            </button>
          </form>

          {category ? (
            <p className="afh-blog-filter-note">
              Category: <strong>{category.name}</strong>{" "}
              <button type="button" className="site-text-link" onClick={() => patch((n) => n.delete("category"))}>
                Clear
              </button>
            </p>
          ) : null}

          <div className="afh-blog-grid cx-stagger">
            {pageItems.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>

          {pageItems.length === 0 ? (
            <div className="cx-empty" role="status">
              <h2>No articles match</h2>
              <p>Try another category or clear search.</p>
            </div>
          ) : null}

          {pageCount > 1 ? (
            <nav className="afh-blog-pagination" aria-label="Journal pages">
              <button
                type="button"
                className="site-btn site-btn--ghost"
                disabled={page <= 1}
                onClick={() =>
                  patch((n) => {
                    if (page - 1 <= 1) n.delete("page");
                    else n.set("page", String(page - 1));
                  })
                }
              >
                Previous
              </button>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                className="site-btn site-btn--ghost"
                disabled={page >= pageCount}
                onClick={() => patch((n) => n.set("page", String(page + 1)))}
              >
                Next
              </button>
            </nav>
          ) : null}
        </div>

        <aside className="afh-blog-sidebar" aria-label="Journal sidebar">
          <section>
            <h2>Categories</h2>
            <ul>
              {BLOG_CATEGORIES.map((c) => (
                <li key={c.id}>
                  <Link to={`/blog?category=${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Latest</h2>
            <ul>
              {latest.map((a) => (
                <li key={a.id}>
                  <Link to={`/blog/${a.slug}`}>{a.title}</Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Tags</h2>
            <div className="afh-blog-tags">
              {allTags.map((t) => (
                <Link key={t} to={`/blog?tag=${encodeURIComponent(t)}`}>
                  {t}
                </Link>
              ))}
            </div>
          </section>
          <section className="afh-blog-newsletter">
            <h2>Newsletter</h2>
            <p>Occasional notes on collections and project craft. No spam.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem("email") as HTMLInputElement;
                if (!input.value.trim()) return;
                localStorage.setItem("afh.blog.newsletter", input.value.trim());
                input.value = "";
                const status = e.currentTarget.querySelector("[data-nl]");
                if (status) status.textContent = "Subscribed — thank you.";
              }}
            >
              <label htmlFor="blog-nl" className="site-sr">
                Email
              </label>
              <input id="blog-nl" name="email" type="email" required placeholder="Email address" />
              <button type="submit" className="site-btn site-btn--primary">
                Subscribe
              </button>
              <p data-nl className="site-footer__tag" aria-live="polite" />
            </form>
          </section>
        </aside>
      </div>

      <section className="site-cta-band site-reveal" aria-labelledby="blog-cta">
        <h2 id="blog-cta">Specify with {BRAND.name}</h2>
        <p>Explore the catalogue or request a quotation for your next interior program.</p>
        <div className="site-hero__actions">
          <Link to="/products" className="site-btn site-btn--primary">
            Browse catalogue
          </Link>
          <Link to="/quote" className="site-btn site-btn--outline">
            Request quote
          </Link>
        </div>
      </section>
    </>
  );
}

export function BlogArticlePage() {
  const { slug = "" } = useParams();
  const article = getBlogArticle(slug);
  useReveal([slug]);

  if (!article) {
    return (
      <>
        <Seo title="Article not found" description="Journal article missing." path="/blog" />
        <div className="site-section cx-empty" role="status">
          <h1>Article not found</h1>
          <Link to="/blog" className="site-btn site-btn--primary">
            Back to journal
          </Link>
        </div>
      </>
    );
  }

  const cat = getBlogCategory(article.categoryId);
  const related = relatedArticles(article);
  const { prev, next } = adjacentArticles(article.slug);
  const shareUrl = typeof window !== "undefined" ? window.location.href : `${BRAND.web}/blog/${article.slug}`;

  return (
    <>
      <Seo
        title={article.title}
        description={article.excerpt}
        path={`/blog/${article.slug}`}
        image={article.heroImage}
        type="article"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Journal", path: "/blog" },
          { name: article.title, path: `/blog/${article.slug}` },
        ]}
      />

      <article className="afh-blog-article">
        <header className="afh-blog-article__hero site-reveal">
          <Breadcrumbs
            items={[
              { label: "Journal", to: "/blog" },
              ...(cat ? [{ label: cat.name, to: `/blog?category=${cat.slug}` }] : []),
              { label: article.title },
            ]}
          />
          {cat ? (
            <Link to={`/blog?category=${cat.slug}`} className="site-eyebrow">
              {cat.name}
            </Link>
          ) : (
            <p className="site-eyebrow">Journal</p>
          )}
          <h1>{article.title}</h1>
          <p className="afh-blog-article__meta">
            {article.author} · {formatDate(article.publishedAt)} · {article.readingMinutes} min read
          </p>
          <img
            className="afh-blog-article__feature"
            src={article.heroImage}
            alt=""
            width={1600}
            height={900}
            fetchPriority="high"
          />
        </header>

        <div className="afh-blog-article__body site-section site-reveal site-prose">
          {article.blocks.map((block, i) => {
            if (block.type === "p") return <p key={i}>{block.text}</p>;
            if (block.type === "h2") return <h2 key={i}>{block.text}</h2>;
            if (block.type === "quote") {
              return (
                <blockquote key={i} className="afh-blog-quote">
                  <p>{block.text}</p>
                  {block.attribution ? <cite>{block.attribution}</cite> : null}
                </blockquote>
              );
            }
            return (
              <figure key={i} className="afh-blog-figure">
                <img src={block.src} alt={block.alt} loading="lazy" />
                {block.caption ? <figcaption>{block.caption}</figcaption> : null}
              </figure>
            );
          })}

          <div className="afh-blog-tags">
            {article.tags.map((t) => (
              <Link key={t} to={`/blog?tag=${encodeURIComponent(t)}`}>
                {t}
              </Link>
            ))}
          </div>

          <div className="afh-blog-share" aria-label="Share">
            <span>Share</span>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
              target="_blank"
              rel="noreferrer"
            >
              X
            </a>
            <button
              type="button"
              className="site-btn site-btn--ghost"
              onClick={() => {
                void navigator.clipboard?.writeText(shareUrl);
              }}
            >
              Copy link
            </button>
          </div>
        </div>

        <nav className="afh-blog-adjacent site-section" aria-label="Previous and next articles">
          {prev ? (
            <Link to={`/blog/${prev.slug}`}>
              <span>Previous</span>
              <strong>{prev.title}</strong>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/blog/${next.slug}`}>
              <span>Next</span>
              <strong>{next.title}</strong>
            </Link>
          ) : (
            <span />
          )}
        </nav>

        {related.length ? (
          <section className="site-section site-reveal" aria-labelledby="related-blog">
            <h2 id="related-blog">Related articles</h2>
            <div className="afh-blog-grid cx-stagger">
              {related.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="site-section site-reveal" aria-labelledby="article-cta">
          <h2 id="article-cta">Continue the conversation</h2>
          <p>Request a quote or browse furniture collections shaped by the same craft principles.</p>
          <div className="site-hero__actions">
            <Link to="/quote" className="site-btn site-btn--primary">
              Request quote
            </Link>
            <Link to="/furniture" className="site-btn site-btn--outline">
              Browse furniture
            </Link>
          </div>
          <InquiryForm intent={`Blog inquiry: ${article.title}`} meta={{ article: article.slug }} />
        </section>
      </article>
    </>
  );
}

/** @deprecated Prefer BlogIndexPage — kept for lazy import compatibility during RC9.1.1. */
export function BlogPage() {
  return <BlogIndexPage />;
}
