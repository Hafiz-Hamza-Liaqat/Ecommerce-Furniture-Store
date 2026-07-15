#!/usr/bin/env node
/**
 * Release / migration verification — CI gate (no cloud deploy).
 */

import { createSqlPersistenceFoundation } from "@afh/persistence-sql";
import {
  assertProductionRuntimeConfig,
  loadProductionRuntimeConfig,
} from "../config/runtime-config.js";
import {
  loadProductionSecrets,
  validateProductionSecrets,
} from "../secrets/load-secrets.js";
import { isFail } from "@afh/shared-kernel";

async function main(): Promise<void> {
  const config = loadProductionRuntimeConfig({
    profile: "testing",
    databasePath: ":memory:",
    brokerDatabasePath: ":memory:",
    requireSecrets: false,
  });
  assertProductionRuntimeConfig(config);

  const secrets = loadProductionSecrets({
    AFH_SECRET_JWT_SIGNING_KEY: "ci-verify-jwt-signing-key-32chars-min!!",
    AFH_SECRET_DATABASE_URL: "sqlite::memory:",
    AFH_SECRET_BROKER_CREDENTIAL: "local",
    AFH_SECRET_API_SECRET: "ci-api-secret",
  });
  const validated = await validateProductionSecrets(secrets, {
    requireAll: true,
    allowEphemeralJwt: false,
  });
  if (isFail(validated)) {
    throw validated.error;
  }

  const sql = createSqlPersistenceFoundation({
    config: { databasePath: ":memory:" },
  });
  try {
    if (!sql.migrationCompatible) {
      throw new Error("SQL migration compatibility check failed");
    }
    console.log(
      JSON.stringify({
        ok: true,
        checked: ["configuration", "secrets", "migrations"],
      }),
    );
  } finally {
    sql.dispose();
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
