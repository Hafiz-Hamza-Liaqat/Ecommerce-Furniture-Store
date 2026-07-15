/**
 * Validation foundation contracts — no business validation rules.
 */

import type { Result } from "../result/result.js";
import type { PlatformError } from "../errors/platform-error.js";
import { ValidationError } from "../errors/platform-error.js";
import { fail, ok } from "../result/result.js";

export type FieldViolation = {
  readonly field: string;
  readonly code: string;
  readonly message: string;
};

export type ValidationOutcome = {
  readonly valid: boolean;
  readonly violations: readonly FieldViolation[];
};

export function validationOk(): ValidationOutcome {
  return { valid: true, violations: [] };
}

export function validationFail(
  violations: readonly FieldViolation[],
): ValidationOutcome {
  return { valid: false, violations };
}

export function toValidationResult(
  outcome: ValidationOutcome,
): Result<void, ValidationError> {
  if (outcome.valid) {
    return ok(undefined);
  }
  return fail(
    new ValidationError("Validation failed", {
      code: "validation_failed",
      details: { violations: outcome.violations },
    }),
  );
}

/**
 * Generic validator contract. Domain validators implement this later.
 */
export interface Validator<T> {
  validate(input: T): ValidationOutcome | Promise<ValidationOutcome>;
}

export interface ValidationPipeline<T> {
  validate(input: T): Result<T, PlatformError> | Promise<Result<T, PlatformError>>;
}
