/**
 * @afh/workflow-application — Workflow & Approval operator CQRS (RC6.2)
 *
 * Thin handlers that delegate lifecycle and approval decisions to the
 * existing platform engines. No HTTP, SQL, or UI.
 */

export * from "./constants.js";
export * from "./commands/index.js";
export * from "./queries/index.js";
export * from "./validators/index.js";
export * from "./handlers/index.js";
export * from "./support/index.js";
export * from "./composition/index.js";
