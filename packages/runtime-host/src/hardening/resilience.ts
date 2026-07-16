/**
 * Runtime resilience — startup retry, shutdown timeout, transient fault handling.
 * Infrastructure only — no business retries.
 */

import {
  InfrastructureError,
  fail,
  ok,
  type Logger,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";

export type RetryPolicy = {
  readonly maxAttempts: number;
  readonly backoffMs: readonly number[];
};

export const DEFAULT_STARTUP_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffMs: [250, 750, 1_500],
};

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Retries an infrastructure operation with backoff. Cancels on AbortSignal.
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  policy: RetryPolicy,
  options: {
    readonly logger?: Logger;
    readonly label?: string;
    readonly signal?: AbortSignal;
    readonly isTransient?: (error: unknown) => boolean;
  } = {},
): Promise<Result<T, PlatformError>> {
  const isTransient =
    options.isTransient ??
    ((error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      return /busy|locked|ECONNREFUSED|ECONNRESET|timeout|temporar/i.test(msg);
    });

  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    if (options.signal?.aborted) {
      return fail(
        new InfrastructureError("Operation aborted", {
          code: "operation_aborted",
          details: { label: options.label ?? "retry" },
        }),
      );
    }
    try {
      const value = await operation(attempt);
      return ok(value);
    } catch (error) {
      lastError = error;
      const transient = isTransient(error);
      options.logger?.warn("Transient fault during retry", {
        label: options.label ?? "retry",
        attempt,
        transient,
        error: String(error),
      });
      if (!transient || attempt >= policy.maxAttempts) {
        break;
      }
      const backoff =
        policy.backoffMs[Math.min(attempt - 1, policy.backoffMs.length - 1)] ??
        1_000;
      try {
        await sleep(backoff, options.signal);
      } catch {
        return fail(
          new InfrastructureError("Operation aborted during backoff", {
            code: "operation_aborted",
          }),
        );
      }
    }
  }

  return fail(
    new InfrastructureError(
      `Retry exhausted: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      {
        code: "retry_exhausted",
        details: {
          label: options.label ?? "retry",
          maxAttempts: policy.maxAttempts,
        },
        cause: lastError,
      },
    ),
  );
}

/**
 * Runs work with a hard timeout — used for graceful shutdown bounds.
 */
export async function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<Result<T, PlatformError>> {
  if (timeoutMs <= 0) {
    try {
      return ok(await work);
    } catch (cause) {
      return fail(
        new InfrastructureError(`${label} failed`, {
          code: "timeout_work_failed",
          cause,
        }),
      );
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      work.then((value) => ({ kind: "ok" as const, value })),
      new Promise<{ kind: "timeout" }>((resolve) => {
        timer = setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
      }),
    ]);
    if (result.kind === "timeout") {
      return fail(
        new InfrastructureError(`${label} timed out after ${timeoutMs}ms`, {
          code: "shutdown_timeout",
          details: { timeoutMs, label },
        }),
      );
    }
    return ok(result.value);
  } catch (cause) {
    return fail(
      new InfrastructureError(`${label} failed`, {
        code: "timeout_work_failed",
        cause,
      }),
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}
