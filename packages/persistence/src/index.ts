/**
 * @afh/persistence — Enterprise Persistence Foundation (Phase 1B)
 *
 * Domain-neutral persistence infrastructure only.
 * No business repositories, Event Bus publisher, or domain services.
 */

export * from "./database/index.js";
export * from "./transaction/index.js";
export * from "./concurrency/index.js";
export * from "./mapping/index.js";
export * from "./aggregate/index.js";
export * from "./repository/index.js";
export * from "./events/index.js";
export * from "./outbox/index.js";
export * from "./inbox/index.js";
export * from "./configuration/index.js";
export * from "./composition/index.js";
