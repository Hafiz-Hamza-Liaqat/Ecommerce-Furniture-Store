export { ErrorCategory } from "./error-category.js";
export type { ErrorCategoryCode } from "./error-category.js";
export {
  PlatformError,
  ValidationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ConcurrencyError,
  TimeoutError,
  InfrastructureError,
  ExternalDependencyError,
  BusinessRuleError,
  WorkflowViolationError,
  RuleViolationError,
  ApprovalPendingError,
} from "./platform-error.js";
export type { PlatformErrorOptions, ErrorDetails } from "./platform-error.js";
