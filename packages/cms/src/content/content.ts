/**
 * Content models — status is metadata only. Workflow owns lifecycle.
 * No rendering or publishing engine.
 */

export type ContentKind =
  | "page"
  | "article"
  | "news"
  | "announcement"
  | "landing_page"
  | "static"
  | "policy"
  | "faq"
  | "knowledge_base"
  | "other";

export type ContentStatus =
  | "draft"
  | "in_review"
  | "published"
  | "archived"
  | "deleted";

export type Content = {
  readonly id: string;
  readonly companyId: string | null;
  readonly kind: ContentKind;
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  /** Opaque body / body storage ref — not rendered here */
  readonly bodyRef: string | null;
  readonly status: ContentStatus;
  readonly currentRevisionId: string | null;
  readonly publishedRevisionId: string | null;
  readonly authorUserId: string | null;
  readonly localeCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ContentReference = {
  readonly contentId: string;
  readonly companyId: string | null;
  readonly slug: string | null;
  readonly kind: ContentKind | null;
};

/** Typed aliases for clarity — same underlying Content shape */
export type Page = Content & { readonly kind: "page" };
export type Article = Content & { readonly kind: "article" };
export type News = Content & { readonly kind: "news" };
export type Announcement = Content & { readonly kind: "announcement" };
export type LandingPage = Content & { readonly kind: "landing_page" };
export type StaticContent = Content & { readonly kind: "static" };
export type PolicyDocument = Content & { readonly kind: "policy" };
export type Faq = Content & { readonly kind: "faq" };
export type KnowledgeBaseEntry = Content & { readonly kind: "knowledge_base" };
