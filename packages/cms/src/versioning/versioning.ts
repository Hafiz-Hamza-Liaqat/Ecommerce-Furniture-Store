/**
 * Content versioning contracts — no publishing engine.
 */

export type ContentRevisionMetadata = {
  readonly revisionId: string;
  readonly contentId: string;
  readonly companyId: string | null;
  readonly revisionNumber: number;
  readonly title: string | null;
  readonly bodyRef: string | null;
  readonly createdByUserId: string | null;
  readonly createdAt: string;
  readonly changeSummary: string | null;
};

export type DraftReference = {
  readonly contentId: string;
  readonly revisionId: string;
  readonly companyId: string | null;
};

export type PublishedReference = {
  readonly contentId: string;
  readonly revisionId: string;
  readonly companyId: string | null;
  readonly publishedAt: string | null;
};

export type ArchivedReference = {
  readonly contentId: string;
  readonly revisionId: string | null;
  readonly companyId: string | null;
  readonly archivedAt: string | null;
};
