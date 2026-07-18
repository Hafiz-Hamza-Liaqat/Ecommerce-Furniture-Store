import type { SecurityAuditService } from "@afh/identity";
import type { HandlerRegistry } from "../handlers/handlers.js";
import { createBulkIoHandlers } from "./handlers.js";
import type { BulkIoEntityAdapter, BulkIoEntityBinding } from "./types.js";

export type RegisterBulkIoHandlersDeps = {
  readonly bindings: readonly BulkIoEntityBinding[];
  readonly adapters: Readonly<Record<string, BulkIoEntityAdapter>>;
  readonly audit?: SecurityAuditService;
};

export function registerBulkIoHandlers(
  handlers: HandlerRegistry,
  deps: RegisterBulkIoHandlersDeps,
): void {
  const created = createBulkIoHandlers(deps);
  handlers.registerCommand(created.importRows);
  handlers.registerCommand(created.exportRows);
  handlers.registerCommand(created.bulkUpdate);
}
