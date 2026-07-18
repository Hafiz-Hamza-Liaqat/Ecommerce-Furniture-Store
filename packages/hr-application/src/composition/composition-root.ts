/**
 * HR application composition root.
 */

import { HandlerRegistry } from "@afh/application";
import type { EmployeeRepository } from "@afh/hr";
import type { SecurityAuditService } from "@afh/identity";
import {
  createCreateEmployeeHandler,
  createGetEmployeeHandler,
  createListEmployeeHandler,
} from "../handlers/employee-handlers.js";
import type { HrHandlerDeps } from "../handlers/deps.js";

export type CreateHrApplicationOptions = {
  readonly employees: EmployeeRepository;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type HrApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: HrHandlerDeps;
};

export function createHrApplication(
  options: CreateHrApplicationOptions,
): HrApplication {
  const deps: HrHandlerDeps = {
    employees: options.employees,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();
  handlers.registerCommand(createCreateEmployeeHandler(deps));
  handlers.registerQuery(createGetEmployeeHandler(deps));
  handlers.registerQuery(createListEmployeeHandler(deps));

  return { handlers, deps };
}
