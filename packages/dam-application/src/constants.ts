/**
 * DAM application constants.
 */

export const DamCommandTypes = {
  CreateAsset: "dam.CreateAsset",
} as const;

export const DamQueryTypes = {
  GetAsset: "dam.GetAsset",
  ListAsset: "dam.ListAsset",
} as const;

export const DamPolicyActions = {
  AssetCreate: "dam.assets.create",
  AssetRead: "dam.assets.read",
  /** Alias of create for upload route compatibility. */
  AssetUpload: "dam.assets.upload",
} as const;

/** Shared MIME allowlist — mirrors API upload validation. */
export const ALLOWED_ASSET_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const DEFAULT_MAX_ASSET_BYTES = 1_048_576;
