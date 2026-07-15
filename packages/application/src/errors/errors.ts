/**
 * Error mapping — infrastructure/domain errors → Result (no HTTP status codes).
 */

import {
  AuthorizationError,
  InfrastructureError,
  PlatformError,
  ValidationError,
  fail,
  ok,
  type Result,
} from "@afh/shared-kernel";

export function mapThrownError(error: unknown): PlatformError {
  if (error instanceof PlatformError) {
    return error;
  }
  if (error instanceof Error) {
    return new InfrastructureError(error.message, {
      code: "unhandled_exception",
      details: { name: error.name },
    });
  }
  return new InfrastructureError("Unknown error", {
    code: "unknown_error",
    details: { error: String(error) },
  });
}

export function toFailureResult<T>(
  error: unknown,
): Result<T, PlatformError> {
  return fail(mapThrownError(error));
}

export function ensureResult<T>(
  value: Result<T, PlatformError>,
): Result<T, PlatformError> {
  return value.ok ? ok(value.value) : fail(value.error);
}

export function authorizationDenied(
  reasonCode: string,
  message: string,
): AuthorizationError {
  return new AuthorizationError(message, {
    code: reasonCode,
  });
}

export function validationFailed(message: string): ValidationError {
  return new ValidationError(message, { code: "validation_failed" });
}
