/**
 * Map Phase 1A PlatformError → transport responses.
 * No second error hierarchy.
 */

import {
  ErrorCategory,
  type PlatformError,
} from "@afh/shared-kernel";
import type { ErrorBodyDto } from "../dto/dto.js";
import { jsonResponse, type TransportResponse } from "../transport/contracts.js";

export function httpStatusForError(error: PlatformError): number {
  switch (error.category) {
    case ErrorCategory.Validation:
      return 400;
    case ErrorCategory.Authorization:
      return 403;
    case ErrorCategory.NotFound:
      return 404;
    case ErrorCategory.Conflict:
    case ErrorCategory.Concurrency:
      return 409;
    case ErrorCategory.ApprovalPending:
      return 202;
    case ErrorCategory.Timeout:
      return 504;
    case ErrorCategory.ExternalDependency:
      return 502;
    case ErrorCategory.Infrastructure:
      return 503;
    case ErrorCategory.BusinessRule:
    case ErrorCategory.WorkflowViolation:
    case ErrorCategory.RuleViolation:
      return 422;
    default:
      return 500;
  }
}

export function toErrorBodyDto(
  error: PlatformError,
  correlationId: string | null,
): ErrorBodyDto {
  return {
    error: {
      code: error.code,
      category: error.category,
      message: error.message,
      details: error.details,
      retryable: error.retryable,
      correlationId: error.correlationId ?? correlationId,
    },
  };
}

export function platformErrorResponse(
  error: PlatformError,
  correlationId: string | null,
  extraHeaders: Record<string, string> = {},
): TransportResponse {
  const status = httpStatusForError(error);
  return jsonResponse(status, toErrorBodyDto(error, correlationId), {
    ...(correlationId ? { "x-correlation-id": correlationId } : {}),
    ...extraHeaders,
  });
}

export function unauthorizedResponse(
  correlationId: string | null,
  message = "Authentication required",
): TransportResponse {
  return jsonResponse(
    401,
    {
      error: {
        code: "unauthenticated",
        category: ErrorCategory.Authorization,
        message,
        details: {},
        retryable: false,
        correlationId,
      },
    },
    correlationId ? { "x-correlation-id": correlationId } : {},
  );
}

export function validationIssuesResponse(
  issues: readonly { field: string; code: string; message: string }[],
  correlationId: string | null,
): TransportResponse {
  return jsonResponse(
    400,
    {
      error: {
        code: "transport_validation_failed",
        category: ErrorCategory.Validation,
        message: "Request failed structural validation",
        details: { issues },
        retryable: false,
        correlationId,
      },
    },
    correlationId ? { "x-correlation-id": correlationId } : {},
  );
}
