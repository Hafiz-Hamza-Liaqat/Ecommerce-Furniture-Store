import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BRAND, CATEGORIES, COLLECTIONS, NEWS, PRODUCTS, PROJECTS } from "./data/content";
import { useSession } from "../state/session";

export function MarketingShell() {
  const { pathname, hash } = useLocation();
  const { theme, setTheme } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [cookieOk, setCookieOk] = useState(
    () => localStorage.getItem("afh.site.cookies") === "1",
  );
  const [showTop, setShowTop] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setMenuOpen(false);
    setMegaOpen(false);
    setSearchOpen(false);
    setPageReady(false);
    const t = window.setTimeout(() => setPageReady(true), 280);
    if (pathname === "/" && hash === "#booklet") {
      window.setTimeout(() => {
        document.getElementById("booklet")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } else {
      window.scrollTo(0, 0);
    }
    return () => window.clearTimeout(t);
  }, [pathname, hash]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="site" data-site-theme={theme === "dark" ? "dark" : "light"}>
      <a className="site-skip" href="#site-main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="site-logo" aria-label={`${BRAND.name} home`}>
            <span className="site-logo__mark">{BRAND.short}</span>
            <span className="site-logo__name">{BRAND.name}</span>
          </Link>
          <button
            type="button"
            className="site-nav-toggle"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((v) => !v)}
          >
            Menu
          </button>
          <nav
            id={menuId}
            className={`site-nav${menuOpen ? " is-open" : ""}`}
            aria-label="Primary"
          >
            <div
              className="site-nav__item"
              onMouseEnter={() => setMegaOpen(true)}
              onMouseLeave={() => setMegaOpen(false)}
            >
              <button
                type="button"
                className="site-nav__link"
                aria-expanded={megaOpen}
                onClick={() => setMegaOpen((v) => !v)}
              >
                Collections
              </button>
              {megaOpen ? (
                <div className="site-mega" role="region" aria-label="Collections menu">
                  <div className="site-mega__col">
                    <p className="site-mega__label">Lines</p>
                    {COLLECTIONS.map((c) => (
                      <Link key={c.id} to={`/products?collection=${c.id}`} onClick={() => setMegaOpen(false)}>
                        <strong>{c.name}</strong>
                        <span>{c.blurb}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="site-mega__col">
                    <p className="site-mega__label">Categories</p>
                    {CATEGORIES.map((c) => (
                      <Link key={c.id} to={`/products?category=${c.id}`} onClick={() => setMegaOpen(false)}>
                        {c.name}
                      </Link>
                    ))}
                  </div>
                  <div className="site-mega__feature">
                    <p>Digital booklet</p>
                    <Link to="/#booklet" className="site-btn site-btn--ghost" onClick={() => setMegaOpen(false)}>
                      Open catalogue
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
            <NavLink to="/products" className="site-nav__link">
              Products
            </NavLink>
            <NavLink to="/projects" className="site-nav__link">
              Projects
            </NavLink>
            <NavLink to="/manufacturing" className="site-nav__link">
              Manufacturing
            </NavLink>
            <NavLink to="/about" className="site-nav__link">
              Company
            </NavLink>
            <NavLink to="/contact" className="site-nav__link">
              Contact
            </NavLink>
            <button
              type="button"
              className="site-nav__link"
              onClick={() => setSearchOpen(true)}
              aria-haspopup="dialog"
            >
              Search
            </button>
            <Link to="/quote" className="site-btn site-btn--primary site-nav__cta">
              Request quote
            </Link>
            <Link to="/app" className="site-nav__link site-nav__console">
              Console
            </Link>
            <button
              type="button"
              className="site-theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle color theme"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </nav>
        </div>
      </header>

      <main id="site-main" className="site-main">
        {!pageReady ? <PageSkeleton /> : null}
        <div
          className={`site-page-transition${pageReady ? " is-ready" : ""}`}
          aria-busy={!pageReady}
          hidden={!pageReady}
        >
          <Outlet />
        </div>
      </main>

      {searchOpen ? <SiteSearch onClose={() => setSearchOpen(false)} /> : null}

      <footer className="site-footer">
        <div className="site-footer__grid">
          <div>
            <p className="site-footer__brand">{BRAND.name}</p>
            <p className="site-footer__tag">{BRAND.tagline}</p>
            <form
              className="site-newsletter"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const input = form.elements.namedItem("email") as HTMLInputElement | null;
                const value = input?.value?.trim() ?? "";
                if (!value) return;
                localStorage.setItem("afh.site.newsletter", value);
                input!.value = "";
                const status = form.querySelector("[data-nl-status]");
                if (status) status.textContent = "Subscribed — thank you.";
              }}
            >
              <label htmlFor="nl-email" className="site-sr">
                Email for newsletter
              </label>
              <input id="nl-email" name="email" type="email" required placeholder="Email address" />
              <button type="submit" className="site-btn site-btn--primary">
                Subscribe
              </button>
              <p data-nl-status className="site-footer__tag" aria-live="polite" />
            </form>
          </div>
          <FooterCol
            title="Company"
            links={[
              ["/about", "About"],
              ["/story", "Our story"],
              ["/leadership", "Leadership"],
              ["/careers", "Careers"],
              ["/partners", "Partners"],
              ["/distributors", "Distributors"],
            ]}
          />
          <FooterCol
            title="Capabilities"
            links={[
              ["/manufacturing", "Manufacturing"],
              ["/factory", "Factory"],
              ["/technology", "Technology"],
              ["/sustainability", "Sustainability"],
              ["/quality", "Quality"],
              ["/certifications", "Certifications"],
            ]}
          />
          <FooterCol
            title="Explore"
            links={[
              ["/products", "Catalogue"],
              ["/projects", "Projects"],
              ["/news", "News"],
              ["/blog", "Journal"],
              ["/events", "Events"],
              ["/faq", "FAQ"],
              ["/demo", "Book demo"],
              ["/quote", "Request quote"],
            ]}
          />
        </div>
        <div className="site-footer__legal">
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href="/sitemap.xml">Sitemap</a>
        </div>
      </footer>

      <a
        className="site-whatsapp"
        href={`https://wa.me/${BRAND.whatsapp}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
      >
        WhatsApp
      </a>
      <button
        type="button"
        className="site-chat"
        aria-expanded={chatOpen}
        onClick={() => setChatOpen((v) => !v)}
      >
        Live chat
      </button>
      {chatOpen ? (
        <div className="site-chat-panel" role="dialog" aria-label="Live chat">
          <p>Chat connects to our studio during business hours. Leave a message and we will follow up.</p>
          <Link to="/contact" className="site-btn site-btn--primary" onClick={() => setChatOpen(false)}>
            Contact form
          </Link>
          <button type="button" className="site-btn site-btn--ghost" onClick={() => setChatOpen(false)}>
            Close
          </button>
        </div>
      ) : null}

      {showTop ? (
        <button
          type="button"
          className="site-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Top
        </button>
      ) : null}

      {!cookieOk ? (
        <div className="site-cookies" role="dialog" aria-label="Cookie notice">
          <p>
            We use essential cookies for session and preferences, and optional analytics to improve the site.
          </p>
          <button
            type="button"
            className="site-btn site-btn--primary"
            onClick={() => {
              localStorage.setItem("afh.site.cookies", "1");
              setCookieOk(true);
            }}
          >
            Accept
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="site-skeleton" aria-live="polite" aria-label="Loading page">
      <div className="site-skeleton__hero" />
      <div className="site-skeleton__row">
        <div className="site-skeleton__card" />
        <div className="site-skeleton__card" />
        <div className="site-skeleton__card" />
      </div>
    </div>
  );
}

function SiteSearch({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const hits: { label: string; to: string; kind: string }[] = [];
    for (const p of PRODUCTS) {
      if (`${p.name} ${p.category} ${p.collection}`.toLowerCase().includes(needle)) {
        hits.push({ label: p.name, to: `/products/${p.id}`, kind: "Product" });
      }
    }
    for (const p of PROJECTS) {
      if (`${p.title} ${p.client} ${p.category}`.toLowerCase().includes(needle)) {
        hits.push({ label: p.title, to: `/projects/${p.id}`, kind: "Project" });
      }
    }
    for (const n of NEWS) {
      if (`${n.title} ${n.summary}`.toLowerCase().includes(needle)) {
        hits.push({ label: n.title, to: "/news", kind: "News" });
      }
    }
    for (const c of CATEGORIES) {
      if (c.name.toLowerCase().includes(needle)) {
        hits.push({ label: c.name, to: `/products?category=${c.id}`, kind: "Category" });
      }
    }
    return hits.slice(0, 8);
  }, [q]);

  return (
    <div
      className="site-search"
      role="dialog"
      aria-modal="true"
      aria-label="Site search"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="site-search__panel">
        <label htmlFor="site-search-q" className="site-sr">
          Search products, projects, and pages
        </label>
        <input
          id="site-search-q"
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search catalogue, projects, news…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              navigate(results[0].to);
              onClose();
            }
          }}
        />
        <ul className="site-search__results">
          {results.map((r) => (
            <li key={`${r.kind}-${r.to}-${r.label}`}>
              <Link
                to={r.to}
                onClick={onClose}
              >
                <span>{r.kind}</span>
                <strong>{r.label}</strong>
              </Link>
            </li>
          ))}
          {q.trim().length >= 2 && results.length === 0 ? (
            <li className="site-search__empty">No matches — try a product or project name.</li>
          ) : null}
        </ul>
        <p className="site-search__hint">
          Press <kbd>Esc</kbd> to close · <kbd>⌘/Ctrl K</kbd> to open
        </p>
        <button type="button" className="site-btn site-btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: readonly (readonly [string, string])[];
}) {
  return (
    <div>
      <p className="site-footer__heading">{title}</p>
      <ul>
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to}>{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SitePage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`site-page${className ? ` ${className}` : ""}`}>{children}</div>;
}
