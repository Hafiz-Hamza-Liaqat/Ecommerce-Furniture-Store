/**
 * SQL adapters for DAM domain repositories.
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
  AssetLabel,
  AssetMetadataEntry,
  AssetRepository,
  AssetTag,
  AssetVersion,
  AssetVersionRepository,
  Attachment,
  AttachmentRepository,
  Collection,
  CollectionEntry,
  CollectionRepository,
  DerivativeRepository,
  DigitalAsset,
  Document,
  DocumentRepository,
  Folder,
  FolderRepository,
  MediaDerivative,
  MetadataRepository,
} from "@afh/dam";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlDocumentRepository } from "../mapping/document-repository.js";

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

type CollectionEntryDoc = CollectionEntry & { readonly companyId: string };

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

export function createSqlAssetRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): AssetRepository {
  const docs = new SqlDocumentRepository<DigitalAsset>(
    client,
    "dam.asset",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    remove: (key) => docs.remove(key),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlAssetVersionRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): AssetVersionRepository {
  const docs = new SqlDocumentRepository<AssetVersion>(
    client,
    "dam.asset_version",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (version) => docs.save(version, version.assetId),
    listByAsset: (companyId, assetId, page) =>
      docs.listByParentScoped(companyId, assetId, page),
  };
}

export function createSqlFolderRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): FolderRepository {
  const docs = new SqlDocumentRepository<Folder>(client, "dam.folder", clock);
  const aggregateType = "dam.folder";
  return {
    findById: (key) => docs.findById(key),
    save: (folder) => docs.save(folder, folder.parentId),
    listChildren: async (
      companyId,
      parentId,
      page,
    ): Promise<Result<Page<Folder>, PlatformError>> => {
      if (parentId !== null) {
        return docs.listByParentScoped(companyId, parentId, page);
      }
      const bounds = pageBounds(page);
      const total = client.get<{ c: number }>(
        `SELECT COUNT(1) AS c FROM aggregate_documents
         WHERE company_id = ? AND aggregate_type = ? AND parent_id IS NULL`,
        [companyId, aggregateType],
      );
      const rows = client.all<AggRow>(
        `SELECT * FROM aggregate_documents
         WHERE company_id = ? AND aggregate_type = ? AND parent_id IS NULL
         ORDER BY created_at ASC
         LIMIT ? OFFSET ?`,
        [companyId, aggregateType, bounds.limit, bounds.offset],
      );
      const items = rows.map((r) => JSON.parse(r.payload_json) as Folder);
      return ok({
        items,
        totalCount: total?.c ?? items.length,
        page: bounds.page,
        pageSize: bounds.pageSize,
        nextCursor: null,
        hasMore: (total?.c ?? 0) > bounds.offset + items.length,
      });
    },
  };
}

export function createSqlCollectionRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): CollectionRepository {
  const docs = new SqlDocumentRepository<Collection>(
    client,
    "dam.collection",
    clock,
  );
  const entries = new SqlDocumentRepository<CollectionEntryDoc>(
    client,
    "dam.collection_entry",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveEntry: (entry) =>
      entries.save(
        { ...entry, companyId: entry.collectionId },
        entry.collectionId,
      ),
    listEntries: async (companyId, collectionId, page) => {
      void companyId;
      const listed = await entries.listByParentScoped(
        collectionId,
        collectionId,
        page,
      );
      if (!listed.ok) return listed;
      return ok({
        ...listed.value,
        items: listed.value.items.map((entry) => {
          const { companyId, ...rest } = entry;
          void companyId;
          return rest;
        }),
      });
    },
  };
}

export function createSqlAttachmentRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): AttachmentRepository {
  const docs = new SqlDocumentRepository<Attachment>(
    client,
    "dam.attachment",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (attachment) =>
      docs.save(
        attachment,
        `${attachment.entity.entityType}:${attachment.entity.entityId}`,
      ),
    listByEntity: (companyId, entityType, entityId) =>
      docs.listByParent(companyId, `${entityType}:${entityId}`),
  };
}

export function createSqlDocumentRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): DocumentRepository {
  const docs = new SqlDocumentRepository<Document>(
    client,
    "dam.document",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
  };
}

export function createSqlDerivativeRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): DerivativeRepository {
  const docs = new SqlDocumentRepository<MediaDerivative>(
    client,
    "dam.derivative",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (derivative) => docs.save(derivative, derivative.assetId),
    listByAsset: (companyId, assetId) =>
      docs.listByParent(companyId, assetId),
  };
}

export function createSqlMetadataRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): MetadataRepository {
  const entries = new SqlDocumentRepository<AssetMetadataEntry>(
    client,
    "dam.metadata_entry",
    clock,
  );
  const tags = new SqlDocumentRepository<AssetTag>(
    client,
    "dam.asset_tag",
    clock,
  );
  const labels = new SqlDocumentRepository<AssetLabel>(
    client,
    "dam.asset_label",
    clock,
  );
  return {
    saveEntry: (entry) => entries.save(entry, entry.assetId),
    saveTag: (tag) => tags.save(tag, tag.assetId),
    saveLabel: (label) => labels.save(label, label.assetId),
    listByAsset: async (companyId, assetId) => {
      const [entryList, tagList, labelList] = await Promise.all([
        entries.listByParent(companyId, assetId),
        tags.listByParent(companyId, assetId),
        labels.listByParent(companyId, assetId),
      ]);
      if (!entryList.ok) return entryList;
      if (!tagList.ok) return tagList;
      if (!labelList.ok) return labelList;
      return ok({
        entries: entryList.value,
        tags: tagList.value,
        labels: labelList.value,
      });
    },
  };
}
