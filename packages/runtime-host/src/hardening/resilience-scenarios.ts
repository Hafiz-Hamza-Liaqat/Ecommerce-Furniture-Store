/**
 * Resilience scenarios — fail-safe verification (no business logic).
 */

import { createProductionHost } from "../host/create-production-host.js";

export type ResilienceScenarioResult = {
  readonly name: string;
  readonly expectedFailure: boolean;
  readonly passed: boolean;
  readonly detail: string;
};

const TEST_SECRETS = {
  AFH_SECRET_JWT_SIGNING_KEY: "ci-verify-jwt-signing-key-32chars-min!!",
  AFH_SECRET_DATABASE_URL: "sqlite::memory:",
  AFH_SECRET_BROKER_CREDENTIAL: "local",
  AFH_SECRET_API_SECRET: "ci-api-secret",
} as const;

/**
 * Runs fail-safe resilience scenarios. Expects certain startups to fail closed.
 */
export async function runResilienceScenarios(): Promise<
  readonly ResilienceScenarioResult[]
> {
  const results: ResilienceScenarioResult[] = [];

  // Invalid secrets (production profile requires secrets, no ephemeral)
  try {
    await createProductionHost({
      autoStart: false,
      config: {
        profile: "production",
        corsOrigin: "https://app.example.com",
        databasePath: ":memory:",
        brokerDatabasePath: ":memory:",
        requireSecrets: true,
        validateOnStartup: true,
      },
      env: {},
    });
    results.push({
      name: "invalid_secrets",
      expectedFailure: true,
      passed: false,
      detail: "expected startup failure",
    });
  } catch (error) {
    results.push({
      name: "invalid_secrets",
      expectedFailure: true,
      passed: true,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  // Configuration failure — invalid port
  try {
    await createProductionHost({
      autoStart: false,
      config: {
        profile: "testing",
        port: -1,
        databasePath: ":memory:",
        brokerDatabasePath: ":memory:",
        requireSecrets: false,
      },
      env: { ...TEST_SECRETS },
    });
    results.push({
      name: "configuration_failures",
      expectedFailure: true,
      passed: false,
      detail: "expected config assert failure",
    });
  } catch (error) {
    results.push({
      name: "configuration_failures",
      expectedFailure: true,
      passed: true,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  // Healthy composition then shutdown during "processing" (outbox drain on stop)
  try {
    const host = await createProductionHost({
      autoStart: false,
      config: {
        profile: "testing",
        databasePath: ":memory:",
        brokerDatabasePath: ":memory:",
        requireSecrets: false,
        validateOnStartup: true,
      },
      env: { ...TEST_SECRETS },
    });
    await host.lifecycle.start();
    await host.api.composition.infrastructure.outboxDispatcher.dispatchOnce();
    await host.dispose();
    results.push({
      name: "shutdown_during_processing",
      expectedFailure: false,
      passed: true,
      detail: "graceful stop after dispatch",
    });
  } catch (error) {
    results.push({
      name: "shutdown_during_processing",
      expectedFailure: false,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  // Startup success baseline (valid)
  try {
    const host = await createProductionHost({
      autoStart: false,
      config: {
        profile: "testing",
        databasePath: ":memory:",
        brokerDatabasePath: ":memory:",
        requireSecrets: false,
      },
      env: { ...TEST_SECRETS },
    });
    await host.dispose();
    results.push({
      name: "startup_success_baseline",
      expectedFailure: false,
      passed: true,
      detail: "composed ok",
    });
  } catch (error) {
    results.push({
      name: "startup_success_baseline",
      expectedFailure: false,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  // Database unavailable — invalid path on Windows/Linux (directory as db path often fails open)
  try {
    await createProductionHost({
      autoStart: false,
      config: {
        profile: "testing",
        databasePath: "\0invalid",
        brokerDatabasePath: ":memory:",
        requireSecrets: false,
        validateOnStartup: false,
      },
      env: { ...TEST_SECRETS },
    });
    results.push({
      name: "database_unavailable",
      expectedFailure: true,
      passed: false,
      detail: "expected failure opening invalid db",
    });
  } catch (error) {
    results.push({
      name: "database_unavailable",
      expectedFailure: true,
      passed: true,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

export function allResilienceScenariosPassed(
  results: readonly ResilienceScenarioResult[],
): boolean {
  return results.every((r) => r.passed);
}
