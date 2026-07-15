/**
 * DAM repository interfaces only — no persistence implementations.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type { DigitalAsset } from "../asset/asset.js";
import type { AssetVersion } from "../version/version.js";
import type {
  Collection,
  CollectionEntry,
  Folder,
} from "../folder/folder.js";
import type { Attachment } from "../attachment/attachment.js";
import type { Document } from "../document/document.js";
import type { MediaDerivative } from "../derivative/derivative.js";
import type {
  AssetLabel,
  AssetMetadataEntry,
  AssetTag,
} from "../metadata/metadata.js";

export type CompanyScopedId = {
  readonly companyId: string;
  readonly id: string;
};

export interface AssetRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<DigitalAsset | null, PlatformError>>;
  save(asset: DigitalAsset): Promise<Result<void, PlatformError>>;
  remove(key: CompanyScopedId): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<DigitalAsset>, PlatformError>>;
}

export interface AssetVersionRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<AssetVersion | null, PlatformError>>;
  /** Versions are immutable — save creates a new version only */
  save(version: AssetVersion): Promise<Result<void, PlatformError>>;
  listByAsset(
    companyId: string,
    assetId: string,
    page?: PageRequest,
  ): Promise<Result<Page<AssetVersion>, PlatformError>>;
}

export interface FolderRepository {
  findById(key: CompanyScopedId): Promise<Result<Folder | null, PlatformError>>;
  save(folder: Folder): Promise<Result<void, PlatformError>>;
  listChildren(
    companyId: string,
    parentId: string | null,
    page?: PageRequest,
  ): Promise<Result<Page<Folder>, PlatformError>>;
}

export interface CollectionRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Collection | null, PlatformError>>;
  save(collection: Collection): Promise<Result<void, PlatformError>>;
  saveEntry(entry: CollectionEntry): Promise<Result<void, PlatformError>>;
  listEntries(
    companyId: string,
    collectionId: string,
    page?: PageRequest,
  ): Promise<Result<Page<CollectionEntry>, PlatformError>>;
}

export interface AttachmentRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Attachment | null, PlatformError>>;
  save(attachment: Attachment): Promise<Result<void, PlatformError>>;
  listByEntity(
    companyId: string,
    entityType: string,
    entityId: string,
  ): Promise<Result<readonly Attachment[], PlatformError>>;
}

export interface DocumentRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Document | null, PlatformError>>;
  save(document: Document): Promise<Result<void, PlatformError>>;
}

export interface DerivativeRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<MediaDerivative | null, PlatformError>>;
  save(derivative: MediaDerivative): Promise<Result<void, PlatformError>>;
  listByAsset(
    companyId: string,
    assetId: string,
  ): Promise<Result<readonly MediaDerivative[], PlatformError>>;
}

export interface MetadataRepository {
  saveEntry(entry: AssetMetadataEntry): Promise<Result<void, PlatformError>>;
  saveTag(tag: AssetTag): Promise<Result<void, PlatformError>>;
  saveLabel(label: AssetLabel): Promise<Result<void, PlatformError>>;
  listByAsset(
    companyId: string,
    assetId: string,
  ): Promise<
    Result<
      {
        readonly entries: readonly AssetMetadataEntry[];
        readonly tags: readonly AssetTag[];
        readonly labels: readonly AssetLabel[];
      },
      PlatformError
    >
  >;
}
