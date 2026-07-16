import type { ReactNode } from "react";
import { Link } from "react-router-dom";
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
import { InquiryForm } from "../InquiryForm";

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
          <img className="site-prose__image" src={page.image} alt="" loading="lazy" />
        ) : null}
        {page.body.map((para) => (
          <p key={para.slice(0, 24)}>{para}</p>
        ))}
        {children}
      </div>
    </>
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
            <img src={step.image} alt="" loading="lazy" />
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
export function BlogPage() {
  return <ContentLayout page={mustPage("blog")} path="/blog" />;
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
      <InquiryForm intent="General contact" />
      <p>
        <Link to="/quote">Request a quote</Link> · <Link to="/demo">Book a demo</Link>
      </p>
    </ContentLayout>
  );
}
export function QuotePage() {
  return (
    <ContentLayout page={mustPage("quote")} path="/quote">
      <InquiryForm intent="Request quotation" />
    </ContentLayout>
  );
}
export function DemoPage() {
  return (
    <ContentLayout page={mustPage("demo")} path="/demo">
      <InquiryForm intent="Book demo" />
      <img src={IMG.lounge} alt="" loading="lazy" className="site-prose__image" />
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
