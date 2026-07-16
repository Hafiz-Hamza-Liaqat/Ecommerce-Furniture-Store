/**
 * Disaster recovery readiness validation — local procedures only.
 * No multi-region implementation.
 */

import type { MessagingRuntime } from "@afh/messaging-broker";
import type { SqlPersistenceFoundation } from "@afh/persistence-sql";
import {
  InfrastructureError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import { inspectDeadLetterQueue, validateReplaySafety } from "./broker-hardening.js";
import { verifySqliteBackupRestore } from "./backup-restore.js";

export type DisasterRecoveryReport = {
  readonly checked: readonly string[];
  readonly outboxReachable: boolean;
  readonly inboxReachable: boolean;
  readonly brokerHealthy: boolean;
  readonly backupVerified: boolean;
  readonly dlqInspected: boolean;
};

/**
 * Validates DR readiness: outbox/inbox consistency surfaces, broker health,
 * backup/restore path, and DLQ inspection (replay remains operator-gated).
 */
export async function validateDisasterRecoveryReadiness(options: {
  readonly sql: SqlPersistenceFoundation;
  readonly messaging: MessagingRuntime;
  readonly backupDir: string;
  readonly databasePath: string;
}): Promise<Result<DisasterRecoveryReport, PlatformError>> {
  const checked: string[] = [];

  const pending = await options.sql.outboxStore.listPending(1);
  if (!pending.ok) {
    return fail(
      new InfrastructureError("Outbox consistency check failed", {
        code: "dr_outbox_failed",
        details: { message: pending.error.message },
      }),
    );
  }
  checked.push("outbox_consistency");

  const inbox = await options.sql.inboxStore.hasProcessed(
    "__dr__",
    "__probe__",
  );
  if (!inbox.ok) {
    return fail(
      new InfrastructureError("Inbox consistency check failed", {
        code: "dr_inbox_failed",
        details: { message: inbox.error.message },
      }),
    );
  }
  checked.push("inbox_consistency");

  const broker = await options.messaging.broker.healthCheck();
  if (!broker.ok || !broker.value.healthy) {
    return fail(
      new InfrastructureError("Broker unhealthy for DR", {
        code: "dr_broker_unhealthy",
      }),
    );
  }
  checked.push("broker_health");

  const backup = verifySqliteBackupRestore({
    sourcePath: options.databasePath,
    backupDir: options.backupDir,
    label: "dr",
  });
  if (!backup.ok) return backup;
  checked.push("backup_restore");

  const dlq = inspectDeadLetterQueue(options.messaging, 5);
  if (!dlq.ok) return dlq;
  checked.push("dlq_inspection");

  // Message replay validation: if eligible records exist, validate safety only.
  if (dlq.value.eligibleForReplay > 0 && dlq.value.sampleIds[0]) {
    const safety = validateReplaySafety(
      options.messaging,
      dlq.value.sampleIds[0],
    );
    if (!safety.ok) return safety;
    checked.push("replay_safety");
  } else {
    checked.push("replay_safety_skipped_empty");
  }

  return ok({
    checked,
    outboxReachable: true,
    inboxReachable: true,
    brokerHealthy: true,
    backupVerified: true,
    dlqInspected: true,
  });
}
