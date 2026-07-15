/**
 * Health checks for infrastructure dependencies only.
 * No domain health logic.
 */

import type { PlatformError, Result } from "@afh/shared-kernel";
import { ok } from "@afh/shared-kernel";
import type { DatabaseProvider } from "../database/database-provider.js";
import type { EventBus } from "../event-bus/event-bus.js";
import type { InfrastructureConfig } from "../configuration/configuration.js";

export type HealthStatus = "up" | "down" | "degraded";

export type HealthCheckResult = {
  readonly name: string;
  readonly status: HealthStatus;
  readonly detail: string | null;
};

export type RuntimeHealthReport = {
  readonly status: HealthStatus;
  readonly checks: readonly HealthCheckResult[];
  readonly checkedAt: string;
};

export type HealthProbe = {
  readonly name: string;
  check(): Promise<Result<HealthCheckResult, PlatformError>>;
};

export class HealthRegistry {
  readonly #probes: HealthProbe[] = [];

  register(probe: HealthProbe): void {
    this.#probes.push(probe);
  }

  async checkAll(): Promise<Result<RuntimeHealthReport, PlatformError>> {
    const checks: HealthCheckResult[] = [];
    for (const probe of this.#probes) {
      const result = await probe.check();
      if (!result.ok) {
        checks.push({
          name: probe.name,
          status: "down",
          detail: result.error.message,
        });
      } else {
        checks.push(result.value);
      }
    }

    const status: HealthStatus = checks.some((c) => c.status === "down")
      ? "down"
      : checks.some((c) => c.status === "degraded")
        ? "degraded"
        : "up";

    return ok({
      status,
      checks,
      checkedAt: new Date().toISOString(),
    });
  }
}

export function createDatabaseHealthProbe(
  provider: DatabaseProvider,
): HealthProbe {
  return {
    name: "database",
    async check() {
      const result = await provider.healthCheck();
      if (!result.ok) return result;
      return ok({
        name: "database",
        status: result.value.healthy ? "up" : "down",
        detail: result.value.detail,
      });
    },
  };
}

export function createEventBusHealthProbe(bus: EventBus): HealthProbe {
  return {
    name: "event_bus",
    async check() {
      const dlq = bus.listDeadLetters().length;
      return ok({
        name: "event_bus",
        status: dlq > 100 ? "degraded" : "up",
        detail: `deadLetters=${dlq}`,
      });
    },
  };
}

export function createConfigurationHealthProbe(
  config: InfrastructureConfig,
): HealthProbe {
  return {
    name: "configuration",
    async check() {
      const okConfig =
        config.serviceName.trim().length > 0 &&
        config.outboxMaxAttempts > 0;
      return ok({
        name: "configuration",
        status: okConfig ? "up" : "down",
        detail: okConfig ? "bound" : "invalid",
      });
    },
  };
}
