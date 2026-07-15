/**
 * Media derivative models — no image processing.
 * Derivatives inherit parent asset visibility.
 */

import type { AssetVisibility } from "../asset/asset.js";

export type DerivativeKind =
  | "thumbnail"
  | "preview"
  | "optimized"
  | "original"
  | "other";

export type MediaDerivative = {
  readonly id: string;
  readonly companyId: string;
  readonly assetId: string;
  readonly versionId: string | null;
  readonly kind: DerivativeKind;
  /** Inherited from parent asset — not independently authorized here */
  readonly visibility: AssetVisibility;
  readonly mimeType: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly storageRef: string | null;
  readonly createdAt: string;
};

export type ThumbnailReference = {
  readonly derivativeId: string;
  readonly assetId: string;
};

export type PreviewReference = {
  readonly derivativeId: string;
  readonly assetId: string;
};

export type OptimizedVariantReference = {
  readonly derivativeId: string;
  readonly assetId: string;
};

export type OriginalReference = {
  readonly derivativeId: string | null;
  readonly versionId: string;
  readonly assetId: string;
};
