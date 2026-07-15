/**
 * CMS repository interfaces only — no persistence implementations.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type { Content } from "../content/content.js";
import type { Menu, MenuItem } from "../navigation/navigation.js";
import type {
  ContentCategory,
  ContentTag,
  Taxonomy,
} from "../taxonomy/taxonomy.js";
import type { ContentRevisionMetadata } from "../versioning/versioning.js";
import type { SeoMetadata } from "../seo/seo.js";

export type CompanyScopedId = {
  readonly companyId: string | null;
  readonly id: string;
};

export interface ContentRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Content | null, PlatformError>>;
  findBySlug(
    companyId: string | null,
    slug: string,
  ): Promise<Result<Content | null, PlatformError>>;
  save(content: Content): Promise<Result<void, PlatformError>>;
  list(
    companyId: string | null,
    page?: PageRequest,
  ): Promise<Result<Page<Content>, PlatformError>>;
}

export interface MenuRepository {
  findById(key: CompanyScopedId): Promise<Result<Menu | null, PlatformError>>;
  save(menu: Menu): Promise<Result<void, PlatformError>>;
  saveItem(item: MenuItem): Promise<Result<void, PlatformError>>;
  listItems(
    companyId: string | null,
    menuId: string,
  ): Promise<Result<readonly MenuItem[], PlatformError>>;
}

export interface CategoryRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<ContentCategory | null, PlatformError>>;
  save(category: ContentCategory): Promise<Result<void, PlatformError>>;
  saveTag(tag: ContentTag): Promise<Result<void, PlatformError>>;
  saveTaxonomy(taxonomy: Taxonomy): Promise<Result<void, PlatformError>>;
}

export interface ContentRevisionRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<ContentRevisionMetadata | null, PlatformError>>;
  save(
    revision: ContentRevisionMetadata,
  ): Promise<Result<void, PlatformError>>;
  listByContent(
    companyId: string | null,
    contentId: string,
    page?: PageRequest,
  ): Promise<Result<Page<ContentRevisionMetadata>, PlatformError>>;
}

export interface SeoMetadataRepository {
  findByContentId(
    companyId: string | null,
    contentId: string,
  ): Promise<Result<SeoMetadata | null, PlatformError>>;
  save(seo: SeoMetadata): Promise<Result<void, PlatformError>>;
}
