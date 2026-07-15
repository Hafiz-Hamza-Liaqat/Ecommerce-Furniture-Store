/**
 * Digital asset foundation — DAM sole owner of files.
 * No upload, storage provider, or processing.
 */

export type AssetIdentifier = string;

export type AssetType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "other";

export type AssetStatus =
  | "draft"
  | "active"
  | "archived"
  | "deleted"
  | "quarantine";

export type AssetClassification =
  | "general"
  | "product"
  | "kyc"
  | "contract"
  | "invoice"
  | "project"
  | "internal"
  | "other";

export type AssetVisibility =
  | "public"
  | "authenticated"
  | "internal"
  | "restricted";

export type DigitalAsset = {
  readonly id: AssetIdentifier;
  readonly companyId: string;
  readonly code: string | null;
  readonly name: string;
  readonly assetType: AssetType;
  readonly status: AssetStatus;
  readonly classification: AssetClassification;
  readonly visibility: AssetVisibility;
  readonly mimeType: string | null;
  readonly currentVersionId: string | null;
  readonly folderId: string | null;
  readonly uploadedByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};
