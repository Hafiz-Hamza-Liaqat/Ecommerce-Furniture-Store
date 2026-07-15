/**
 * @afh/runtime-host — Enterprise Production Readiness Foundation (Phase 9A)
 *
 * Production composition, configuration, secrets, health registration,
 * observability wiring, deployment contracts, and startup validation.
 * No business logic. No architecture redesign.
 */

export * from "./config/index.js";
export * from "./secrets/index.js";
export * from "./health/index.js";
export * from "./validation/index.js";
export * from "./lifecycle/index.js";
export * from "./observability/index.js";
export * from "./host/index.js";
