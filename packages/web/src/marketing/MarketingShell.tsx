import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BRAND, COLLECTIONS, NEWS, PROJECTS } from "./data/content";
import { BrandLogo } from "../brand/BrandLogo";
import { whatsappUrl } from "../brand";
import { CATALOGUE } from "./data/catalogue";
import { FURNITURE_TAXONOMY, flattenTaxonomy } from "./data/taxonomy";
import { pushRecentSearch, getRecentSearches } from "./cx/stores";
import { useSession } from "../state/session";
import { useFocusTrap } from "../a11y/useFocusTrap";
import {
  BECOME_ROLE_OPTIONS,
  COMPANY_MEGA_LINKS,
  GUEST_ACCOUNT_SECTIONS,
  buildRoleAccountSections,
  WORKSPACE_ROLES,
  addExtraWorkspaceRole,
  displayFirstName,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  resolveWorkspaceRoles,
  setActiveWorkspaceRole,
  unreadNotificationCount,
  type AccountMenuLink,
  type CxNotification,
  type WorkspaceRoleId,
} from "./nav";
import { SyncStatusChip } from "./cx/sync/ui/SyncStatusChip";

type MegaKind = "furniture" | "company" | null;

export function MarketingShell() {
  const { pathname, hash } = useLocation();
  const { theme, setTheme, user, tokens, permissionCodes, clearSession } = useSession();
  const isLoggedIn = Boolean(tokens?.sessionId && user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState<MegaKind>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [mobileCompanyOpen, setMobileCompanyOpen] = useState(false);
  const [mobileFurnitureOpen, setMobileFurnitureOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifTick, setNotifTick] = useState(0);
  const [pageReady, setPageReady] = useState(false);
  const [cookieOk, setCookieOk] = useState(
    () => localStorage.getItem("afh.site.cookies") === "1",
  );
  const [showTop, setShowTop] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [roleTick, setRoleTick] = useState(0);
  const menuId = useId();
  const accountMenuId = useId();
  const companyMegaId = useId();
  const furnitureMegaId = useId();
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeAccount = useCallback(() => setAccountOpen(false), []);
  const drawerTrapRef = useFocusTrap(menuOpen, closeMenu);
  const accountTrapRef = useFocusTrap(accountOpen, closeAccount);
  const accountContainerRef = useRef<HTMLDivElement>(null);
  const megaTimer = useRef<number | null>(null);

  const workspace = useMemo(() => {
    void roleTick;
    return resolveWorkspaceRoles(isLoggedIn ? permissionCodes : null);
  }, [isLoggedIn, permissionCodes, roleTick]);

  const displayName = user
    ? displayFirstName(user.fullName, user.email)
    : "Account";

  const unreadCount = useMemo(() => {
    void notifTick;
    return unreadNotificationCount();
  }, [notifTick]);
  const notifications = useMemo(() => {
    void notifTick;
    return listNotifications();
  }, [notifTick]);

  useEffect(() => {
    setMenuOpen(false);
    setMegaOpen(null);
    setAccountOpen(false);
    setMobileAccountOpen(false);
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
    if (!menuOpen) return;
    const scrollY = window.scrollY;
    const { style: body } = document.body;
    const { style: html } = document.documentElement;
    const prev = {
      bodyOverflow: body.overflow,
      bodyPosition: body.position,
      bodyTop: body.top,
      bodyWidth: body.width,
      htmlOverflow: html.overflow,
    };
    body.overflow = "hidden";
    body.position = "fixed";
    body.top = `-${scrollY}px`;
    body.width = "100%";
    html.overflow = "hidden";
    return () => {
      body.overflow = prev.bodyOverflow;
      body.position = prev.bodyPosition;
      body.top = prev.bodyTop;
      body.width = prev.bodyWidth;
      html.overflow = prev.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [menuOpen]);

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
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setChatOpen(false);
        setMegaOpen(null);
        setAccountOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const clearMegaTimer = () => {
    if (megaTimer.current != null) {
      window.clearTimeout(megaTimer.current);
      megaTimer.current = null;
    }
  };

  const openMega = (kind: MegaKind) => {
    clearMegaTimer();
    megaTimer.current = window.setTimeout(() => setMegaOpen(kind), 80);
  };

  const closeMegaSoon = () => {
    clearMegaTimer();
    megaTimer.current = window.setTimeout(() => setMegaOpen(null), 160);
  };

  const closeNavSurfaces = () => {
    setMegaOpen(null);
    setAccountOpen(false);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const root = accountContainerRef.current;
      if (root && !root.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [accountOpen]);

  function handleAccountAction(link: AccountMenuLink) {
    if (link.action === "logout") {
      clearSession();
      closeNavSurfaces();
      return;
    }
    if (link.action === "notifications" || link.action === "appearance") {
      return;
    }
    closeNavSurfaces();
  }

  function refreshNotifications() {
    setNotifTick((n) => n + 1);
  }

  function switchRole(role: WorkspaceRoleId) {
    setActiveWorkspaceRole(role);
    setRoleTick((n) => n + 1);
  }

  function becomeRole(role: WorkspaceRoleId) {
    addExtraWorkspaceRole(role);
    setActiveWorkspaceRole(role);
    setRoleTick((n) => n + 1);
  }

  const accountSections = isLoggedIn
    ? buildRoleAccountSections(workspace.active)
    : GUEST_ACCOUNT_SECTIONS;

  return (
    <div
      className={`site${menuOpen ? " is-nav-open" : ""}`}
      data-site-theme={theme === "dark" ? "dark" : "light"}
    >
      <a className="site-skip" href="#site-main">
        Skip to content
      </a>
      <header className={`site-header${showTop ? " is-scrolled" : ""}`}>
        <div className="site-header__inner">
          <BrandLogo variant="responsive" className="site-header__logo" />
          <button
            type="button"
            className="site-nav-toggle"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="site-nav-toggle__icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <button
            type="button"
            className={`site-nav-backdrop${menuOpen ? " is-open" : ""}`}
            aria-label="Close menu"
            tabIndex={menuOpen ? 0 : -1}
            onClick={closeMenu}
          />
          <div
            ref={drawerTrapRef}
            className={`site-nav-drawer${menuOpen ? " is-open" : ""}`}
            tabIndex={-1}
          >
            <div className="site-nav-drawer__head">
              <BrandLogo variant="text" className="site-nav-drawer__brand" onClick={closeMenu} />
              <button
                type="button"
                className="site-nav-drawer__close"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                Close
              </button>
            </div>
            <nav id={menuId} className="site-nav" aria-label="Primary">
              <div className="site-nav__primary">
                {/* Furniture */}
                <div
                  className="site-nav__item site-nav__item--mega"
                  onMouseEnter={() => openMega("furniture")}
                  onMouseLeave={closeMegaSoon}
                >
                  <button
                    type="button"
                    className="site-nav__link site-nav__mega-trigger"
                    aria-expanded={megaOpen === "furniture" || mobileFurnitureOpen}
                    aria-controls={furnitureMegaId}
                    aria-haspopup="true"
                    onClick={() => {
                      if (window.matchMedia("(max-width: 1199px)").matches) {
                        setMobileFurnitureOpen((v) => !v);
                      } else {
                        setMegaOpen((v) => (v === "furniture" ? null : "furniture"));
                      }
                    }}
                  >
                    Furniture
                    <span className="site-nav__chevron" aria-hidden="true" />
                  </button>
                  {(megaOpen === "furniture" || mobileFurnitureOpen) && (
                    <div
                      id={furnitureMegaId}
                      className="site-mega site-mega--furniture"
                      role="region"
                      aria-label="Furniture menu"
                      onMouseEnter={() => openMega("furniture")}
                      onMouseLeave={closeMegaSoon}
                    >
                      {FURNITURE_TAXONOMY.map((col) => (
                        <div key={col.id} className="site-mega__col">
                          <p className="site-mega__label">
                            <Link to={`/furniture/${col.slug}`} onClick={closeNavSurfaces}>
                              {col.name}
                            </Link>
                          </p>
                          {(col.children ?? []).map((c) => (
                            <Link
                              key={c.id}
                              to={`/furniture/${col.slug}/${c.slug}`}
                              onClick={closeNavSurfaces}
                            >
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      ))}
                      <div className="site-mega__feature">
                        <p>All furniture</p>
                        <Link to="/furniture" className="site-btn site-btn--outline" onClick={closeNavSurfaces}>
                          Browse hub
                        </Link>
                        <Link to="/#booklet" className="site-btn site-btn--outline" onClick={closeNavSurfaces}>
                          Digital booklet
                        </Link>
                        <Link to="/planner" className="site-btn site-btn--primary" onClick={closeNavSurfaces}>
                          Budget planner
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <NavLink to="/products" className="site-nav__link" onClick={closeMenu}>
                  Products
                </NavLink>
                <NavLink to="/projects" className="site-nav__link" onClick={closeMenu}>
                  Projects
                </NavLink>
                <NavLink to="/manufacturing" className="site-nav__link" onClick={closeMenu}>
                  Manufacturing
                </NavLink>
                <NavLink to="/consultant" className="site-nav__link" onClick={closeMenu}>
                  Consultant
                </NavLink>

                {/* Company */}
                <div
                  className="site-nav__item site-nav__item--mega"
                  onMouseEnter={() => openMega("company")}
                  onMouseLeave={closeMegaSoon}
                >
                  <button
                    type="button"
                    className="site-nav__link site-nav__mega-trigger"
                    aria-expanded={megaOpen === "company" || mobileCompanyOpen}
                    aria-controls={companyMegaId}
                    aria-haspopup="true"
                    onClick={() => {
                      if (window.matchMedia("(max-width: 1199px)").matches) {
                        setMobileCompanyOpen((v) => !v);
                      } else {
                        setMegaOpen((v) => (v === "company" ? null : "company"));
                      }
                    }}
                  >
                    Company
                    <span className="site-nav__chevron" aria-hidden="true" />
                  </button>
                  {(megaOpen === "company" || mobileCompanyOpen) && (
                    <div
                      id={companyMegaId}
                      className="site-mega site-mega--company"
                      role="region"
                      aria-label="Company menu"
                      onMouseEnter={() => openMega("company")}
                      onMouseLeave={closeMegaSoon}
                    >
                      <div className="site-mega__company-grid">
                        {COMPANY_MEGA_LINKS.map((item) => (
                          <Link key={item.to + item.label} to={item.to} onClick={closeNavSurfaces}>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <NavLink to="/blog" className="site-nav__link" onClick={closeMenu}>
                  Journal
                </NavLink>
              </div>

              <div className="site-nav__utils" aria-label="Tools">
                <button
                  type="button"
                  className="site-nav__icon-btn"
                  onClick={() => {
                    setSearchOpen(true);
                    setMenuOpen(false);
                  }}
                  aria-haspopup="dialog"
                  aria-label="Search"
                  title="Search (/)"
                >
                  <SearchIcon />
                  <span className="site-nav__icon-label">Search</span>
                </button>

                <Link
                  to="/quote"
                  className="site-btn site-btn--primary site-nav__cta"
                  onClick={closeMenu}
                >
                  Request Quote
                </Link>

                {isLoggedIn ? <SyncStatusChip userId={user?.id} /> : null}

                {/* Account — desktop dropdown (avatar only) */}
                <div
                  ref={accountContainerRef}
                  className="site-nav__item site-nav__item--account site-nav__account--desktop"
                >
                  <button
                    type="button"
                    className="site-nav__account-trigger site-nav__account-trigger--avatar"
                    aria-expanded={accountOpen}
                    aria-controls={accountMenuId}
                    aria-haspopup="menu"
                    aria-label={
                      isLoggedIn
                        ? unreadCount > 0
                          ? `${displayName} account, ${unreadCount} unread notifications`
                          : `${displayName} account`
                        : "Account menu"
                    }
                    onClick={() => setAccountOpen((v) => !v)}
                  >
                    <span className="site-nav__avatar-wrap">
                      <span className="site-nav__avatar" aria-hidden="true">
                        {isLoggedIn ? displayName.charAt(0).toUpperCase() : "?"}
                      </span>
                      {unreadCount > 0 ? (
                        <span className="site-nav__avatar-badge" aria-hidden="true">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  {accountOpen ? (
                    <AccountDropdown
                      id={accountMenuId}
                      menuRef={accountTrapRef}
                      isLoggedIn={isLoggedIn}
                      displayName={displayName}
                      badge={workspace.badge}
                      theme={theme}
                      setTheme={setTheme}
                      unreadCount={unreadCount}
                      notifications={notifications}
                      availableRoles={workspace.available}
                      activeRole={workspace.active}
                      sections={accountSections}
                      onAction={handleAccountAction}
                      onSwitchRole={switchRole}
                      onBecomeRole={becomeRole}
                      onNavigate={closeNavSurfaces}
                      onNotificationChange={refreshNotifications}
                    />
                  ) : null}
                </div>

                {/* Account — mobile expandable */}
                <div className="site-nav__account--mobile">
                  <button
                    type="button"
                    className="site-nav__link site-nav__account-trigger site-nav__account-trigger--mobile"
                    aria-expanded={mobileAccountOpen}
                    onClick={() => setMobileAccountOpen((v) => !v)}
                  >
                    <span className="site-nav__avatar-wrap">
                      <span className="site-nav__avatar" aria-hidden="true">
                        {isLoggedIn ? displayName.charAt(0).toUpperCase() : "?"}
                      </span>
                      {unreadCount > 0 ? (
                        <span className="site-nav__avatar-badge" aria-hidden="true">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      ) : null}
                    </span>
                    {isLoggedIn ? `${displayName} · ${workspace.badge}` : "Account"}
                    <span className="site-nav__chevron" aria-hidden="true" />
                  </button>
                  {mobileAccountOpen ? (
                    <AccountDropdown
                      id={`${accountMenuId}-mobile`}
                      inline
                      isLoggedIn={isLoggedIn}
                      displayName={displayName}
                      badge={workspace.badge}
                      theme={theme}
                      setTheme={setTheme}
                      unreadCount={unreadCount}
                      notifications={notifications}
                      availableRoles={workspace.available}
                      activeRole={workspace.active}
                      sections={accountSections}
                      onAction={handleAccountAction}
                      onSwitchRole={switchRole}
                      onBecomeRole={becomeRole}
                      onNavigate={closeNavSurfaces}
                      onNotificationChange={refreshNotifications}
                    />
                  ) : null}
                </div>
              </div>
            </nav>
          </div>
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
        <section className="site-footer__trust" aria-label="Business information">
          <div className="site-footer__trust-grid">
            <div className="site-footer__trust-item">
              <p className="site-footer__trust-label">Business</p>
              <p className="site-footer__trust-value">{BRAND.name}</p>
            </div>
            <div className="site-footer__trust-item">
              <p className="site-footer__trust-label">Phone</p>
              <p className="site-footer__trust-value">
                <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`}>{BRAND.phone}</a>
                <br />
                <a href={`tel:${BRAND.phoneSecondary.replace(/\s/g, "")}`}>{BRAND.phoneSecondary}</a>
              </p>
            </div>
            <div className="site-footer__trust-item">
              <p className="site-footer__trust-label">WhatsApp</p>
              <p className="site-footer__trust-value">
                <a href={whatsappUrl()}>{BRAND.whatsappDisplay}</a>
              </p>
            </div>
            <div className="site-footer__trust-item">
              <p className="site-footer__trust-label">Showroom</p>
              <p className="site-footer__trust-value">{BRAND.showroomNotice}</p>
            </div>
            <div className="site-footer__trust-item">
              <p className="site-footer__trust-label">Company</p>
              <p className="site-footer__trust-value">
                <Link to="/about">About</Link>
                {" · "}
                <Link to="/contact">Contact</Link>
              </p>
            </div>
            <div className="site-footer__trust-item">
              <p className="site-footer__trust-label">Catalogue</p>
              <p className="site-footer__trust-value">
                <Link to="/downloads">Download catalogue</Link>
              </p>
            </div>
          </div>
          <nav className="site-footer__social" aria-label="Social links">
            <span className="site-footer__social-link" title="Social URL — configure before launch">
              LinkedIn
            </span>
            <span className="site-footer__social-link" title="Social URL — configure before launch">
              Instagram
            </span>
            <span className="site-footer__social-link" title="Social URL — configure before launch">
              Facebook
            </span>
          </nav>
        </section>
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
              ["/blog", "Journal"],
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
              ["/blog", "Blog"],
              ["/events", "Events"],
              ["/faq", "FAQ"],
              ["/downloads", "Downloads"],
              ["/planner", "Budget planner"],
              ["/consultant", "AI consultant"],
              ["/my-projects", "My projects"],
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
        href={whatsappUrl()}
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
      {chatOpen ? <ChatPanel onClose={() => setChatOpen(false)} /> : null}

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

function AccountDropdown({
  id,
  inline,
  menuRef,
  isLoggedIn,
  displayName,
  badge,
  theme,
  setTheme,
  unreadCount,
  notifications,
  availableRoles,
  activeRole,
  sections,
  onAction,
  onSwitchRole,
  onBecomeRole,
  onNavigate,
  onNotificationChange,
}: {
  id: string;
  inline?: boolean;
  menuRef?: RefObject<HTMLDivElement | null>;
  isLoggedIn: boolean;
  displayName: string;
  badge: string;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  unreadCount: number;
  notifications: readonly CxNotification[];
  availableRoles: readonly WorkspaceRoleId[];
  activeRole: WorkspaceRoleId;
  sections: readonly { id: string; title?: string; links: readonly AccountMenuLink[] }[];
  onAction: (link: AccountMenuLink) => void;
  onSwitchRole: (role: WorkspaceRoleId) => void;
  onBecomeRole: (role: WorkspaceRoleId) => void;
  onNavigate: () => void;
  onNotificationChange: () => void;
}) {
  const [notifExpanded, setNotifExpanded] = useState(false);
  const [notifViewAll, setNotifViewAll] = useState(false);
  const previewItems = notifications.slice(0, notifViewAll ? notifications.length : 3);

  return (
    <div
      ref={menuRef}
      id={id}
      className={`site-account-menu${inline ? " site-account-menu--inline" : ""}`}
      role="menu"
      aria-label={isLoggedIn ? `${displayName} account menu` : "Account menu"}
    >
      {isLoggedIn ? (
        <div className="site-account-menu__header">
          <p className="site-account-menu__name">{displayName}</p>
          <p className="site-account-menu__badge">{badge}</p>
        </div>
      ) : null}

      {isLoggedIn && availableRoles.length > 1 ? (
        <div className="site-account-menu__section" role="group" aria-label="Current role">
          <p className="site-account-menu__section-title">Current Role</p>
          <ul className="site-account-menu__list">
            {availableRoles.map((roleId) => {
              const meta = WORKSPACE_ROLES.find((r) => r.id === roleId);
              if (!meta) return null;
              return (
                <li key={roleId}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={roleId === activeRole}
                    className={
                      roleId === activeRole
                        ? "site-account-menu__item is-active"
                        : "site-account-menu__item"
                    }
                    onClick={() => onSwitchRole(roleId)}
                  >
                    {roleId === activeRole ? "✓ " : ""}
                    {meta.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {sections.map((section) => (
        <div key={section.id} className="site-account-menu__section">
          {section.title ? (
            <p className="site-account-menu__section-title">{section.title}</p>
          ) : null}
          <ul className="site-account-menu__list">
            {section.links.map((link) => (
              <li key={`${section.id}-${link.label}`}>
                {link.action === "notifications" ? (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                    className="site-account-menu__item site-account-menu__item--row site-account-menu__item--with-icon"
                    aria-expanded={notifExpanded}
                    onClick={() => setNotifExpanded((v) => !v)}
                  >
                    <span className="site-account-menu__item--with-icon">
                      {link.icon ? (
                        <span className="site-account-menu__icon" aria-hidden="true">
                          {link.icon}
                        </span>
                      ) : null}
                      <span>{link.label}</span>
                    </span>
                      {unreadCount > 0 ? (
                        <span className="site-account-menu__badge-count" aria-label={`${unreadCount} unread`}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      ) : null}
                    </button>
                    {notifExpanded ? (
                      <AccountNotificationsInline
                        items={previewItems}
                        viewAll={notifViewAll}
                        totalCount={notifications.length}
                        onViewAll={() => setNotifViewAll(true)}
                        onChange={onNotificationChange}
                        onNavigate={onNavigate}
                      />
                    ) : null}
                  </>
                ) : link.action === "appearance" ? (
                  <div className="site-account-menu__appearance" role="group" aria-label="Appearance">
                    <span className="site-account-menu__appearance-label site-account-menu__item--with-icon">
                      {link.icon ? (
                        <span className="site-account-menu__icon" aria-hidden="true">
                          {link.icon}
                        </span>
                      ) : null}
                      {link.label}
                    </span>
                    <div className="site-account-menu__appearance-toggle" role="radiogroup" aria-label="Theme">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={theme === "light"}
                        className={
                          theme === "light"
                            ? "site-account-menu__theme-btn is-active"
                            : "site-account-menu__theme-btn"
                        }
                        aria-label="Light appearance"
                        title="Light"
                        onClick={() => setTheme("light")}
                      >
                        <SunIcon />
                      </button>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={theme === "dark"}
                        className={
                          theme === "dark"
                            ? "site-account-menu__theme-btn is-active"
                            : "site-account-menu__theme-btn"
                        }
                        aria-label="Dark appearance"
                        title="Dark"
                        onClick={() => setTheme("dark")}
                      >
                        <MoonIcon />
                      </button>
                    </div>
                  </div>
                ) : link.action === "logout" ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="site-account-menu__item site-account-menu__item--with-icon"
                    onClick={() => onAction(link)}
                  >
                    {link.icon ? (
                      <span className="site-account-menu__icon" aria-hidden="true">
                        {link.icon}
                      </span>
                    ) : null}
                    {link.label}
                  </button>
                ) : (
                  <Link
                    role="menuitem"
                    className="site-account-menu__item site-account-menu__item--with-icon"
                    to={link.to}
                    onClick={() => {
                      onAction(link);
                      onNavigate();
                    }}
                  >
                    {link.icon ? (
                      <span className="site-account-menu__icon" aria-hidden="true">
                        {link.icon}
                      </span>
                    ) : null}
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {isLoggedIn && activeRole === "buyer" ? (
        <div className="site-account-menu__section">
          <p className="site-account-menu__section-title">Register another role</p>
          <ul className="site-account-menu__list">
            {BECOME_ROLE_OPTIONS.map((opt) => {
              const intent = new URL(opt.to, "http://local").searchParams.get("intent") as WorkspaceRoleId | null;
              return (
                <li key={opt.label}>
                  <Link
                    role="menuitem"
                    className="site-account-menu__item"
                    to={opt.to}
                    onClick={() => {
                      if (intent) onBecomeRole(intent);
                      onNavigate();
                    }}
                  >
                    {opt.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AccountNotificationsInline({
  items,
  viewAll,
  totalCount,
  onViewAll,
  onChange,
  onNavigate,
}: {
  items: readonly CxNotification[];
  viewAll: boolean;
  totalCount: number;
  onViewAll: () => void;
  onChange: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="site-account-menu__notif-preview" role="region" aria-label="Notification preview">
      {items.length === 0 ? (
        <p className="site-account-menu__notif-empty" role="status">
          No notifications yet.
        </p>
      ) : (
        <ul className="site-account-menu__notif-list">
          {items.map((item) => (
            <li
              key={item.id}
              className={`site-account-menu__notif-item${item.read ? "" : " is-unread"}`}
            >
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              {item.href ? (
                <Link
                  to={item.href}
                  className="site-account-menu__notif-link"
                  onClick={() => {
                    markNotificationRead(item.id);
                    onChange();
                    onNavigate();
                  }}
                >
                  Open
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className="site-account-menu__notif-foot">
        <Link
          to="/notifications"
          className="site-account-menu__notif-view-all"
          onClick={onNavigate}
        >
          View all
        </Link>
        {!viewAll && totalCount > 3 ? (
          <button type="button" className="site-account-menu__notif-view-all" onClick={onViewAll}>
            Show more
          </button>
        ) : null}
        <button
          type="button"
          className="site-account-menu__notif-mark"
          onClick={() => {
            markAllNotificationsRead();
            onChange();
          }}
        >
          Mark all read
        </button>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A7.5 7.5 0 0 1 9.5 4 7.5 7.5 0 1 0 20 14.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PageSkeleton({ path }: { path: string }) {
  if (path.startsWith("/furniture")) {
    return (
      <div className="site-skeleton cx-skeleton-category" role="status" aria-live="polite" aria-label="Loading category">
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
      <div className="site-skeleton cx-skeleton-planner" role="status" aria-live="polite" aria-label="Loading planner">
        <div className="site-skeleton__hero" />
        <div className="cx-skeleton-card__line" />
        <div className="cx-skeleton-card__line" />
      </div>
    );
  }
  if (path.startsWith("/compare")) {
    return (
      <div className="site-skeleton cx-skeleton-compare" role="status" aria-live="polite" aria-label="Loading compare">
        <div className="site-skeleton__hero" />
        <div className="cx-skeleton-card__line" />
        <div className="cx-skeleton-card__line" />
      </div>
    );
  }
  if (path.startsWith("/products/")) {
    return (
      <div className="site-skeleton cx-skeleton-gallery" role="status" aria-live="polite" aria-label="Loading product">
        <div className="cx-skeleton-gallery__stage" />
        <div className="cx-skeleton-card__line" />
        <div className="cx-skeleton-card__line cx-skeleton-card__line--short" />
      </div>
    );
  }
  return (
    <div className="site-skeleton" role="status" aria-live="polite" aria-label="Loading page">
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
      { label: "My projects", to: "/my-projects" },
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
      className={`site-search${isMobile ? " site-search--drawer" : ""} cx-motion-fade site-search--bar`}
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
            placeholder="Search products…"
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
