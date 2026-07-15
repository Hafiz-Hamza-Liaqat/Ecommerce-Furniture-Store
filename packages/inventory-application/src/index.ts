/**
 * @afh/inventory-application — Enterprise Inventory Application Services (Phase 6C)
 *
 * Command/query handlers orchestrating Inventory domain foundations through the
 * Phase 5B application pipeline. Mirrors Phase 6A/6B pattern. No HTTP, SQL, or UI.
 */

export * from "./constants.js";
export * from "./commands/index.js";
export * from "./queries/index.js";
export * from "./validators/index.js";
export * from "./handlers/index.js";
export * from "./support/index.js";
export * from "./composition/index.js";
