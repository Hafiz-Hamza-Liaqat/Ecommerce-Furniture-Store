/**
 * File upload routing — transport routes to DAM only.
 * DAM owns assets; transport does not store bytes as SSoT.
 */

import type { AssetRepository, DigitalAsset } from "@afh/dam";
import type { PlatformError, Result } from "@afh/shared-kernel";
import { ok } from "@afh/shared-kernel";
import type { UploadRequestDto, UploadAcceptedDto } from "../dto/dto.js";

export type UploadRouter = {
  routeUpload(input: {
    readonly dto: UploadRequestDto;
    readonly uploadedByUserId: string | null;
    readonly rawBody: Uint8Array | null;
  }): Promise<Result<UploadAcceptedDto, PlatformError>>;
};

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Creates a DAM-backed upload router.
 * Persists asset metadata via AssetRepository; raw bytes are accepted but
 * storage provider wiring remains out of scope (DAM owns future storage).
 */
export function createDamUploadRouter(
  assets: AssetRepository,
  clock: { now(): Date },
): UploadRouter {
  return {
    async routeUpload(input) {
      const id = newId();
      const now = clock.now().toISOString();
      const dto = input.dto;

      const asset: DigitalAsset = {
        id,
        companyId: dto.companyId,
        code: null,
        name: dto.name,
        assetType: (dto.assetType as DigitalAsset["assetType"]) ?? "document",
        status: "draft",
        classification:
          (dto.classification as DigitalAsset["classification"]) ?? "general",
        visibility: "internal",
        mimeType: dto.mimeType ?? null,
        currentVersionId: null,
        folderId: dto.folderId ?? null,
        uploadedByUserId: input.uploadedByUserId,
        createdAt: now,
        updatedAt: now,
      };

      // Acknowledge binary presence without owning storage engines.
      void input.rawBody;

      const saved = await assets.save(asset);
      if (!saved.ok) return saved;

      return ok({
        assetId: id,
        companyId: dto.companyId,
        name: dto.name,
        status: asset.status,
      });
    },
  };
}
