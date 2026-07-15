/**
 * DAM validation contracts — structural checks only.
 * No storage, permission, or media processing rules.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type { DigitalAsset } from "../asset/asset.js";
import type { AssetVersion } from "../version/version.js";
import type { Collection, Folder } from "../folder/folder.js";
import type { Document } from "../document/document.js";
import type { Attachment } from "../attachment/attachment.js";
import type { MediaDerivative } from "../derivative/derivative.js";
import type { AssetMetadataEntry } from "../metadata/metadata.js";

function requireNonEmpty(
  field: string,
  value: string | null | undefined,
): ValidationOutcome | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const digitalAssetStructureValidator: Validator<DigitalAsset> = {
  validate(input: DigitalAsset): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const assetVersionStructureValidator: Validator<AssetVersion> = {
  validate(input: AssetVersion): ValidationOutcome {
    if (input.versionNumber < 1) {
      return validationFail([
        {
          field: "versionNumber",
          code: "invalid",
          message: "versionNumber must be >= 1",
        },
      ]);
    }
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("assetId", input.assetId) ??
      validationOk()
    );
  },
};

export const folderStructureValidator: Validator<Folder> = {
  validate(input: Folder): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("name", input.name) ??
      requireNonEmpty("path", input.path) ??
      validationOk()
    );
  },
};

export const collectionStructureValidator: Validator<Collection> = {
  validate(input: Collection): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const documentStructureValidator: Validator<Document> = {
  validate(input: Document): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("title", input.title) ??
      validationOk()
    );
  },
};

export const attachmentStructureValidator: Validator<Attachment> = {
  validate(input: Attachment): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("assetId", input.assetId) ??
      requireNonEmpty("entity.entityType", input.entity.entityType) ??
      requireNonEmpty("entity.entityId", input.entity.entityId) ??
      validationOk()
    );
  },
};

export const derivativeStructureValidator: Validator<MediaDerivative> = {
  validate(input: MediaDerivative): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("assetId", input.assetId) ??
      validationOk()
    );
  },
};

export const metadataEntryStructureValidator: Validator<AssetMetadataEntry> = {
  validate(input: AssetMetadataEntry): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("assetId", input.assetId) ??
      requireNonEmpty("key", input.key) ??
      validationOk()
    );
  },
};

export type DamValidators = {
  readonly digitalAsset: Validator<DigitalAsset>;
  readonly assetVersion: Validator<AssetVersion>;
  readonly folder: Validator<Folder>;
  readonly collection: Validator<Collection>;
  readonly document: Validator<Document>;
  readonly attachment: Validator<Attachment>;
  readonly derivative: Validator<MediaDerivative>;
  readonly metadataEntry: Validator<AssetMetadataEntry>;
};

export function createDamValidators(): DamValidators {
  return {
    digitalAsset: digitalAssetStructureValidator,
    assetVersion: assetVersionStructureValidator,
    folder: folderStructureValidator,
    collection: collectionStructureValidator,
    document: documentStructureValidator,
    attachment: attachmentStructureValidator,
    derivative: derivativeStructureValidator,
    metadataEntry: metadataEntryStructureValidator,
  };
}
