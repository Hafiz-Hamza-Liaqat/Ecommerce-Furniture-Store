#!/usr/bin/env node
/**
 * Production acceptance suite entry — CI gate.
 */

import { runProductionAcceptanceSuite } from "../hardening/production-acceptance.js";

async function main(): Promise<void> {
  const result = await runProductionAcceptanceSuite();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
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
