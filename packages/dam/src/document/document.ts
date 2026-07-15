/**
 * Document foundation — no document generation.
 */

export type DocumentType =
  | "contract"
  | "invoice"
  | "quote"
  | "specification"
  | "drawing"
  | "policy"
  | "kyc"
  | "other";

export type DocumentStatus =
  | "draft"
  | "active"
  | "superseded"
  | "archived"
  | "void";

export type Document = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly title: string;
  readonly documentType: DocumentType;
  readonly status: DocumentStatus;
  /** Primary DAM asset backing this document */
  readonly assetId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DocumentReference = {
  readonly documentId: string;
  readonly companyId: string;
  readonly assetId: string | null;
};
