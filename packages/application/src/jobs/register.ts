import type { SecurityAuditService } from "@afh/identity";
import type { HandlerRegistry } from "../handlers/handlers.js";
import { createJobHandlers } from "./handlers.js";
import type { BackgroundJobRepository } from "./types.js";

export type RegisterJobHandlersDeps = {
  readonly jobs: BackgroundJobRepository;
  readonly audit?: SecurityAuditService;
};

export function registerJobHandlers(
  handlers: HandlerRegistry,
  deps: RegisterJobHandlersDeps,
): void {
  const created = createJobHandlers(deps);
  handlers.registerCommand(created.enqueue);
  handlers.registerCommand(created.complete);
  handlers.registerCommand(created.fail);
  handlers.registerQuery(created.get);
  handlers.registerQuery(created.list);
}
