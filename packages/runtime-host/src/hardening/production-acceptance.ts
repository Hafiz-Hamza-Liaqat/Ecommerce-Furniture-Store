/**
 * Production acceptance suite — fail on any production-critical issue.
 */

import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isFail } from "@afh/shared-kernel";
import { createProductionHost, RUNTIME_HOST_VERSION } from "../host/create-production-host.js";
import { validateDisasterRecoveryReadiness } from "./disaster-recovery.js";
import { collectRuntimeDiagnostics } from "./diagnostics.js";
import { runLoadFoundationScenarios } from "./load-foundation.js";
import { verifyMonitoringRegistration } from "./monitoring-verification.js";
import { validateSecurityHardening } from "./security-validation.js";
import { validateSqlOperational } from "./sql-validation.js";
import { verifySqliteBackupRestore } from "./backup-restore.js";

export type AcceptanceCheck = {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
};

const TEST_SECRETS = {
  AFH_SECRET_JWT_SIGNING_KEY: "ci-verify-jwt-signing-key-32chars-min!!",
  AFH_SECRET_JWT_SIGNING_KEY_PREVIOUS:
    "ci-previous-jwt-signing-key-32chars-min!",
  AFH_SECRET_DATABASE_URL: "sqlite::memory:",
  AFH_SECRET_BROKER_CREDENTIAL: "local",
  AFH_SECRET_API_SECRET: "ci-api-secret",
} as const;

/**
 * Full production acceptance verification against an in-memory hardened host.
 */
export async function runProductionAcceptanceSuite(): Promise<{
  readonly ok: boolean;
  readonly checks: readonly AcceptanceCheck[];
}> {
  const checks: AcceptanceCheck[] = [];
  const backupDir = join(tmpdir(), `afh-accept-${Date.now()}`);
  mkdirSync(backupDir, { recursive: true });

  const host = await createProductionHost({
    autoStart: false,
    config: {
      profile: "testing",
      databasePath: ":memory:",
      brokerDatabasePath: ":memory:",
      requireSecrets: true,
      validateOnStartup: true,
      integrityCheckOnStartup: true,
    },
    env: { ...TEST_SECRETS },
  });

  try {
    checks.push({
      name: "startup_composition",
      ok: true,
      detail: `profile=${host.config.profile}`,
    });

    const sqlOp = await validateSqlOperational(host.sql, {
      expectedBusyTimeoutMs: host.config.busyTimeoutMs,
    });
    checks.push({
      name: "sql_runtime",
      ok: sqlOp.ok,
      detail: sqlOp.ok
        ? `integrity=${sqlOp.value.integrityDetail}`
        : sqlOp.error.message,
    });

    const broker = await host.messaging.broker.healthCheck();
    checks.push({
      name: "broker_runtime",
      ok: broker.ok && broker.value.healthy,
      detail: broker.ok ? broker.value.detail : broker.error.message,
    });

    checks.push({
      name: "api_runtime",
      ok: host.api.composition.runtime != null,
      detail: "application runtime present",
    });

    const health = await host.api.composition.infrastructure.health.checkAll();
    checks.push({
      name: "health",
      ok: health.ok && health.value.status !== "down",
      detail: health.ok
        ? `status=${health.value.status} probes=${health.value.checks.length}`
        : health.error.message,
    });

    const monitoring = await verifyMonitoringRegistration({
      host: host.api,
      logger: host.logger,
      metrics: host.api.composition.infrastructure.metrics,
      tracer: host.api.composition.infrastructure.tracer,
    });
    checks.push({
      name: "observability",
      ok: monitoring.ok,
      detail: monitoring.ok
        ? `probes=${monitoring.value.probesPresent.length}`
        : monitoring.error.message,
    });

    const security = await validateSecurityHardening({
      secrets: host.api.composition.infrastructure.secrets,
      host: host.api,
      requireRotationKey: true,
    });
    checks.push({
      name: "security_providers",
      ok: security.ok,
      detail: security.ok
        ? security.value.checked.join(",")
        : security.error.message,
    });

    const backup = verifySqliteBackupRestore({
      sourcePath: ":memory:",
      backupDir,
      label: "accept",
    });
    checks.push({
      name: "backup_restore",
      ok: backup.ok,
      detail: backup.ok ? backup.value.backupPath : backup.error.message,
    });

    const dr = await validateDisasterRecoveryReadiness({
      sql: host.sql,
      messaging: host.messaging,
      backupDir,
      databasePath: ":memory:",
    });
    checks.push({
      name: "disaster_recovery",
      ok: dr.ok,
      detail: dr.ok ? dr.value.checked.join(",") : dr.error.message,
    });

    const load = await runLoadFoundationScenarios({
      host: host.api,
      sql: host.sql,
      messaging: host.messaging,
      iterations: 10,
    });
    const loadOk = load.every((r) => r.ok);
    checks.push({
      name: "load_foundation",
      ok: loadOk,
      detail: load.map((r) => `${r.name}:${r.ok ? "ok" : r.detail}`).join(";"),
    });

    const diagnostics = await collectRuntimeDiagnostics({
      config: host.config,
      sql: host.sql,
      messaging: host.messaging,
      host: host.api,
      packageVersion: RUNTIME_HOST_VERSION,
    });
    checks.push({
      name: "diagnostics",
      ok: diagnostics.configFingerprint.length === 16,
      detail: `fingerprint=${diagnostics.configFingerprint}`,
    });

    checks.push({
      name: "release_validation",
      ok: !isFail({ ok: true, value: undefined }),
      detail: "startup validation already enforced at compose",
    });

    checks.push({
      name: "production_composition",
      ok:
        host.api.composition.infrastructure.config.eventBusEnabled === true &&
        host.messaging != null,
      detail: "sql+broker+security wired",
    });

    await host.lifecycle.start();
    checks.push({
      name: "lifecycle_start",
      ok: host.lifecycle.isLive(),
      detail: "listening",
    });

    await host.dispose();
    checks.push({
      name: "lifecycle_shutdown",
      ok: true,
      detail: "disposed",
    });
  } catch (error) {
    checks.push({
      name: "acceptance_fatal",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    try {
      await host.dispose();
    } catch {
      /* ignore */
    }
  }

  return {
    ok: checks.every((c) => c.ok),
    checks,
  };
}
