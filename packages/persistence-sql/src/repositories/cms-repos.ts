/**
 * SQL adapters for CMS domain repositories.
 */

import {
  isOffsetPagination,
  ok,
  type Clock,
  type Page,
  type PageRequest,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type {
  CategoryRepository,
  Content,
  ContentCategory,
  ContentRepository,
  ContentRevisionMetadata,
  ContentRevisionRepository,
  ContentTag,
  Menu,
  MenuItem,
  MenuRepository,
  SeoMetadata,
  SeoMetadataRepository,
  Taxonomy,
} from "@afh/cms";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlNullableCompanyDocumentRepository } from "../mapping/document-repository.js";

type RevisionDoc = ContentRevisionMetadata & { readonly id: string };

type AggRow = {
  id: string;
  company_id: string | null;
  aggregate_type: string;
  parent_id: string | null;
  version: number;
  payload_json: string;
  created_at: string;
  updated_at: string;
};

function pageBounds(page?: PageRequest): {
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
} {
  if (page && isOffsetPagination(page)) {
    const pageSize = Math.max(1, page.pageSize);
    const pageNum = Math.max(1, page.page);
    return {
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      page: pageNum,
      pageSize,
    };
  }
  return { limit: 100, offset: 0, page: 1, pageSize: 100 };
}

function toRevisionDoc(revision: ContentRevisionMetadata): RevisionDoc {
  return { ...revision, id: revision.revisionId };
}

function fromRevisionDoc(
  doc: RevisionDoc | null,
): ContentRevisionMetadata | null {
  if (!doc) return null;
  const { id, ...rest } = doc;
  void id;
  return rest;
}

export function createSqlContentRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ContentRepository {
  const docs = new SqlNullableCompanyDocumentRepository<Content>(
    client,
    "cms.content",
    clock,
  );
  return {
    findById: (key) => docs.findById(key.companyId, key.id),
    findBySlug: (companyId, slug) => docs.findBySlug(companyId, slug),
    save: (content) => docs.save(content),
    list: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlMenuRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): MenuRepository {
  const menus = new SqlNullableCompanyDocumentRepository<Menu>(
    client,
    "cms.menu",
    clock,
  );
  const itemAgg = "cms.menu_item";
  return {
    findById: (key) => menus.findById(key.companyId, key.id),
    save: (menu) => menus.save(menu),
    saveItem: async (item) => {
      // Store under nullable-company helper; parent linkage via custom parent_id column.
      const docId = `${itemAgg}:${item.companyId ?? "_"}:${item.id}`;
      const existing = client.get<AggRow>(
        "SELECT * FROM aggregate_documents WHERE id = ?",
        [docId],
      );
      const now = clock.now().toISOString();
      const payload = JSON.stringify(item);
      if (existing) {
        client.run(
          `UPDATE aggregate_documents
           SET payload_json = ?, parent_id = ?, updated_at = ?, version = version + 1
           WHERE id = ?`,
          [payload, item.menuId, now, docId],
        );
      } else {
        client.run(
          `INSERT INTO aggregate_documents
            (id, company_id, aggregate_type, parent_id, version, payload_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
          [
            docId,
            item.companyId,
            itemAgg,
            item.menuId,
            payload,
            now,
            now,
          ],
        );
      }
      return ok(undefined);
    },
    listItems: async (companyId, menuId) => {
      const rows = client.all<AggRow>(
        `SELECT * FROM aggregate_documents
         WHERE aggregate_type = ? AND company_id IS ? AND parent_id = ?
         ORDER BY created_at ASC`,
        [itemAgg, companyId, menuId],
      );
      return ok(rows.map((r) => JSON.parse(r.payload_json) as MenuItem));
    },
  };
}

export function createSqlCategoryRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): CategoryRepository {
  const categories = new SqlNullableCompanyDocumentRepository<ContentCategory>(
    client,
    "cms.category",
    clock,
  );
  const tags = new SqlNullableCompanyDocumentRepository<ContentTag>(
    client,
    "cms.tag",
    clock,
  );
  const taxonomies = new SqlNullableCompanyDocumentRepository<Taxonomy>(
    client,
    "cms.taxonomy",
    clock,
  );
  return {
    findById: (key) => categories.findById(key.companyId, key.id),
    save: (category) => categories.save(category),
    saveTag: (tag) => tags.save(tag),
    saveTaxonomy: (taxonomy) => taxonomies.save(taxonomy),
  };
}

export function createSqlContentRevisionRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ContentRevisionRepository {
  const docs = new SqlNullableCompanyDocumentRepository<RevisionDoc>(
    client,
    "cms.content_revision",
    clock,
  );
  const aggregateType = "cms.content_revision";
  return {
    findById: async (key) => {
      const found = await docs.findById(key.companyId, key.id);
      if (!found.ok) return found;
      return ok(fromRevisionDoc(found.value));
    },
    save: (revision) => docs.save(toRevisionDoc(revision)),
    listByContent: async (
      companyId,
      contentId,
      page,
    ): Promise<Result<Page<ContentRevisionMetadata>, PlatformError>> => {
      const bounds = pageBounds(page);
      const rows = client.all<AggRow>(
        `SELECT * FROM aggregate_documents
         WHERE aggregate_type = ? AND company_id IS ?
         ORDER BY created_at ASC`,
        [aggregateType, companyId],
      );
      const all = rows
        .map((r) => JSON.parse(r.payload_json) as RevisionDoc)
        .filter((r) => r.contentId === contentId)
        .map((r) => fromRevisionDoc(r))
        .filter((r): r is ContentRevisionMetadata => r !== null);
      const slice = all.slice(bounds.offset, bounds.offset + bounds.limit);
      return ok({
        items: slice,
        totalCount: all.length,
        page: bounds.page,
        pageSize: bounds.pageSize,
        nextCursor: null,
        hasMore: bounds.offset + slice.length < all.length,
      });
    },
  };
}

export function createSqlSeoMetadataRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SeoMetadataRepository {
  const docs = new SqlNullableCompanyDocumentRepository<SeoMetadata>(
    client,
    "cms.seo_metadata",
    clock,
  );
  const aggregateType = "cms.seo_metadata";
  return {
    findByContentId: async (companyId, contentId) => {
      const rows = client.all<AggRow>(
        `SELECT * FROM aggregate_documents
         WHERE aggregate_type = ? AND company_id IS ?`,
        [aggregateType, companyId],
      );
      for (const row of rows) {
        const entity = JSON.parse(row.payload_json) as SeoMetadata;
        if (entity.contentId === contentId) return ok(entity);
      }
      return ok(null);
    },
    save: (seo) => docs.save(seo),
  };
}
