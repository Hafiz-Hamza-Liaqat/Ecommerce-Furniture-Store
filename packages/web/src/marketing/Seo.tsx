import { useEffect } from "react";
import { BRAND } from "./data/content";

export type SeoProps = {
  readonly title: string;
  readonly description: string;
  readonly path?: string;
  readonly image?: string;
  readonly type?: "website" | "article" | "product";
  /** Optional breadcrumb trail for BreadcrumbList JSON-LD (customer pages). */
  readonly breadcrumbs?: readonly { readonly name: string; readonly path: string }[];
  /** When true, keep Organization JSON-LD only (default). Set false when page injects its own primary schema. */
  readonly organizationSchema?: boolean;
  /** Extra JSON-LD graph nodes merged with Organization / BreadcrumbList. */
  readonly extraJsonLd?: readonly Record<string, unknown>[];
};

export const SEO_SITE = "https://artisanfurnish.example";

export function buildBreadcrumbJsonLd(
  crumbs: readonly { readonly name: string; readonly path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SEO_SITE}${c.path}`,
    })),
  };
}

export function Seo({
  title,
  description,
  path = "/",
  image,
  type = "website",
  breadcrumbs,
  organizationSchema = true,
  extraJsonLd = [],
}: SeoProps) {
  useEffect(() => {
    const fullTitle = `${title} · ${BRAND.name}`;
    document.title = fullTitle;

    const meta = (name: string, content: string, property = false) => {
      const attr = property ? "property" : "name";
      let el = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${name}"]`,
      );
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    const linkCanonical = () => {
      let el = document.head.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]',
      );
      if (!el) {
        el = document.createElement("link");
        el.rel = "canonical";
        document.head.appendChild(el);
      }
      el.href = `${SEO_SITE}${path}`;
    };

    meta("description", description);
    meta("og:title", fullTitle, true);
    meta("og:description", description, true);
    meta("og:type", type, true);
    meta("og:url", `${SEO_SITE}${path}`, true);
    meta("og:site_name", BRAND.name, true);
    if (image) meta("og:image", image, true);
    meta("twitter:card", "summary_large_image");
    meta("twitter:title", fullTitle);
    meta("twitter:description", description);
    if (image) meta("twitter:image", image);
    linkCanonical();

    const graph: Record<string, unknown>[] = [];
    if (organizationSchema) {
      graph.push({
        "@type": "Organization",
        name: BRAND.name,
        url: SEO_SITE,
        description: BRAND.tagline,
        email: BRAND.email,
        telephone: BRAND.phone,
        address: {
          "@type": "PostalAddress",
          streetAddress: BRAND.address,
        },
      });
    }
    if (breadcrumbs && breadcrumbs.length > 0) {
      graph.push(buildBreadcrumbJsonLd(breadcrumbs));
    }
    for (const node of extraJsonLd) {
      graph.push(node);
    }

    let jsonLd = document.getElementById("afh-jsonld");
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "afh-jsonld";
      (jsonLd as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": graph,
    });
  }, [title, description, path, image, type, breadcrumbs, organizationSchema, extraJsonLd]);

  return null;
}
