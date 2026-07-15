/**
 * Attachment contracts — no upload behavior.
 */

export type AttachmentPurpose =
  | "primary"
  | "supporting"
  | "thumbnail"
  | "evidence"
  | "kyc"
  | "other";

export type EntityReference = {
  readonly entityType: string;
  readonly entityId: string;
};

export type OwnerReference = {
  readonly ownerType: "user" | "organization" | "company" | "system";
  readonly ownerId: string;
};

export type Attachment = {
  readonly id: string;
  readonly companyId: string;
  readonly assetId: string;
  readonly entity: EntityReference;
  readonly owner: OwnerReference | null;
  readonly purpose: AttachmentPurpose;
  readonly attachedAt: string;
  readonly attachedByUserId: string | null;
};
