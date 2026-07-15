/**
 * Deployment contracts — container-friendly startup, readiness, graceful shutdown.
 * No Kubernetes-specific APIs.
 */

import type { ApiHost } from "@afh/api";
import type { MessagingRuntime } from "@afh/messaging-broker";
import type { Logger } from "@afh/shared-kernel";

export type DeploymentLifecycle = {
  readonly started: boolean;
  readonly ready: boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  isLive(): boolean;
  isReady(): Promise<boolean>;
};

export type ProductionHostHandles = {
  readonly host: ApiHost;
  readonly messaging: MessagingRuntime;
  readonly logger: Logger;
  readonly onBeforeStop?: () => Promise<void>;
};

/**
 * Installs SIGTERM/SIGINT handlers that invoke the provided stop routine.
 */
export function installGracefulShutdown(
  logger: Logger,
  stop: () => Promise<void>,
): () => void {
  let stopping = false;

  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info("Graceful shutdown requested", { signal });
    try {
      await stop();
      logger.info("Graceful shutdown complete", { signal });
      process.exitCode = 0;
    } catch (error) {
      logger.error("Graceful shutdown failed", {
        signal,
        error: String(error),
      });
      process.exitCode = 1;
    }
  };

  const onTerm = () => {
    void shutdown("SIGTERM");
  };
  const onInt = () => {
    void shutdown("SIGINT");
  };

  process.on("SIGTERM", onTerm);
  process.on("SIGINT", onInt);

  return () => {
    process.off("SIGTERM", onTerm);
    process.off("SIGINT", onInt);
  };
}

export function createDeploymentLifecycle(
  handles: ProductionHostHandles,
): DeploymentLifecycle {
  let started = false;
  let ready = false;
  let stopping = false;

  return {
    get started() {
      return started;
    },
    get ready() {
      return ready;
    },
    async start() {
      await handles.host.start();
      started = true;
      ready = true;
      handles.logger.info("Deployment lifecycle started", {
        host: handles.host.http.host,
        port: handles.host.http.port,
      });
    },
    async stop() {
      if (stopping) return;
      stopping = true;
      ready = false;
      try {
        await handles.onBeforeStop?.();
      } catch (error) {
        handles.logger.warn("onBeforeStop failed", { error: String(error) });
      }
      if (started) {
        await handles.host.stop();
        started = false;
      } else {
        handles.host.composition.dispose();
      }
      handles.messaging.dispose();
      handles.logger.info("Deployment lifecycle stopped");
    },
    isLive() {
      return started;
    },
    async isReady() {
      if (!started || !ready) return false;
      const report =
        await handles.host.composition.infrastructure.health.checkAll();
      return report.ok && report.value.status !== "down";
    },
  };
}
