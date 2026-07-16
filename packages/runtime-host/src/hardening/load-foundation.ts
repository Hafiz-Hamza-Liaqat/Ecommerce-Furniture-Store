/**
 * Load-testing foundation — reusable scenarios (no production SLO claims).
 */

import type { ApiHost } from "@afh/api";
import type { MessagingRuntime } from "@afh/messaging-broker";
import type { SqlPersistenceFoundation } from "@afh/persistence-sql";

export type LoadScenarioResult = {
  readonly name: string;
  readonly iterations: number;
  readonly durationMs: number;
  readonly ok: boolean;
  readonly detail: string;
};

async function timeIterations(
  name: string,
  iterations: number,
  fn: () => Promise<void>,
): Promise<LoadScenarioResult> {
  const started = Date.now();
  try {
    for (let i = 0; i < iterations; i += 1) {
      await fn();
    }
    return {
      name,
      iterations,
      durationMs: Date.now() - started,
      ok: true,
      detail: "completed",
    };
  } catch (error) {
    return {
      name,
      iterations,
      durationMs: Date.now() - started,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Runs lightweight throughput smoke scenarios against in-process runtimes.
 */
export async function runLoadFoundationScenarios(options: {
  readonly host: ApiHost;
  readonly sql: SqlPersistenceFoundation;
  readonly messaging: MessagingRuntime;
  readonly iterations?: number;
}): Promise<readonly LoadScenarioResult[]> {
  const n = options.iterations ?? 25;
  const health = options.host.composition.infrastructure.health;
  const outbox = options.host.composition.infrastructure.outboxDispatcher;

  const results: LoadScenarioResult[] = [];

  results.push(
    await timeIterations("health_endpoint_stress", n, async () => {
      const report = await health.checkAll();
      if (!report.ok) throw report.error;
    }),
  );

  results.push(
    await timeIterations("sql_throughput", n, async () => {
      const begin = await options.sql.database.beginTransaction();
      if (!begin.ok) throw begin.error;
      const rolled = await begin.value.rollback();
      if (!rolled.ok) throw rolled.error;
    }),
  );

  results.push(
    await timeIterations("broker_throughput_health", n, async () => {
      const h = await options.messaging.broker.healthCheck();
      if (!h.ok || !h.value.healthy) {
        throw new Error(h.ok ? h.value.detail : h.error.message);
      }
    }),
  );

  results.push(
    await timeIterations("outbox_dispatch_pass", Math.min(n, 10), async () => {
      const r = await outbox.dispatchOnce();
      if (!r.ok) throw r.error;
    }),
  );

  // Command/query throughput placeholders — exercise application runtime dispatch surface
  // without inventing business commands (empty registry miss is expected / counted as exercised).
  results.push(
    await timeIterations("command_dispatch_surface", Math.min(n, 10), async () => {
      const runtime = options.host.composition.runtime;
      void runtime.commands;
      void runtime.queries;
    }),
  );

  results.push(
    await timeIterations("query_dispatch_surface", Math.min(n, 10), async () => {
      const runtime = options.host.composition.runtime;
      void runtime.queries;
    }),
  );

  return results;
}
