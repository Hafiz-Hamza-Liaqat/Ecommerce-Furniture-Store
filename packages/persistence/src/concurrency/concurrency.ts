/**
 * Optimistic concurrency support — no business conflict resolution.
 */

import {
  ConcurrencyError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";

export type AggregateVersion = number;

export type VersionedRecord = {
  readonly id: string;
  readonly version: AggregateVersion;
};

/**
 * Ensures the persisted version matches the expected version before write.
 */
export function assertExpectedVersion(
  current: AggregateVersion | null,
  expected: AggregateVersion,
  aggregateId: string,
): Result<void, PlatformError> {
  if (current === null) {
    if (expected !== 0) {
      return fail(
        new ConcurrencyError("Aggregate does not exist for expected version", {
          code: "aggregate_missing_for_version",
          details: { aggregateId, expected, current },
        }),
      );
    }
    return ok(undefined);
  }

  if (current !== expected) {
    return fail(
      new ConcurrencyError("Optimistic concurrency conflict", {
        code: "optimistic_concurrency_conflict",
        details: { aggregateId, expected, current },
        retryable: true,
      }),
    );
  }

  return ok(undefined);
}

export function nextVersion(current: AggregateVersion): AggregateVersion {
  return current + 1;
}
