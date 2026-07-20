/**
 * RC10.6 — Aggregation + report composition.
 */

import { filterSnapshot } from "./filter";
import {
  computeCrm,
  computeCustomers,
  computeExecutive,
  computePlanner,
  computeProduction,
  computeSales,
} from "./metrics";
import { loadBiSnapshot, type BiSnapshot } from "./source";
import type { BiFilters, BiReport, BiExtensionHooks } from "./types";
import { DEFAULT_BI_FILTERS } from "./types";

let extensionHooks: BiExtensionHooks = {};

/** RC10.7+ extension registration — no-op consumers in RC10.6. */
export function registerBiExtensionHooks(hooks: BiExtensionHooks): void {
  extensionHooks = { ...extensionHooks, ...hooks };
  void extensionHooks;
}

export function buildBiReport(
  filters: BiFilters = DEFAULT_BI_FILTERS,
  snapshot?: BiSnapshot,
): BiReport {
  const raw = snapshot ?? loadBiSnapshot();
  const filtered = filterSnapshot(raw, filters);
  return {
    generatedAt: new Date().toISOString(),
    filters,
    executive: computeExecutive(filtered),
    sales: computeSales(filtered),
    crm: computeCrm(filtered),
    production: computeProduction(filtered),
    customers: computeCustomers(filtered),
    planner: computePlanner(filtered),
  };
}
