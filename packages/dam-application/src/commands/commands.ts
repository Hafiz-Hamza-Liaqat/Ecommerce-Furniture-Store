/**
 * DAM application commands — no transport DTOs.
 */

export type CreateAssetPayload = {
  readonly companyId: string;
  readonly name: string;
  readonly assetType?: string;
  readonly classification?: string;
  readonly mimeType: string;
  readonly folderId?: string | null;
  readonly contentBase64?: string;
  readonly fileName?: string | null;
};
