import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BRAND, COLLECTIONS, NEWS, PROJECTS } from "./data/content";
import { CATALOGUE } from "./data/catalogue";
import { FURNITURE_TAXONOMY, flattenTaxonomy } from "./data/taxonomy";
import { pushRecentSearch, getRecentSearches } from "./cx/stores";
import { useSession } from "../state/session";
import { useFocusTrap } from "../a11y/useFocusTrap";

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
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      // `/` opens search when not typing (does not conflict with browser Find when Ctrl/Cmd held)
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setChatOpen(false);
        setMegaOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="site" data-site-theme={theme === "dark" ? "dark" : "light"}>
      <a className="site-skip" href="#site-main">
        Skip to content
      </a>
      <header className={`site-header${showTop ? " is-scrolled" : ""}`}>
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
              onMouseEnter={() => {
                window.clearTimeout((window as unknown as { __afhMega?: number }).__afhMega);
                (window as unknown as { __afhMega?: number }).__afhMega = window.setTimeout(
                  () => setMegaOpen(true),
                  100,
                );
              }}
              onMouseLeave={() => {
                window.clearTimeout((window as unknown as { __afhMega?: number }).__afhMega);
                (window as unknown as { __afhMega?: number }).__afhMega = window.setTimeout(
                  () => setMegaOpen(false),
                  160,
                );
              }}
            >
              <button
                type="button"
                className="site-nav__link"
                aria-expanded={megaOpen}
                aria-haspopup="true"
                onClick={() => setMegaOpen((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMegaOpen(true);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setMegaOpen(false);
                  }
                }}
              >
                Furniture
              </button>
              {megaOpen ? (
                <div className="site-mega site-mega--furniture" role="region" aria-label="Furniture menu">
                  {FURNITURE_TAXONOMY.map((col) => (
                    <div key={col.id} className="site-mega__col">
                      <p className="site-mega__label">
                        <Link to={`/furniture/${col.slug}`} onClick={() => setMegaOpen(false)}>
                          {col.name}
                        </Link>
                      </p>
                      {(col.children ?? []).map((c) => (
                        <Link
                          key={c.id}
                          to={`/furniture/${col.slug}/${c.slug}`}
                          onClick={() => setMegaOpen(false)}
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                  <div className="site-mega__feature">
                    <p>All furniture</p>
                    <Link to="/furniture" className="site-btn site-btn--ghost" onClick={() => setMegaOpen(false)}>
                      Browse hub
                    </Link>
                    <Link to="/#booklet" className="site-btn site-btn--ghost" onClick={() => setMegaOpen(false)}>
                      Digital booklet
                    </Link>
                    <Link to="/planner" className="site-btn site-btn--primary" onClick={() => setMegaOpen(false)}>
                      Budget planner
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
            <NavLink to="/consultant" className="site-nav__link">
              Consultant
            </NavLink>
            <NavLink to="/wishlist" className="site-nav__link" aria-label="Wishlist">
              Wishlist
            </NavLink>
            <NavLink to="/compare" className="site-nav__link" aria-label="Compare">
              Compare
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
        {!pageReady ? <PageSkeleton path={pathname} /> : null}
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
              ["/furniture", "Furniture"],
              ["/products", "Catalogue"],
              ["/projects", "Projects"],
              ["/news", "News"],
              ["/blog", "Journal"],
              ["/events", "Events"],
              ["/faq", "FAQ"],
              ["/downloads", "Downloads"],
              ["/planner", "Budget planner"],
              ["/consultant", "AI consultant"],
              ["/demo", "Book demo"],
              ["/quote", "Request quote"],
            ]}
          />
        </div>
        <div className="site-footer__legal">
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/cookies">Cookies</Link>
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
        Furniture consultant
      </button>
      {chatOpen ? (
        <ChatPanel onClose={() => setChatOpen(false)} />
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
        <CookieBanner
          onAccept={() => {
            localStorage.setItem("afh.site.cookies", "1");
            setCookieOk(true);
          }}
          onDismiss={() => setCookieOk(true)}
        />
      ) : null}
    </div>
  );
}

function PageSkeleton({ path }: { path: string }) {
  if (path.startsWith("/furniture")) {
    return (
      <div className="site-skeleton cx-skeleton-category" aria-live="polite" aria-label="Loading category">
        <div className="site-skeleton__hero" />
        <div className="cx-skeleton-category__body">
          <div className="cx-skeleton-filters">
            <div className="cx-skeleton-card__line" />
            <div className="cx-skeleton-card__line" />
            <div className="cx-skeleton-card__line cx-skeleton-card__line--short" />
          </div>
          <div className="cx-skeleton-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="cx-skeleton-card">
                <div className="cx-skeleton-card__media" />
                <div className="cx-skeleton-card__line" />
                <div className="cx-skeleton-card__line cx-skeleton-card__line--short" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (path.startsWith("/planner")) {
    return (
      <div className="site-skeleton cx-skeleton-planner" aria-live="polite" aria-label="Loading planner">
        <div className="site-skeleton__hero" />
        <div className="cx-skeleton-card__line" />
        <div className="cx-skeleton-card__line" />
      </div>
    );
  }
  if (path.startsWith("/compare")) {
    return (
      <div className="site-skeleton cx-skeleton-compare" aria-live="polite" aria-label="Loading compare">
        <div className="site-skeleton__hero" />
        <div className="cx-skeleton-card__line" />
        <div className="cx-skeleton-card__line" />
      </div>
    );
  }
  if (path.startsWith("/products/")) {
    return (
      <div className="site-skeleton cx-skeleton-gallery" aria-live="polite" aria-label="Loading product">
        <div className="cx-skeleton-gallery__stage" />
        <div className="cx-skeleton-card__line" />
        <div className="cx-skeleton-card__line cx-skeleton-card__line--short" />
      </div>
    );
  }
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

function ChatPanel({ onClose }: { onClose: () => void }) {
  const close = useCallback(() => onClose(), [onClose]);
  const trapRef = useFocusTrap(true, close);
  return (
    <div
      ref={trapRef}
      className="site-chat-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Furniture consultant"
      tabIndex={-1}
    >
      <p>
        Open the AI Furniture Consultant for a showroom-style conversation, or leave a contact message for
        sales.
      </p>
      <Link to="/consultant" className="site-btn site-btn--primary" onClick={onClose}>
        Open consultant
      </Link>
      <Link to="/contact" className="site-btn site-btn--ghost" onClick={onClose}>
        Contact form
      </Link>
      <button type="button" className="site-btn site-btn--ghost" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

function CookieBanner({
  onAccept,
  onDismiss,
}: {
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const close = useCallback(() => onDismiss(), [onDismiss]);
  const trapRef = useFocusTrap(true, close);
  return (
    <div
      ref={trapRef}
      className="site-cookies"
      role="dialog"
      aria-modal="true"
      aria-label="Cookie notice"
      tabIndex={-1}
    >
      <p>
        We use essential cookies for session and preferences, and optional analytics to improve the site.
      </p>
      <button type="button" className="site-btn site-btn--primary" onClick={onAccept}>
        Accept essential
      </button>
      <Link to="/cookies" className="site-btn site-btn--ghost" onClick={onDismiss}>
        Preferences
      </Link>
    </div>
  );
}

function SiteSearch({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const close = useCallback(() => onClose(), [onClose]);
  const trapRef = useFocusTrap(true, close);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const recent = getRecentSearches();
  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), 220);
    return () => window.clearTimeout(t);
  }, [q]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const hits: { label: string; to: string; kind: string }[] = [];
    for (const p of CATALOGUE) {
      if (`${p.name} ${p.category} ${p.collection} ${p.tags.join(" ")}`.toLowerCase().includes(needle)) {
        hits.push({ label: p.name, to: `/products/${p.id}`, kind: "Product" });
      }
    }
    for (const { node, parent } of flattenTaxonomy()) {
      if (node.name.toLowerCase().includes(needle)) {
        hits.push({
          label: node.name,
          to: parent ? `/furniture/${parent.slug}/${node.slug}` : `/furniture/${node.slug}`,
          kind: "Category",
        });
      }
    }
    for (const c of COLLECTIONS) {
      if (c.name.toLowerCase().includes(needle)) {
        hits.push({ label: c.name, to: `/products?collection=${c.id}`, kind: "Collection" });
      }
    }
    for (const p of PROJECTS) {
      if (`${p.title} ${p.client} ${p.category}`.toLowerCase().includes(needle)) {
        hits.push({ label: p.title, to: `/projects/${p.id}`, kind: "Project" });
      }
    }
    for (const n of NEWS) {
      if (`${n.title} ${n.summary}`.toLowerCase().includes(needle)) {
        hits.push({ label: n.title, to: "/news", kind: "CMS" });
      }
    }
    const pages = [
      { label: "Budget planner", to: "/planner" },
      { label: "AI Furniture Consultant", to: "/consultant" },
      { label: "Downloads", to: "/downloads" },
      { label: "Manufacturing", to: "/manufacturing" },
    ];
    for (const page of pages) {
      if (page.label.toLowerCase().includes(needle)) {
        hits.push({ label: page.label, to: page.to, kind: "Page" });
      }
    }
    return hits.slice(0, 10);
  }, [q]);

  return (
    <div
      ref={trapRef}
      className={`site-search${isMobile ? " site-search--drawer" : ""} cx-motion-fade`}
      role="dialog"
      aria-modal="true"
      aria-label="Site search"
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="site-search__panel">
        <label htmlFor="site-search-q" className="site-sr">
          Search products, categories, projects, and pages
        </label>
        <div className="site-search__input-wrap">
          <input
            id="site-search-q"
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search catalogue, categories, projects…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                pushRecentSearch(q);
                navigate(results[0].to);
                onClose();
              }
            }}
          />
          {loading ? (
            <span className="site-search__loading" role="status" aria-live="polite">
              Searching…
            </span>
          ) : null}
        </div>
        {q.trim().length < 2 && recent.length ? (
          <ul className="site-search__results" aria-label="Recent searches">
            {recent.map((r) => (
              <li key={r}>
                <button
                  type="button"
                  className="site-search__recent"
                  onClick={() => setQ(r)}
                >
                  <span>Recent</span>
                  <strong>{r}</strong>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <ul className={`site-search__results${loading ? " is-loading" : ""}`}>
          {results.map((r) => (
            <li key={`${r.kind}-${r.to}-${r.label}`}>
              <Link
                to={r.to}
                onClick={() => {
                  pushRecentSearch(q);
                  onClose();
                }}
              >
                <span>{r.kind}</span>
                <strong>{r.label}</strong>
              </Link>
            </li>
          ))}
          {!loading && q.trim().length >= 2 && results.length === 0 ? (
            <li className="site-search__empty">No matches — try a product or category name.</li>
          ) : null}
        </ul>
        <p className="site-search__hint">
          Press <kbd>/</kbd> or <kbd>⌘/Ctrl K</kbd> to open · <kbd>Esc</kbd> to close
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
