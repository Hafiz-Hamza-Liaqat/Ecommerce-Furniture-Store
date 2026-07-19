import { Link } from "react-router-dom";
import { Seo } from "../Seo";
import { LuxuryBooklet } from "../Booklet";
import {
  AWARDS,
  BRAND,
  CATEGORIES,
  FAQ,
  IMG,
  NEWS,
  PROCESS,
  PRODUCTS,
  PROJECTS,
  STATS,
  TESTIMONIALS,
  TIMELINE,
  TRUSTED,
} from "../data/content";
import { useReveal } from "../useReveal";

export function HomePage() {
  useReveal();

  return (
    <>
      <Seo
        title="Furniture manufactured for lasting spaces"
        description={BRAND.tagline}
        path="/"
        image={IMG.hero}
      />

      <section className="site-hero" aria-label="Introduction">
        <div className="site-hero__media">
          <img
            src={IMG.hero}
            alt="Contemporary living room furnished with Artisan Furnish Hub pieces"
            width={1600}
            height={1067}
            fetchPriority="high"
            decoding="async"
          />
        </div>
        <div className="site-hero__content">
          <p className="site-hero__brand">{BRAND.name}</p>
          <h1>{BRAND.tagline}</h1>
          <p className="site-hero__lead">
            Collections and custom programs for homes, hotels, and workplaces — engineered in our factory.
          </p>
          <div className="site-hero__actions">
            <Link to="/products" className="site-btn site-btn--primary">
              Explore catalogue
            </Link>
            <Link to="/demo" className="site-btn site-btn--ghost">
              Book a demo
            </Link>
          </div>
        </div>
      </section>

      <section className="site-stats site-reveal" aria-label="Key figures">
        {STATS.map((s) => (
          <div key={s.label}>
            <p className="site-stats__value">{s.value}</p>
            <p className="site-stats__label">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="site-section site-reveal" aria-labelledby="trusted-title">
        <p className="site-eyebrow">Trusted by</p>
        <h2 id="trusted-title" className="site-sr">
          Trusted brands
        </h2>
        <ul className="site-logos">
          {TRUSTED.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <LuxuryBooklet />

      <section className="site-section site-reveal" aria-labelledby="cat-title">
        <div className="site-section__head">
          <p className="site-eyebrow">Categories</p>
          <h2 id="cat-title">Interactive product categories</h2>
        </div>
        <div className="site-category-grid">
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/furniture/${c.id === "lounge" ? "living-room" : c.id === "workspace" ? "office" : c.id}`} className="site-category cx-hover-lift">
              <img src={c.image} alt={c.name} loading="lazy" />
              <span>{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="site-section site-reveal" aria-labelledby="feat-title">
        <div className="site-section__head">
          <p className="site-eyebrow">Collections</p>
          <h2 id="feat-title">Featured furniture</h2>
        </div>
        <div className="site-product-grid">
          {PRODUCTS.filter((p) => p.featured).map((p) => (
            <Link key={p.id} to={`/products/${p.id}`} className="site-product">
              <img src={p.image} alt={p.name} loading="lazy" />
              <div>
                <p className="site-product__meta">{p.collection}</p>
                <h3>{p.name}</h3>
                <p>{p.summary}</p>
                <p className="site-product__price">{p.priceFrom}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="site-section site-reveal" aria-labelledby="proj-title">
        <div className="site-section__head">
          <p className="site-eyebrow">Projects</p>
          <h2 id="proj-title">Featured manufacturing projects</h2>
          <Link to="/projects" className="site-text-link">
            View portfolio
          </Link>
        </div>
        <div className="site-project-grid">
          {PROJECTS.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="site-project">
              <img src={p.image} alt={p.title} loading="lazy" />
              <div>
                <p className="site-product__meta">{p.category}</p>
                <h3>{p.title}</h3>
                <p>{p.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="site-section site-reveal" aria-labelledby="mfg-title">
        <div className="site-section__head">
          <p className="site-eyebrow">Manufacturing</p>
          <h2 id="mfg-title">From timber to install</h2>
        </div>
        <ol className="site-process">
          {PROCESS.map((step, i) => (
            <li key={step.title}>
              <img src={step.image} alt={step.title} loading="lazy" />
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <Link to="/manufacturing" className="site-btn site-btn--ghost">
          Manufacturing story
        </Link>
      </section>

      <section className="site-section site-split site-reveal" aria-labelledby="sustain-title">
        <div>
          <p className="site-eyebrow">Sustainability</p>
          <h2 id="sustain-title">Built to last, sourced with care</h2>
          <p>
            Certified timber pathways, durable construction, and finishes chosen for long service life —
            so spaces stay beautiful without constant replacement.
          </p>
          <Link to="/sustainability" className="site-btn site-btn--primary">
            Our approach
          </Link>
        </div>
        <img src={IMG.wood} alt="Timber preparation in the AFH factory" loading="lazy" />
      </section>

      <section className="site-section site-reveal" aria-labelledby="time-title">
        <div className="site-section__head">
          <p className="site-eyebrow">Timeline</p>
          <h2 id="time-title">Company timeline</h2>
        </div>
        <ol className="site-timeline">
          {TIMELINE.map((t) => (
            <li key={t.year}>
              <time>{t.year}</time>
              <h3>{t.title}</h3>
              <p>{t.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="site-section site-reveal" aria-labelledby="award-title">
        <div className="site-section__head">
          <p className="site-eyebrow">Recognition</p>
          <h2 id="award-title">Awards & certifications</h2>
        </div>
        <ul className="site-awards">
          {AWARDS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>

      <section className="site-section site-reveal" aria-labelledby="quote-title">
        <div className="site-section__head">
          <p className="site-eyebrow">Voices</p>
          <h2 id="quote-title">Client testimonials</h2>
        </div>
        <div className="site-quotes">
          {TESTIMONIALS.map((t) => (
            <blockquote key={t.name}>
              <p>“{t.quote}”</p>
              <footer>
                <cite>{t.name}</cite>
                <span>{t.role}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="site-section site-reveal" aria-labelledby="news-title">
        <div className="site-section__head">
          <p className="site-eyebrow">News</p>
          <h2 id="news-title">From the studio</h2>
          <Link to="/news" className="site-text-link">
            All news
          </Link>
        </div>
        <div className="site-news">
          {NEWS.map((n) => (
            <article key={n.id}>
              <time>{n.date}</time>
              <h3>{n.title}</h3>
              <p>{n.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-section site-reveal" aria-labelledby="faq-title">
        <div className="site-section__head">
          <p className="site-eyebrow">FAQ</p>
          <h2 id="faq-title">Questions</h2>
        </div>
        <div className="site-faq">
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="site-cta-band site-reveal" aria-labelledby="cta-title">
        <h2 id="cta-title">Ready to specify AFH?</h2>
        <p>Request a quotation, book a demo, or download the catalogue PDF.</p>
        <div className="site-hero__actions">
          <Link to="/quote" className="site-btn site-btn--primary">
            Request quotation
          </Link>
          <Link to="/demo" className="site-btn site-btn--ghost">
            Book demo
          </Link>
          <a className="site-btn site-btn--ghost" href="/catalogue.pdf" download>
            Download catalogue
          </a>
        </div>
      </section>
    </>
  );
}
