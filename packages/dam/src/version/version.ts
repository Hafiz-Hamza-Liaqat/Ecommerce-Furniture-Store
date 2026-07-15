/**
 * Immutable asset version models — no version storage logic.
 */

export type AssetVersionMetadata = {
  readonly fileName: string | null;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  readonly checksum: string | null;
  readonly checksumAlgorithm: string | null;
  /** Opaque storage locator — not a provider implementation */
  readonly storageRef: string | null;
};

export type AssetVersion = {
  readonly id: string;
  readonly companyId: string;
  readonly assetId: string;
  readonly versionNumber: number;
  readonly metadata: AssetVersionMetadata;
  readonly createdByUserId: string | null;
  readonly createdAt: string;
};
