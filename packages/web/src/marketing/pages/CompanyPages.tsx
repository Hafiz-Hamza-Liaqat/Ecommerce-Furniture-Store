import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EnterpriseError } from "../../components/EnterpriseError";
import { Seo } from "../Seo";
import {
  FAQ,
  IMG,
  LEADERSHIP,
  NEWS,
  PROCESS,
  SITE_PAGES,
  type SitePageContent,
} from "../data/content";
import { getCatalogueProduct } from "../data/catalogue";
import { InquiryForm } from "../InquiryForm";
import { BRAND, whatsappUrl } from "../../brand";

function mustPage(key: keyof typeof SITE_PAGES): SitePageContent {
  const page = SITE_PAGES[key];
  if (!page) {
    throw new Error(`Missing site page: ${key}`);
  }
  return page;
}

function ContentLayout({
  page,
  path,
  children,
}: {
  page: SitePageContent;
  path: string;
  children?: ReactNode;
}) {
  return (
    <>
      <Seo
        title={page.title}
        description={page.description}
        path={path}
        {...(page.image ? { image: page.image } : {})}
      />
      <header className="site-page-hero">
        <p className="site-eyebrow">{page.eyebrow}</p>
        <h1>{page.title}</h1>
        <p>{page.description}</p>
      </header>
      <div className="site-section site-prose">
        {page.image ? (
          <img className="site-prose__image" src={page.image} alt={page.title} loading="lazy" />
        ) : null}
        {page.body.map((para) => (
          <p key={para.slice(0, 24)}>{para}</p>
        ))}
        {children}
        <CompanyExploreNav />
      </div>
    </>
  );
}

/** Bottom-of-company navigation — does not replace the site footer. */
function CompanyExploreNav() {
  return (
    <nav className="afh-company-explore" aria-label="Explore company">
      <h2>Explore</h2>
      <ul>
        <li>
          <Link to="/about">About</Link>
        </li>
        <li>
          <Link to="/story">Our story</Link>
        </li>
        <li>
          <Link to="/leadership">Leadership</Link>
        </li>
        <li>
          <Link to="/news">News</Link>
        </li>
        <li>
          <Link to="/blog">Journal / Blog</Link>
        </li>
        <li>
          <Link to="/careers">Careers</Link>
        </li>
        <li>
          <Link to="/contact">Contact</Link>
        </li>
      </ul>
    </nav>
  );
}

export function AboutPage() {
  return <ContentLayout page={mustPage("about")} path="/about" />;
}
export function StoryPage() {
  return <ContentLayout page={mustPage("story")} path="/story" />;
}
export function LeadershipPage() {
  return (
    <ContentLayout page={mustPage("leadership")} path="/leadership">
      <div className="site-leadership">
        {LEADERSHIP.map((p) => (
          <article key={p.name}>
            <h2>{p.name}</h2>
            <p className="site-product__meta">{p.role}</p>
            <p>{p.bio}</p>
          </article>
        ))}
      </div>
    </ContentLayout>
  );
}
export function ManufacturingPage() {
  return (
    <ContentLayout page={mustPage("manufacturing")} path="/manufacturing">
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
      <div className="site-timeline-anim" aria-hidden="true">
        <div className="site-timeline-anim__line" />
      </div>
    </ContentLayout>
  );
}
export function FactoryPage() {
  return <ContentLayout page={mustPage("factory")} path="/factory" />;
}
export function TechnologyPage() {
  return <ContentLayout page={mustPage("technology")} path="/technology" />;
}
export function SustainabilityPage() {
  return <ContentLayout page={mustPage("sustainability")} path="/sustainability" />;
}
export function QualityPage() {
  return <ContentLayout page={mustPage("quality")} path="/quality" />;
}
export function CertificationsPage() {
  return <ContentLayout page={mustPage("certifications")} path="/certifications" />;
}
export function CareersPage() {
  return <ContentLayout page={mustPage("careers")} path="/careers" />;
}
export function PartnersPage() {
  return <ContentLayout page={mustPage("partners")} path="/partners" />;
}
export function DistributorsPage() {
  return <ContentLayout page={mustPage("distributors")} path="/distributors" />;
}
export function NewsPage() {
  return (
    <ContentLayout page={mustPage("news")} path="/news">
      <div className="site-news">
        {NEWS.map((n) => (
          <article key={n.id}>
            <time>{n.date}</time>
            <h2>{n.title}</h2>
            <p>{n.summary}</p>
          </article>
        ))}
      </div>
    </ContentLayout>
  );
}
export function EventsPage() {
  return <ContentLayout page={mustPage("events")} path="/events" />;
}
export function PrivacyPage() {
  return <ContentLayout page={mustPage("privacy")} path="/privacy" />;
}
export function TermsPage() {
  return <ContentLayout page={mustPage("terms")} path="/terms" />;
}
export function FaqPage() {
  return (
    <ContentLayout page={mustPage("faq")} path="/faq">
      <div className="site-faq">
        {FAQ.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </ContentLayout>
  );
}
export function ContactPage() {
  return (
    <ContentLayout page={mustPage("contact")} path="/contact">
      <div className="contact-details">
        <p>
          <strong>{BRAND.name}</strong>
        </p>
        <p>
          Phone:{" "}
          <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`}>{BRAND.phone}</a>
          {" · "}
          <a href={`tel:${BRAND.phoneSecondary.replace(/\s/g, "")}`}>{BRAND.phoneSecondary}</a>
        </p>
        <p>
          WhatsApp:{" "}
          <a href={whatsappUrl()}>{BRAND.whatsappDisplay}</a>
        </p>
        <p>
          Email: <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
        </p>
      </div>
      <div className="contact-map-placeholder" aria-label="Showroom map — coming soon">
        <p>{BRAND.showroomNotice}</p>
        <p className="type-caption">
          A Google Maps embed and showroom address will appear here before production launch.
        </p>
      </div>
      <InquiryForm intent="General contact" />
      <p>
        <Link to="/quote">Request a quote</Link> · <Link to="/demo">Book a demo</Link>
      </p>
    </ContentLayout>
  );
}
export function QuotePage() {
  const [params] = useSearchParams();
  const from = params.get("from");
  const linesParam = params.get("lines") ?? "";
  const total = params.get("total");
  const lineIds = linesParam
    .split(",")
    .map((part) => part.split(":")[0])
    .filter((id): id is string => Boolean(id));
  const lineSummary = lineIds
    .map((id) => {
      const p = getCatalogueProduct(id);
      const qtyPart = linesParam.split(",").find((x) => x.startsWith(`${id}:`));
      const qty = Number(qtyPart?.split(":")[1] ?? "1");
      return p ? `• ${p.name} × ${qty} (${p.priceFrom})` : null;
    })
    .filter(Boolean)
    .join("\n");
  const seededMessage =
    from === "consultant" || from === "planner"
      ? [
          from === "consultant" ? "Quotation request from AI Furniture Consultant." : "Quotation request from Budget Planner.",
          lineSummary || undefined,
          total ? `Estimated catalogue subtotal: PKR ${Number(total).toLocaleString("en-PK")}` : undefined,
          "Please confirm formal pricing and lead times.",
        ]
          .filter(Boolean)
          .join("\n")
      : undefined;

  return (
    <ContentLayout page={mustPage("quote")} path="/quote">
      {from === "consultant" && lineSummary ? (
        <aside className="cx-quote-seed" aria-label="Consultant selection">
          <h2>From your consultation</h2>
          <pre>{lineSummary}</pre>
          <p>Catalogue estimates only — Sales confirms the formal quotation.</p>
        </aside>
      ) : null}
      <InquiryForm
        intent="Request quotation"
        meta={{ from, lines: linesParam, total }}
        {...(seededMessage ? { defaultMessage: seededMessage } : {})}
      />
    </ContentLayout>
  );
}
export function DemoPage() {
  return (
    <ContentLayout page={mustPage("demo")} path="/demo">
      <InquiryForm intent="Book demo" />
      <img src={IMG.lounge} alt="Rao Liaqat Furniture showroom lounge" loading="lazy" className="site-prose__image" />
    </ContentLayout>
  );
}

export function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" description="The requested page could not be found." path="/404" />
      <EnterpriseError kind="not-found" />
    </>
  );
}
