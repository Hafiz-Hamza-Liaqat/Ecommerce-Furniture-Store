/**
 * Retry engine — exponential backoff, limits, retry metadata.
 * No domain-specific retry logic.
 */

import type { MessagingConfig } from "../config/messaging-config.js";

export type RetryDecision =
  | {
      readonly kind: "retry";
      readonly attempts: number;
      readonly nextAttemptAt: string;
      readonly backoffMs: number;
    }
  | {
      readonly kind: "dead_letter";
      readonly attempts: number;
      readonly reason: string;
    };

export type RetryMetadata = {
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly lastError: string | null;
  readonly nextAttemptAt: string | null;
};

export class RetryEngine {
  constructor(private readonly config: Pick<MessagingConfig, "maxAttempts" | "backoffMs">) {}

  decide(input: {
    readonly attempts: number;
    readonly errorMessage: string;
    readonly now: Date;
    readonly poison?: boolean;
  }): RetryDecision {
    const attempts = input.attempts + 1;
    if (input.poison || attempts >= this.config.maxAttempts) {
      return {
        kind: "dead_letter",
        attempts,
        reason: input.poison
          ? `poison:${input.errorMessage}`
          : input.errorMessage,
      };
    }
    const idx = Math.min(attempts - 1, this.config.backoffMs.length - 1);
    const backoffMs = this.config.backoffMs[idx] ?? 3_600_000;
    return {
      kind: "retry",
      attempts,
      backoffMs,
      nextAttemptAt: new Date(input.now.getTime() + backoffMs).toISOString(),
    };
  }

  metadata(input: {
    readonly attempts: number;
    readonly lastError: string | null;
    readonly nextAttemptAt: string | null;
  }): RetryMetadata {
    return {
      attempts: input.attempts,
      maxAttempts: this.config.maxAttempts,
      lastError: input.lastError,
      nextAttemptAt: input.nextAttemptAt,
    };
  }
}
