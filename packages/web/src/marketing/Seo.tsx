import { useEffect } from "react";
import { BRAND } from "./data/content";

export type SeoProps = {
  readonly title: string;
  readonly description: string;
  readonly path?: string;
  readonly image?: string;
  readonly type?: "website" | "article" | "product";
};

const SITE = "https://artisanfurnish.example";

export function Seo({
  title,
  description,
  path = "/",
  image,
  type = "website",
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
      el.href = `${SITE}${path}`;
    };

    meta("description", description);
    meta("og:title", fullTitle, true);
    meta("og:description", description, true);
    meta("og:type", type, true);
    meta("og:url", `${SITE}${path}`, true);
    if (image) meta("og:image", image, true);
    meta("twitter:card", "summary_large_image");
    meta("twitter:title", fullTitle);
    meta("twitter:description", description);
    if (image) meta("twitter:image", image);
    linkCanonical();

    let jsonLd = document.getElementById("afh-jsonld");
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "afh-jsonld";
      (jsonLd as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BRAND.name,
      url: SITE,
      description: BRAND.tagline,
      email: BRAND.email,
      telephone: BRAND.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: BRAND.address,
      },
    });
  }, [title, description, path, image, type]);

  return null;
}
