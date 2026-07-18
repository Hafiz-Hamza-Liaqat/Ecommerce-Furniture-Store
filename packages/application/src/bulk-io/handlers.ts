import type { SecurityAuditService } from "@afh/identity";
import { ValidationError, fail, ok } from "@afh/shared-kernel";
import type { CommandHandler } from "../handlers/handlers.js";
import { resolveBulkBinding } from "./bindings.js";
import { BulkIoCommandTypes } from "./constants.js";
import { companyResource, recordBulkAudit, requireCompanyId } from "./support.js";
import {
  BULK_IO_MAX_ROWS,
  type BulkIoEntityAdapter,
  type BulkIoEntityBinding,
  type BulkIoSummary,
  type BulkRowResult,
  type BulkUpdateEntityRowsPayload,
  type ExportEntityRowsPayload,
  type ExportEntityRowsResult,
  type ImportEntityRowsPayload,
} from "./types.js";

export type BulkIoHandlerDeps = {
  readonly bindings: readonly BulkIoEntityBinding[];
  readonly adapters: Readonly<Record<string, BulkIoEntityAdapter>>;
  readonly audit?: SecurityAuditService;
};

export type BulkIoHandlers = {
  readonly importRows: CommandHandler<ImportEntityRowsPayload, BulkIoSummary>;
  readonly exportRows: CommandHandler<ExportEntityRowsPayload, ExportEntityRowsResult>;
  readonly bulkUpdate: CommandHandler<BulkUpdateEntityRowsPayload, BulkIoSummary>;
};

function summarize(results: readonly BulkRowResult[]): BulkIoSummary {
  const succeeded = results.filter((r) => r.ok).length;
  return {
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
}

export function createBulkIoHandlers(deps: BulkIoHandlerDeps): BulkIoHandlers {
  const importRows: CommandHandler<ImportEntityRowsPayload, BulkIoSummary> = {
    commandType: BulkIoCommandTypes.ImportEntityRows,
    authorize(command) {
      const resolved = resolveBulkBinding(deps.bindings, command.payload.entityType);
      if (!resolved.ok) throw resolved.error;
      return companyResource(
        resolved.value.resourceType,
        resolved.value.importAction,
        command.payload.companyId,
      );
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const resolved = resolveBulkBinding(deps.bindings, command.payload.entityType);
      if (!resolved.ok) return resolved;

      const adapter = deps.adapters[command.payload.entityType];
      if (!adapter) {
        return fail(
          new ValidationError("No bulk adapter registered for entityType", {
            code: "bulk_adapter_missing",
            details: { entityType: command.payload.entityType },
          }),
        );
      }

      if (command.payload.rows.length > BULK_IO_MAX_ROWS) {
        return fail(
          new ValidationError("Import exceeds maximum row bound", {
            code: "bulk_row_limit_exceeded",
            details: { maxRows: BULK_IO_MAX_ROWS, actual: command.payload.rows.length },
          }),
        );
      }

      const nowIso = ctx.clock.now().toISOString();
      const results: BulkRowResult[] = [];
      for (let index = 0; index < command.payload.rows.length; index += 1) {
        const row = command.payload.rows[index]!;
        const imported = await adapter.importRow({
          companyId: scope.value,
          row,
          userId: ctx.userId,
          nowIso,
        });
        if (imported.ok) {
          results.push({ index, ok: true, entityId: imported.value.entityId });
        } else {
          results.push({
            index,
            ok: false,
            errorCode: imported.error.code,
            errorMessage: imported.error.message,
          });
        }
      }

      const summary = summarize(results);
      await recordBulkAudit(deps.audit, ctx, {
        action: BulkIoCommandTypes.ImportEntityRows,
        entityType: command.payload.entityType,
        entityId: null,
        outcome: summary.failed === 0 ? "success" : "failure",
        details: {
          total: summary.total,
          succeeded: summary.succeeded,
          failed: summary.failed,
        },
      });
      return ok(summary);
    },
  };

  const exportRows: CommandHandler<ExportEntityRowsPayload, ExportEntityRowsResult> = {
    commandType: BulkIoCommandTypes.ExportEntityRows,
    authorize(command) {
      const resolved = resolveBulkBinding(deps.bindings, command.payload.entityType);
      if (!resolved.ok) throw resolved.error;
      return companyResource(
        resolved.value.resourceType,
        resolved.value.exportAction,
        command.payload.companyId,
      );
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const resolved = resolveBulkBinding(deps.bindings, command.payload.entityType);
      if (!resolved.ok) return resolved;

      const adapter = deps.adapters[command.payload.entityType];
      if (!adapter) {
        return fail(
          new ValidationError("No bulk adapter registered for entityType", {
            code: "bulk_adapter_missing",
            details: { entityType: command.payload.entityType },
          }),
        );
      }

      const limit = Math.min(
        Math.max(1, command.payload.limit ?? BULK_IO_MAX_ROWS),
        BULK_IO_MAX_ROWS,
      );
      const exported = await adapter.exportRows({
        companyId: scope.value,
        limit,
      });
      if (!exported.ok) return exported;

      await recordBulkAudit(deps.audit, ctx, {
        action: BulkIoCommandTypes.ExportEntityRows,
        entityType: command.payload.entityType,
        entityId: null,
        outcome: "success",
        details: { rowCount: exported.value.length },
      });

      return ok({
        entityType: command.payload.entityType,
        rows: exported.value,
      });
    },
  };

  const bulkUpdate: CommandHandler<BulkUpdateEntityRowsPayload, BulkIoSummary> = {
    commandType: BulkIoCommandTypes.BulkUpdateEntityRows,
    authorize(command) {
      const resolved = resolveBulkBinding(deps.bindings, command.payload.entityType);
      if (!resolved.ok) throw resolved.error;
      return companyResource(
        resolved.value.resourceType,
        resolved.value.bulkUpdateAction,
        command.payload.companyId,
      );
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const resolved = resolveBulkBinding(deps.bindings, command.payload.entityType);
      if (!resolved.ok) return resolved;

      const adapter = deps.adapters[command.payload.entityType];
      if (!adapter) {
        return fail(
          new ValidationError("No bulk adapter registered for entityType", {
            code: "bulk_adapter_missing",
            details: { entityType: command.payload.entityType },
          }),
        );
      }

      if (command.payload.rows.length > BULK_IO_MAX_ROWS) {
        return fail(
          new ValidationError("Bulk update exceeds maximum row bound", {
            code: "bulk_row_limit_exceeded",
            details: { maxRows: BULK_IO_MAX_ROWS, actual: command.payload.rows.length },
          }),
        );
      }

      const nowIso = ctx.clock.now().toISOString();
      const results: BulkRowResult[] = [];
      for (let index = 0; index < command.payload.rows.length; index += 1) {
        const row = command.payload.rows[index]!;
        const updated = await adapter.updateRow({
          companyId: scope.value,
          id: row.id,
          patch: row.patch,
          ...(row.expectedVersion !== undefined
            ? { expectedVersion: row.expectedVersion }
            : {}),
          userId: ctx.userId,
          nowIso,
        });
        if (updated.ok) {
          results.push({ index, ok: true, entityId: updated.value.entityId });
        } else {
          results.push({
            index,
            ok: false,
            errorCode: updated.error.code,
            errorMessage: updated.error.message,
          });
        }
      }

      const summary = summarize(results);
      await recordBulkAudit(deps.audit, ctx, {
        action: BulkIoCommandTypes.BulkUpdateEntityRows,
        entityType: command.payload.entityType,
        entityId: null,
        outcome: summary.failed === 0 ? "success" : "failure",
        details: {
          total: summary.total,
          succeeded: summary.succeeded,
          failed: summary.failed,
        },
      });
      return ok(summary);
    },
  };

  return { importRows, exportRows, bulkUpdate };
}
