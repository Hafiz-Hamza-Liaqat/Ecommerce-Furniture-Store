import type { PlatformError, Result } from "@afh/shared-kernel";

export type EntityNoteKind = "note" | "comment";

export type EntityNote = {
  readonly id: string;
  readonly companyId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly kind: EntityNoteKind;
  readonly body: string;
  readonly createdByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type EntityNoteRepository = {
  findById(key: {
    readonly companyId: string;
    readonly id: string;
  }): Promise<Result<EntityNote | null, PlatformError>>;
  save(note: EntityNote): Promise<Result<void, PlatformError>>;
  remove(key: {
    readonly companyId: string;
    readonly id: string;
  }): Promise<Result<void, PlatformError>>;
  listByEntity(
    companyId: string,
    entityType: string,
    entityId: string,
  ): Promise<Result<readonly EntityNote[], PlatformError>>;
};

export type EntityAttachmentLink = {
  readonly id: string;
  readonly companyId: string;
  readonly assetId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly purpose: string;
  readonly attachedAt: string;
  readonly attachedByUserId: string | null;
};

export type EntityAttachmentLinkRepository = {
  findById(key: {
    readonly companyId: string;
    readonly id: string;
  }): Promise<Result<EntityAttachmentLink | null, PlatformError>>;
  save(link: EntityAttachmentLink): Promise<Result<void, PlatformError>>;
  remove(key: {
    readonly companyId: string;
    readonly id: string;
  }): Promise<Result<void, PlatformError>>;
  listByEntity(
    companyId: string,
    entityType: string,
    entityId: string,
  ): Promise<Result<readonly EntityAttachmentLink[], PlatformError>>;
};

export type CreateEntityNotePayload = {
  readonly companyId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly body: string;
  readonly kind?: EntityNoteKind;
};

export type DeleteEntityNotePayload = {
  readonly companyId: string;
  readonly id: string;
};

export type ListEntityNotesPayload = {
  readonly companyId: string;
  readonly entityType: string;
  readonly entityId: string;
};

export type AttachEntityAssetPayload = {
  readonly companyId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly assetId: string;
  readonly purpose: string;
};

export type DetachEntityAssetPayload = {
  readonly companyId: string;
  readonly id: string;
};

export type ListEntityAttachmentsPayload = {
  readonly companyId: string;
  readonly entityType: string;
  readonly entityId: string;
};

export type CollaborationParentBinding = {
  readonly parentResourceType: string;
  readonly parentReadAction: string;
  readonly parentUpdateAction: string;
};

export type CollaborationEntityBinding = {
  readonly allowedEntityType: string;
  readonly parent: CollaborationParentBinding;
};

export type AssetExistenceChecker = {
  findById(key: {
    companyId: string;
    id: string;
  }): Promise<
    Result<{ id: string; companyId: string } | null, PlatformError>
  >;
};
