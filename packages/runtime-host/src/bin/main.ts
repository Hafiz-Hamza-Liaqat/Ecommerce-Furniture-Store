#!/usr/bin/env node
/**
 * Production process entry — container-friendly startup.
 */

import { createProductionHost } from "../host/create-production-host.js";

async function main(): Promise<void> {
  const production = await createProductionHost({ autoStart: true });
  production.logger.info("afh-runtime listening", {
    host: production.api.http.host,
    port: production.api.http.port,
    profile: production.config.profile,
  });
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: "fatal",
      message: "Production host failed to start",
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
