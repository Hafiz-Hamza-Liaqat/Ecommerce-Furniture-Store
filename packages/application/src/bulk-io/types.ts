import type { PlatformError, Result } from "@afh/shared-kernel";

/** Maximum rows processed in a single sync import/bulk command. */
export const BULK_IO_MAX_ROWS = 100;

export type BulkIoEntityBinding = {
  readonly allowedEntityType: string;
  readonly resourceType: string;
  readonly importAction: string;
  readonly exportAction: string;
  readonly bulkUpdateAction: string;
};

export type BulkRowResult = {
  readonly index: number;
  readonly ok: boolean;
  readonly entityId?: string;
  readonly errorCode?: string;
  readonly errorMessage?: string;
};

export type BulkIoSummary = {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly results: readonly BulkRowResult[];
};

export type ImportEntityRowsPayload = {
  readonly companyId: string;
  readonly entityType: string;
  readonly rows: readonly Readonly<Record<string, unknown>>[];
};

export type ExportEntityRowsPayload = {
  readonly companyId: string;
  readonly entityType: string;
  readonly limit?: number;
};

export type BulkUpdateEntityRowsPayload = {
  readonly companyId: string;
  readonly entityType: string;
  readonly rows: readonly {
    readonly id: string;
    readonly expectedVersion?: number;
    readonly patch: Readonly<Record<string, unknown>>;
  }[];
};

export type ExportEntityRowsResult = {
  readonly entityType: string;
  readonly rows: readonly Readonly<Record<string, unknown>>[];
};

/**
 * Adapter that performs create/update/list for one bound entity type.
 * Domain modules supply these; bulk-io does not own aggregates.
 */
export type BulkIoEntityAdapter = {
  importRow(input: {
    readonly companyId: string;
    readonly row: Readonly<Record<string, unknown>>;
    readonly userId: string | null;
    readonly nowIso: string;
  }): Promise<Result<{ entityId: string }, PlatformError>>;
  updateRow(input: {
    readonly companyId: string;
    readonly id: string;
    readonly patch: Readonly<Record<string, unknown>>;
    readonly expectedVersion?: number;
    readonly userId: string | null;
    readonly nowIso: string;
  }): Promise<Result<{ entityId: string }, PlatformError>>;
  exportRows(input: {
    readonly companyId: string;
    readonly limit: number;
  }): Promise<Result<readonly Readonly<Record<string, unknown>>[], PlatformError>>;
};
