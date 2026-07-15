/**
 * Categories, tags, taxonomy — no indexing engine.
 */

export type ContentCategory = {
  readonly id: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly parentId: string | null;
};

export type ContentTag = {
  readonly id: string;
  readonly companyId: string | null;
  readonly tag: string;
};

export type Taxonomy = {
  readonly id: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
};

export type Topic = {
  readonly id: string;
  readonly companyId: string | null;
  readonly taxonomyId: string | null;
  readonly code: string;
  readonly name: string;
};

export type ContentClassification = {
  readonly contentId: string;
  readonly companyId: string | null;
  readonly categoryIds: readonly string[];
  readonly tagIds: readonly string[];
  readonly topicIds: readonly string[];
};
