/**
 * File upload routing — transport routes to DAM only.
 * DAM owns assets; transport persists bytes via ObjectStore when present.
 */

import type {
  AssetRepository,
  AssetVersionRepository,
  DigitalAsset,
  ObjectStore,
} from "@afh/dam";
import {
  ALLOWED_ASSET_MIME_TYPES,
  DEFAULT_MAX_ASSET_BYTES,
} from "@afh/dam-application";
import type { PlatformError, Result } from "@afh/shared-kernel";
import { ValidationError, fail, ok } from "@afh/shared-kernel";
import type { UploadRequestDto, UploadAcceptedDto } from "../dto/dto.js";

export type UploadRouter = {
  routeUpload(input: {
    readonly dto: UploadRequestDto;
    readonly uploadedByUserId: string | null;
    readonly rawBody: Uint8Array | null;
  }): Promise<Result<UploadAcceptedDto, PlatformError>>;
};

export type CreateDamUploadRouterDeps = {
  readonly assets: AssetRepository;
  readonly versions: AssetVersionRepository;
  readonly objectStore: ObjectStore;
  readonly clock: { now(): Date };
  readonly maxBytes?: number;
};

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Creates a DAM-backed upload router.
 * Persists asset metadata and optional binary content via ObjectStore.
 */
export function createDamUploadRouter(
  deps: CreateDamUploadRouterDeps,
): UploadRouter {
  const maxBytes = deps.maxBytes ?? DEFAULT_MAX_ASSET_BYTES;

  return {
    async routeUpload(input) {
      const id = newId();
      const now = deps.clock.now().toISOString();
      const dto = input.dto;
      const hasBytes =
        input.rawBody != null && input.rawBody.byteLength > 0;

      if (hasBytes) {
        if (!dto.mimeType) {
          return fail(
            new ValidationError("mimeType is required when upload body is present", {
              code: "mime_type_required",
            }),
          );
        }
        if (!ALLOWED_ASSET_MIME_TYPES.has(dto.mimeType)) {
          return fail(
            new ValidationError("mimeType is not in the allowed upload list", {
              code: "mime_type_not_allowed",
            }),
          );
        }
        if (input.rawBody!.byteLength > maxBytes) {
          return fail(
            new ValidationError("Upload body exceeds maximum allowed size", {
              code: "upload_body_too_large",
              details: { maxBytes, actualBytes: input.rawBody!.byteLength },
            }),
          );
        }
      }

      let versionId: string | null = null;
      let storageRef: string | null = null;

      if (hasBytes) {
        versionId = newId();
        const stored = await deps.objectStore.put({
          companyId: dto.companyId,
          assetId: id,
          versionId,
          bytes: input.rawBody!,
          mimeType: dto.mimeType ?? null,
        });
        if (!stored.ok) {
          return stored;
        }
        storageRef = stored.value.storageRef;

        const versionSaved = await deps.versions.save({
          id: versionId,
          companyId: dto.companyId,
          assetId: id,
          versionNumber: 1,
          metadata: {
            fileName: dto.name,
            mimeType: dto.mimeType ?? null,
            sizeBytes: stored.value.sizeBytes,
            checksum: stored.value.checksum,
            checksumAlgorithm: "sha256",
            storageRef: stored.value.storageRef,
          },
          createdByUserId: input.uploadedByUserId,
          createdAt: now,
        });
        if (!versionSaved.ok) {
          return versionSaved;
        }
      }

      const asset: DigitalAsset = {
        id,
        companyId: dto.companyId,
        code: null,
        name: dto.name,
        assetType: (dto.assetType as DigitalAsset["assetType"]) ?? "document",
        status: hasBytes ? "active" : "draft",
        classification:
          (dto.classification as DigitalAsset["classification"]) ?? "general",
        visibility: "internal",
        mimeType: dto.mimeType ?? null,
        currentVersionId: versionId,
        folderId: dto.folderId ?? null,
        uploadedByUserId: input.uploadedByUserId,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.assets.save(asset);
      if (!saved.ok) return saved;

      return ok({
        assetId: id,
        companyId: dto.companyId,
        name: dto.name,
        status: asset.status,
        ...(versionId ? { versionId } : {}),
        ...(storageRef ? { storageRef } : {}),
      });
    },
  };
}
