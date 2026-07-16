#!/usr/bin/env node
/**
 * Production hardening verification — resilience, backup/DR, monitoring, security.
 */

import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProductionHost } from "../host/create-production-host.js";
import { verifySqliteBackupRestore } from "../hardening/backup-restore.js";
import { validateDisasterRecoveryReadiness } from "../hardening/disaster-recovery.js";
import { verifyMonitoringRegistration } from "../hardening/monitoring-verification.js";
import {
  allResilienceScenariosPassed,
  runResilienceScenarios,
} from "../hardening/resilience-scenarios.js";
import { validateSecurityHardening } from "../hardening/security-validation.js";
import { validateSqlOperational } from "../hardening/sql-validation.js";

const TEST_SECRETS = {
  AFH_SECRET_JWT_SIGNING_KEY: "ci-verify-jwt-signing-key-32chars-min!!",
  AFH_SECRET_JWT_SIGNING_KEY_PREVIOUS:
    "ci-previous-jwt-signing-key-32chars-min!",
  AFH_SECRET_DATABASE_URL: "sqlite::memory:",
  AFH_SECRET_BROKER_CREDENTIAL: "local",
  AFH_SECRET_API_SECRET: "ci-api-secret",
} as const;

async function main(): Promise<void> {
  const resilience = await runResilienceScenarios();
  if (!allResilienceScenariosPassed(resilience)) {
    throw new Error(
      `Resilience scenarios failed: ${JSON.stringify(resilience)}`,
    );
  }

  const backupDir = join(tmpdir(), `afh-harden-${Date.now()}`);
  mkdirSync(backupDir, { recursive: true });

  const host = await createProductionHost({
    autoStart: false,
    config: {
      profile: "testing",
      databasePath: ":memory:",
      brokerDatabasePath: ":memory:",
      requireSecrets: true,
      integrityCheckOnStartup: true,
    },
    env: { ...TEST_SECRETS },
  });

  try {
    const sql = await validateSqlOperational(host.sql, {
      expectedBusyTimeoutMs: host.config.busyTimeoutMs,
    });
    if (!sql.ok) throw sql.error;

    const backup = verifySqliteBackupRestore({
      sourcePath: ":memory:",
      backupDir,
      label: "harden",
    });
    if (!backup.ok) throw backup.error;

    const dr = await validateDisasterRecoveryReadiness({
      sql: host.sql,
      messaging: host.messaging,
      backupDir,
      databasePath: ":memory:",
    });
    if (!dr.ok) throw dr.error;

    const monitoring = await verifyMonitoringRegistration({
      host: host.api,
      logger: host.logger,
      metrics: host.api.composition.infrastructure.metrics,
      tracer: host.api.composition.infrastructure.tracer,
    });
    if (!monitoring.ok) throw monitoring.error;

    const security = await validateSecurityHardening({
      secrets: host.api.composition.infrastructure.secrets,
      host: host.api,
      requireRotationKey: true,
    });
    if (!security.ok) throw security.error;

    console.log(
      JSON.stringify({
        ok: true,
        resilience: resilience.map((r) => r.name),
        sql: sql.value,
        backup: backup.value.backupPath,
        dr: dr.value.checked,
        monitoringProbes: monitoring.value.probesPresent.length,
        security: security.value.checked,
      }),
    );
  } finally {
    await host.dispose();
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
