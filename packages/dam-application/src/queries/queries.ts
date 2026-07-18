/**
 * DAM application queries — no transport DTOs.
 */

import type { AssetVersion, DigitalAsset } from "@afh/dam";
import type { ListQueryRequest } from "@afh/shared-kernel";

export type GetAssetPayload = {
  readonly companyId: string;
  readonly assetId: string;
  readonly includeCurrentVersion?: boolean;
};

export type ListAssetPayload = ListQueryRequest;

export type GetAssetResult = {
  readonly asset: DigitalAsset;
  readonly currentVersion?: AssetVersion | null;
};
