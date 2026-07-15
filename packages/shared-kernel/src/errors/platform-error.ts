import { ErrorCategory, type ErrorCategoryCode } from "./error-category.js";

export type ErrorDetails = Readonly<Record<string, unknown>>;

export type PlatformErrorOptions = {
  readonly code: string;
  readonly message: string;
  readonly category: ErrorCategoryCode;
  readonly details?: ErrorDetails;
  readonly cause?: unknown;
  readonly correlationId?: string;
  readonly retryable?: boolean;
};

type SpecializedErrorOptions = {
  readonly code?: string;
  readonly details?: ErrorDetails;
  readonly cause?: unknown;
  readonly correlationId?: string;
  readonly retryable?: boolean;
};

function buildOptions(
  category: ErrorCategoryCode,
  message: string,
  defaultCode: string,
  defaultRetryable: boolean,
  options?: SpecializedErrorOptions,
): PlatformErrorOptions {
  const built: PlatformErrorOptions = {
    code: options?.code ?? defaultCode,
    message,
    category,
    retryable: options?.retryable ?? defaultRetryable,
  };

  if (options?.details !== undefined) {
    (built as { details?: ErrorDetails }).details = options.details;
  }
  if (options?.cause !== undefined) {
    (built as { cause?: unknown }).cause = options.cause;
  }
  if (options?.correlationId !== undefined) {
    (built as { correlationId?: string }).correlationId = options.correlationId;
  }

  return built;
}

/**
 * Canonical platform error. Domains must not invent parallel error roots.
 */
export class PlatformError extends Error {
  readonly code: string;
  readonly category: ErrorCategoryCode;
  readonly details: ErrorDetails;
  readonly correlationId: string | undefined;
  readonly retryable: boolean;

  constructor(options: PlatformErrorOptions) {
    if (options.cause !== undefined) {
      super(options.message, { cause: options.cause });
    } else {
      super(options.message);
    }
    this.name = "PlatformError";
    this.code = options.code;
    this.category = options.category;
    this.details = options.details ?? {};
    this.correlationId = options.correlationId;
    this.retryable = options.retryable ?? false;
  }
}

export class ValidationError extends PlatformError {
  constructor(message: string, options?: SpecializedErrorOptions) {
    super(
      buildOptions(
        ErrorCategory.Validation,
        message,
        "validation_failed",
        false,
        options,
      ),
    );
    this.name = "ValidationError";
  }
}

export class AuthorizationError extends PlatformError {
  constructor(message: string, options?: SpecializedErrorOptions) {
    super(
      buildOptions(
        ErrorCategory.Authorization,
        message,
        "authorization_denied",
        false,
        options,
      ),
    );
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends PlatformError {
  constructor(message: string, options?: SpecializedErrorOptions) {
    super(
      buildOptions(ErrorCategory.NotFound, message, "not_found", false, options),
    );
    this.name = "NotFoundError";
  }
}

export class ConflictError extends PlatformError {
  constructor(message: string, options?: SpecializedErrorOptions) {
    super(
      buildOptions(ErrorCategory.Conflict, message, "conflict", false, options),
    );
    this.name = "ConflictError";
  }
}

export class ConcurrencyError extends PlatformError {
  constructor(message: string, options?: SpecializedErrorOptions) {
    super(
      buildOptions(
        ErrorCategory.Concurrency,
        message,
        "concurrency_conflict",
        true,
        options,
      ),
    );
    this.name = "ConcurrencyError";
  }
}

export class TimeoutError extends PlatformError {
  constructor(message: string, options?: SpecializedErrorOptions) {
    super(
      buildOptions(ErrorCategory.Timeout, message, "timeout", true, options),
    );
    this.name = "TimeoutError";
  }
}

export class InfrastructureError extends PlatformError {
  constructor(message: string, options?: SpecializedErrorOptions) {
    super(
      buildOptions(
        ErrorCategory.Infrastructure,
        message,
        "infrastructure_failure",
        true,
        options,
      ),
    );
    this.name = "InfrastructureError";
  }
}

export class ExternalDependencyError extends PlatformError {
  constructor(message: string, options?: SpecializedErrorOptions) {
    super(
      buildOptions(
        ErrorCategory.ExternalDependency,
        message,
        "external_dependency_failure",
        true,
        options,
      ),
    );
    this.name = "ExternalDependencyError";
  }
}

export class BusinessRuleError extends PlatformError {
  constructor(message: string, options?: SpecializedErrorOptions) {
    super(
      buildOptions(
        ErrorCategory.BusinessRule,
        message,
        "business_rule_failed",
        false,
        options,
      ),
    );
    this.name = "BusinessRuleError";
  }
}

export class WorkflowViolationError extends PlatformError {
  constructor(message: string, options?: SpecializedErrorOptions) {
    super(
      buildOptions(
        ErrorCategory.WorkflowViolation,
        message,
        "workflow_violation",
        false,
        options,
      ),
    );
    this.name = "WorkflowViolationError";
  }
}

export class RuleViolationError extends PlatformError {
  constructor(message: string, options?: SpecializedErrorOptions) {
    super(
      buildOptions(
        ErrorCategory.RuleViolation,
        message,
        "rule_violation",
        false,
        options,
      ),
    );
    this.name = "RuleViolationError";
  }
}

export class ApprovalPendingError extends PlatformError {
  constructor(message: string, options?: SpecializedErrorOptions) {
    super(
      buildOptions(
        ErrorCategory.ApprovalPending,
        message,
        "approval_pending",
        false,
        options,
      ),
    );
    this.name = "ApprovalPendingError";
  }
}
