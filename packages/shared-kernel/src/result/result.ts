/**
 * Canonical platform result model.
 * One implementation for the entire platform — no parallel Result types.
 */

import type { PlatformError } from "../errors/platform-error.js";
import { ErrorCategory } from "../errors/error-category.js";

export type ResultSuccess<T> = {
  readonly ok: true;
  readonly value: T;
};

export type ResultFailure<E extends PlatformError = PlatformError> = {
  readonly ok: false;
  readonly error: E;
};

export type Result<T, E extends PlatformError = PlatformError> =
  | ResultSuccess<T>
  | ResultFailure<E>;

export function ok<T>(value: T): ResultSuccess<T> {
  return { ok: true, value };
}

export function fail<E extends PlatformError>(error: E): ResultFailure<E> {
  return { ok: false, error };
}

export function isOk<T, E extends PlatformError>(
  result: Result<T, E>,
): result is ResultSuccess<T> {
  return result.ok;
}

export function isFail<T, E extends PlatformError>(
  result: Result<T, E>,
): result is ResultFailure<E> {
  return !result.ok;
}

export function isValidationFailure(
  result: Result<unknown>,
): result is ResultFailure {
  return !result.ok && result.error.category === ErrorCategory.Validation;
}

export function isBusinessFailure(
  result: Result<unknown>,
): result is ResultFailure {
  return (
    !result.ok &&
    (result.error.category === ErrorCategory.BusinessRule ||
      result.error.category === ErrorCategory.Conflict ||
      result.error.category === ErrorCategory.WorkflowViolation ||
      result.error.category === ErrorCategory.RuleViolation ||
      result.error.category === ErrorCategory.ApprovalPending)
  );
}

export function isInfrastructureFailure(
  result: Result<unknown>,
): result is ResultFailure {
  return (
    !result.ok &&
    (result.error.category === ErrorCategory.Infrastructure ||
      result.error.category === ErrorCategory.ExternalDependency ||
      result.error.category === ErrorCategory.Timeout)
  );
}

export function mapResult<T, U, E extends PlatformError>(
  result: Result<T, E>,
  map: (value: T) => U,
): Result<U, E> {
  if (result.ok) {
    return ok(map(result.value));
  }
  return result;
}

export function flatMapResult<T, U, E extends PlatformError>(
  result: Result<T, E>,
  map: (value: T) => Result<U, E>,
): Result<U, E> {
  if (result.ok) {
    return map(result.value);
  }
  return result;
}
