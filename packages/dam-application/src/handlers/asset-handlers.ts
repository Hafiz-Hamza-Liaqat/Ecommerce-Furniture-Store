import type { CommandHandler, FetchListCandidates, QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { AssetVersion, DigitalAsset } from "@afh/dam";
import type { Page, Result } from "@afh/shared-kernel";
import { NotFoundError, ValidationError, fail, ok } from "@afh/shared-kernel";
import {
  DamCommandTypes,
  DamPolicyActions,
  DamQueryTypes,
  DEFAULT_MAX_ASSET_BYTES,
} from "../constants.js";
import type { CreateAssetPayload } from "../commands/commands.js";
import type {
  GetAssetPayload,
  GetAssetResult,
  ListAssetPayload,
} from "../queries/queries.js";
import {
  createAssetCommandValidator,
  getAssetQueryValidator,
  isAllowedAssetMimeType,
  listAssetQueryValidator,
} from "../validators/validators.js";
import type { DamHandlerDeps } from "./deps.js";
import {
  companyResource,
  loadRecordForAuthorization,
  newEntityId,
  recordDamAudit,
  requireCompanyId,
} from "../support/support.js";

export type CreateAssetResult = {
  readonly assetId: string;
  readonly versionId?: string;
  readonly storageRef?: string;
};

function decodeBase64Content(contentBase64: string): Result<Uint8Array, ValidationError> {
  try {
    const bytes = Buffer.from(contentBase64, "base64");
    return ok(new Uint8Array(bytes));
  } catch {
    return fail(
      new ValidationError("contentBase64 is not valid base64", {
        code: "invalid_content_base64",
      }),
    );
  }
}

function mapAssetType(value: string | undefined): DigitalAsset["assetType"] {
  const known: DigitalAsset["assetType"][] = [
    "image",
    "video",
    "audio",
    "document",
    "archive",
    "other",
  ];
  return known.includes(value as DigitalAsset["assetType"])
    ? (value as DigitalAsset["assetType"])
    : "document";
}

function mapClassification(
  value: string | undefined,
): DigitalAsset["classification"] {
  const known: DigitalAsset["classification"][] = [
    "general",
    "product",
    "kyc",
    "contract",
    "invoice",
    "project",
    "internal",
    "other",
  ];
  return known.includes(value as DigitalAsset["classification"])
    ? (value as DigitalAsset["classification"])
    : "general";
}

export function createCreateAssetHandler(
  deps: DamHandlerDeps,
): CommandHandler<CreateAssetPayload, CreateAssetResult> {
  return {
    commandType: DamCommandTypes.CreateAsset,
    authorize(command) {
      return companyResource(
        "digital_asset",
        DamPolicyActions.AssetCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createAssetCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      if (!isAllowedAssetMimeType(p.mimeType)) {
        return fail(
          new ValidationError("mimeType is not in the allowed upload list", {
            code: "mime_type_not_allowed",
            details: { mimeType: p.mimeType },
          }),
        );
      }

      let bytes: Uint8Array | null = null;
      if (p.contentBase64 != null && p.contentBase64.length > 0) {
        const decoded = decodeBase64Content(p.contentBase64);
        if (!decoded.ok) return decoded;
        bytes = decoded.value;
        if (bytes.byteLength > DEFAULT_MAX_ASSET_BYTES) {
          return fail(
            new ValidationError("Asset content exceeds maximum allowed size", {
              code: "asset_content_too_large",
              details: {
                maxBytes: DEFAULT_MAX_ASSET_BYTES,
                actualBytes: bytes.byteLength,
              },
            }),
          );
        }
      }

      const assetId = newEntityId();
      const now = ctx.clock.now().toISOString();
      let versionId: string | undefined;
      let storageRef: string | undefined;
      let currentVersionId: string | null = null;

      if (bytes) {
        versionId = newEntityId();
        const stored = await deps.objectStore.put({
          companyId: scope.value,
          assetId,
          versionId,
          bytes,
          mimeType: p.mimeType,
        });
        if (!stored.ok) return stored;
        storageRef = stored.value.storageRef;
        currentVersionId = versionId;

        const version: AssetVersion = {
          id: versionId,
          companyId: scope.value,
          assetId,
          versionNumber: 1,
          metadata: {
            fileName: p.fileName ?? null,
            mimeType: p.mimeType,
            sizeBytes: stored.value.sizeBytes,
            checksum: stored.value.checksum,
            checksumAlgorithm: "sha256",
            storageRef: stored.value.storageRef,
          },
          createdByUserId: ctx.userId,
          createdAt: now,
        };

        const versionSaved = await deps.versions.save(version);
        if (!versionSaved.ok) return versionSaved;
      }

      const asset: DigitalAsset = {
        id: assetId,
        companyId: scope.value,
        code: null,
        name: p.name,
        assetType: mapAssetType(p.assetType),
        status: bytes ? "active" : "draft",
        classification: mapClassification(p.classification),
        visibility: "internal",
        mimeType: p.mimeType,
        currentVersionId,
        folderId: p.folderId ?? null,
        uploadedByUserId: ctx.userId,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.assets.save(asset);
      if (!saved.ok) return saved;

      await recordDamAudit(deps.audit, ctx, {
        action: DamPolicyActions.AssetCreate,
        entityType: "digital_asset",
        entityId: assetId,
        outcome: "success",
        details: {
          hasContent: Boolean(bytes),
          versionId: versionId ?? null,
          storageRef: storageRef ?? null,
        },
      });

      const result: CreateAssetResult = { assetId };
      if (versionId !== undefined && storageRef !== undefined) {
        return ok({ ...result, versionId, storageRef });
      }
      return ok(result);
    },
  };
}

export function createGetAssetHandler(
  deps: DamHandlerDeps,
): QueryHandler<GetAssetPayload, GetAssetResult> {
  return {
    queryType: DamQueryTypes.GetAsset,
    async authorize(query) {
      const p = query.payload;
      await loadRecordForAuthorization(() =>
        deps.assets.findById({ companyId: p.companyId, id: p.assetId }),
      );
      return companyResource(
        "digital_asset",
        DamPolicyActions.AssetRead,
        p.companyId,
        p.assetId,
      );
    },
    validate() {
      return getAssetQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const found = await deps.assets.findById({
        companyId: scope.value,
        id: query.payload.assetId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Digital asset not found", {
            code: "digital_asset_not_found",
          }),
        );
      }

      if (!query.payload.includeCurrentVersion || !found.value.currentVersionId) {
        return ok({ asset: found.value });
      }

      const version = await deps.versions.findById({
        companyId: scope.value,
        id: found.value.currentVersionId,
      });
      if (!version.ok) return version;

      return ok({
        asset: found.value,
        currentVersion: version.value,
      });
    },
  };
}

function createAssetListCandidateFetcher(
  listByCompany: DamHandlerDeps["assets"]["listByCompany"],
): FetchListCandidates<DigitalAsset> {
  let prepared: DigitalAsset[] | null = null;

  return async ({ companyId, offset, limit }) => {
    if (prepared === null) {
      const all: DigitalAsset[] = [];
      let page = 1;
      for (;;) {
        const batch = await listByCompany(companyId, { page, pageSize: 100 });
        if (!batch.ok) {
          return batch;
        }
        all.push(...batch.value.items);
        if (!batch.value.hasMore) {
          break;
        }
        page += 1;
      }
      prepared = all;
    }

    return ok(prepared.slice(offset, offset + limit));
  };
}

export function createListAssetHandler(
  deps: DamHandlerDeps,
): QueryHandler<ListAssetPayload, Page<DigitalAsset>> {
  return {
    queryType: DamQueryTypes.ListAsset,
    authorize(query, ctx) {
      return companyResource(
        "digital_asset",
        DamPolicyActions.AssetRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, DamPolicyActions.AssetRead),
      );
    },
    validate() {
      return listAssetQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<DigitalAsset>({
        ctx,
        action: DamPolicyActions.AssetRead,
        resourceType: "digital_asset",
        request,
        toScope: (asset) => ({
          id: asset.id,
          companyId: asset.companyId,
        }),
        fetchCandidates: createAssetListCandidateFetcher((companyId, page) =>
          deps.assets.listByCompany(companyId, page),
        ),
      });
    },
  };
}
