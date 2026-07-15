/**
 * @afh/infrastructure — Enterprise Runtime Infrastructure (Phase 5A)
 *
 * Concrete adapters for Shared Kernel + Persistence contracts.
 * Outbox is the sole Event Bus publisher path. No business services or APIs.
 */

export * from "./configuration/index.js";
export * from "./logging/index.js";
export * from "./metrics/index.js";
export * from "./tracing/index.js";
export * from "./serialization/index.js";
export * from "./persistence/index.js";
export * from "./database/index.js";
export * from "./event-bus/index.js";
export * from "./outbox/index.js";
export * from "./inbox/index.js";
export * from "./health/index.js";
export * from "./composition/index.js";
