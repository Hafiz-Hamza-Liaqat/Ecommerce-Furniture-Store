/**
 * Reporting application composition root.
 */

import { HandlerRegistry } from "@afh/application";
import type {
  ReportDefinitionRepository,
  ReportExecutionRepository,
} from "@afh/reporting";
import type { SecurityAuditService } from "@afh/identity";
import {
  createGetReportDefinitionHandler,
  createListReportDefinitionHandler,
  createRunReportHandler,
} from "../handlers/report-handlers.js";
import type { ReportingHandlerDeps } from "../handlers/deps.js";

export type CreateReportingApplicationOptions = {
  readonly reportDefinitions: ReportDefinitionRepository;
  readonly reportExecutions: ReportExecutionRepository;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type ReportingApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: ReportingHandlerDeps;
};

export function createReportingApplication(
  options: CreateReportingApplicationOptions,
): ReportingApplication {
  const deps: ReportingHandlerDeps = {
    reportDefinitions: options.reportDefinitions,
    reportExecutions: options.reportExecutions,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();
  handlers.registerCommand(createRunReportHandler(deps));
  handlers.registerQuery(createGetReportDefinitionHandler(deps));
  handlers.registerQuery(createListReportDefinitionHandler(deps));

  return { handlers, deps };
}
