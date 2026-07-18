/**
 * SQL adapters for shared collaboration repositories (RC7.4).
 * Types are structural mirrors of @afh/application collaboration contracts
 * so persistence-sql does not depend on the application package.
 */

import type {
  Clock,
  PlatformError,
  Result,
} from "@afh/shared-kernel";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlDocumentRepository } from "../mapping/document-repository.js";

export type SqlEntityNote = {
  readonly id: string;
  readonly companyId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly body: string;
  readonly createdByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SqlEntityAttachmentLink = {
  readonly id: string;
  readonly companyId: string;
  readonly assetId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly purpose: string;
  readonly attachedAt: string;
  readonly attachedByUserId: string | null;
};

export type SqlEntityNoteRepository = {
  findById(key: {
    companyId: string;
    id: string;
  }): Promise<Result<SqlEntityNote | null, PlatformError>>;
  save(note: SqlEntityNote): Promise<Result<void, PlatformError>>;
  remove(key: {
    companyId: string;
    id: string;
  }): Promise<Result<void, PlatformError>>;
  listByEntity(
    companyId: string,
    entityType: string,
    entityId: string,
  ): Promise<Result<readonly SqlEntityNote[], PlatformError>>;
};

export type SqlEntityAttachmentLinkRepository = {
  findById(key: {
    companyId: string;
    id: string;
  }): Promise<Result<SqlEntityAttachmentLink | null, PlatformError>>;
  save(link: SqlEntityAttachmentLink): Promise<Result<void, PlatformError>>;
  remove(key: {
    companyId: string;
    id: string;
  }): Promise<Result<void, PlatformError>>;
  listByEntity(
    companyId: string,
    entityType: string,
    entityId: string,
  ): Promise<Result<readonly SqlEntityAttachmentLink[], PlatformError>>;
};

function entityParentId(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export function createSqlEntityNoteRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SqlEntityNoteRepository {
  const docs = new SqlDocumentRepository<SqlEntityNote>(
    client,
    "collaboration.note",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (note) =>
      docs.save(note, entityParentId(note.entityType, note.entityId)),
    remove: (key) => docs.remove(key),
    listByEntity: (companyId, entityType, entityId) =>
      docs.listByParent(companyId, entityParentId(entityType, entityId)),
  };
}

export function createSqlEntityAttachmentLinkRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): SqlEntityAttachmentLinkRepository {
  const docs = new SqlDocumentRepository<SqlEntityAttachmentLink>(
    client,
    "collaboration.attachment",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (link) =>
      docs.save(link, entityParentId(link.entityType, link.entityId)),
    remove: (key) => docs.remove(key),
    listByEntity: (companyId, entityType, entityId) =>
      docs.listByParent(companyId, entityParentId(entityType, entityId)),
  };
}
