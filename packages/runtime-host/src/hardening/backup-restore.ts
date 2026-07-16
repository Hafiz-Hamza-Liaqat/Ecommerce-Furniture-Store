/**
 * Backup & restore operational validation for SQLite files.
 * No cloud backup providers.
 */

import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createSqlPersistenceFoundation } from "@afh/persistence-sql";
import {
  InfrastructureError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";

export type BackupVerificationResult = {
  readonly sourcePath: string;
  readonly backupPath: string;
  readonly bytesCopied: boolean;
  readonly integrityOk: boolean;
  readonly migrationCompatible: boolean;
};

/**
 * Copies a SQLite database file and verifies the backup opens with integrity + migrations.
 * For `:memory:` sources, creates a temporary on-disk DB to exercise the path.
 */
export function verifySqliteBackupRestore(options: {
  readonly sourcePath: string;
  readonly backupDir: string;
  readonly label?: string;
}): Result<BackupVerificationResult, PlatformError> {
  const label = options.label ?? "afh";
  try {
    mkdirSync(options.backupDir, { recursive: true });
    const backupPath = join(options.backupDir, `${label}.backup.sqlite`);

    let sourcePath = options.sourcePath;
    let tempSource: string | null = null;

    if (sourcePath === ":memory:" || !existsSync(sourcePath)) {
      tempSource = join(options.backupDir, `${label}.source.sqlite`);
      const seeded = createSqlPersistenceFoundation({
        config: { databasePath: tempSource },
      });
      seeded.dispose();
      sourcePath = tempSource;
    }

    copyFileSync(sourcePath, backupPath);

    const restored = createSqlPersistenceFoundation({
      config: { databasePath: backupPath },
    });
    try {
      const integrity = restored.sqlClient.integrityCheck("quick");
      if (!integrity.ok) {
        return integrity;
      }
      if (!integrity.value.ok) {
        return fail(
          new InfrastructureError("Backup integrity check failed", {
            code: "backup_integrity_failed",
            details: { detail: integrity.value.detail },
          }),
        );
      }
      if (!restored.migrationCompatible) {
        return fail(
          new InfrastructureError("Backup migrations incompatible", {
            code: "backup_migration_incompatible",
          }),
        );
      }

      return ok({
        sourcePath,
        backupPath,
        bytesCopied: true,
        integrityOk: true,
        migrationCompatible: true,
      });
    } finally {
      restored.dispose();
      if (tempSource && existsSync(tempSource)) {
        try {
          rmSync(tempSource);
        } catch {
          /* ignore */
        }
      }
    }
  } catch (cause) {
    return fail(
      new InfrastructureError("Backup/restore verification failed", {
        code: "backup_restore_failed",
        cause,
        details: { backupDir: options.backupDir },
      }),
    );
  }
}
