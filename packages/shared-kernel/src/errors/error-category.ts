/**
 * Canonical error categories aligned with Phase 0C Error Model
 * and Phase 1A enterprise error requirements.
 */
export const ErrorCategory = {
  Validation: "validation",
  Authorization: "authorization",
  NotFound: "not_found",
  Conflict: "conflict",
  Concurrency: "concurrency",
  Timeout: "timeout",
  Infrastructure: "infrastructure",
  ExternalDependency: "external_dependency",
  BusinessRule: "business_rule",
  WorkflowViolation: "workflow_violation",
  RuleViolation: "rule_violation",
  ApprovalPending: "approval_pending",
} as const;

export type ErrorCategoryCode =
  (typeof ErrorCategory)[keyof typeof ErrorCategory];
