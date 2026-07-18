import type {
  ReportDefinitionRepository,
  ReportExecutionRepository,
} from "@afh/reporting";
import type { SecurityAuditService } from "@afh/identity";

export type ReportingHandlerDeps = {
  readonly reportDefinitions: ReportDefinitionRepository;
  readonly reportExecutions: ReportExecutionRepository;
  readonly audit: SecurityAuditService;
};
