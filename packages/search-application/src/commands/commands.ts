/**
 * Search application commands — no transport DTOs.
 */

export type IndexSearchDocumentPayload = {
  readonly companyId: string;
  readonly indexCode: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly documentId?: string;
};
