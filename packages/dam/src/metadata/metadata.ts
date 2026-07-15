/**
 * Metadata contracts — no indexing engine.
 */

export type MetadataKey = string;

export type MetadataValue = string | number | boolean | null;

export type AssetMetadataEntry = {
  readonly id: string;
  readonly companyId: string;
  readonly assetId: string;
  readonly key: MetadataKey;
  readonly value: MetadataValue;
};

export type AssetTag = {
  readonly id: string;
  readonly companyId: string;
  readonly assetId: string;
  readonly tag: string;
};

export type AssetLabel = {
  readonly id: string;
  readonly companyId: string;
  readonly assetId: string;
  readonly label: string;
  readonly color: string | null;
};

export type ClassificationReference = {
  readonly classification: string;
  readonly source: string | null;
};
