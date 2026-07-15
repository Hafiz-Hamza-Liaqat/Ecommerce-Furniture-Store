/**
 * SEO metadata models — no SEO generation.
 */

export type SeoMetadata = {
  readonly id: string;
  readonly contentId: string;
  readonly companyId: string | null;
  readonly metaTitle: string | null;
  readonly metaDescription: string | null;
  readonly canonicalUrl: string | null;
  readonly openGraphTitle: string | null;
  readonly openGraphDescription: string | null;
  readonly openGraphImageAssetId: string | null;
  /** Opaque structured-data / schema.org payload ref */
  readonly structuredDataRef: string | null;
};
