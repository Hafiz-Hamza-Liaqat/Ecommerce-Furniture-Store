/**
 * Broker operational hardening helpers — inspection, poison detection, replay safety.
 * Does not modify Event Bus contracts. Outbox remains sole business publish path.
 */

import type { MessagingRuntime } from "@afh/messaging-broker";
import { RetryEngine } from "@afh/messaging-broker";
import {
  InfrastructureError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";

export type DlqInspectionReport = {
  readonly depth: number;
  readonly sampleIds: readonly string[];
  readonly alreadyReplayed: number;
  readonly eligibleForReplay: number;
};

export type ReplaySafetyResult = {
  readonly dlqId: string;
  readonly safe: boolean;
  readonly reason: string;
};

/**
 * Inspect DLQ depth and sample records for operators.
 */
export function inspectDeadLetterQueue(
  messaging: MessagingRuntime,
  sampleLimit = 20,
): Result<DlqInspectionReport, PlatformError> {
  const depth = messaging.dlq.depth();
  if (!depth.ok) return depth;
  const list = messaging.dlq.list(sampleLimit);
  if (!list.ok) return list;

  let alreadyReplayed = 0;
  let eligibleForReplay = 0;
  const sampleIds: string[] = [];
  for (const row of list.value) {
    sampleIds.push(row.dlqId);
    if (row.replayedAt) alreadyReplayed += 1;
    else eligibleForReplay += 1;
  }

  return ok({
    depth: depth.value,
    sampleIds,
    alreadyReplayed,
    eligibleForReplay,
  });
}

/**
 * Validates that a DLQ record is safe to replay (exists, not already replayed).
 * Does not perform replay — operator must call messaging.dlq.replay explicitly.
 */
export function validateReplaySafety(
  messaging: MessagingRuntime,
  dlqId: string,
): Result<ReplaySafetyResult, PlatformError> {
  if (!dlqId.trim()) {
    return fail(
      new InfrastructureError("dlqId required", { code: "dlq_id_required" }),
    );
  }
  const list = messaging.dlq.list(500);
  if (!list.ok) return list;
  const row = list.value.find((r) => r.dlqId === dlqId);
  if (!row) {
    return ok({
      dlqId,
      safe: false,
      reason: "not_found",
    });
  }
  if (row.replayedAt) {
    return ok({
      dlqId,
      safe: false,
      reason: "already_replayed",
    });
  }
  if (!row.topic?.trim()) {
    return ok({
      dlqId,
      safe: false,
      reason: "missing_topic",
    });
  }
  return ok({
    dlqId,
    safe: true,
    reason: "eligible",
  });
}

/**
 * Poison detection decision using existing RetryEngine — no business retries.
 */
export function detectPoisonMessage(
  messaging: MessagingRuntime,
  input: {
    readonly attempts: number;
    readonly errorMessage: string;
    readonly poison?: boolean;
  },
): { readonly kind: "retry" | "dead_letter"; readonly attempts: number } {
  const engine = new RetryEngine({
    maxAttempts: messaging.config.maxAttempts,
    backoffMs: messaging.config.backoffMs,
  });
  const decision = engine.decide({
    attempts: input.attempts,
    errorMessage: input.errorMessage,
    now: new Date(),
    ...(input.poison !== undefined ? { poison: input.poison } : {}),
  });
  return { kind: decision.kind, attempts: decision.attempts };
}

/**
 * Summarize consumer concurrency / poison / retry tuning for diagnostics.
 */
export function summarizeBrokerHardening(messaging: MessagingRuntime): {
  readonly consumerConcurrency: number;
  readonly poisonThreshold: number;
  readonly maxAttempts: number;
  readonly backoffMs: readonly number[];
  readonly claimLeaseMs: number;
  readonly batchSize: number;
} {
  const c = messaging.config;
  return {
    consumerConcurrency: c.consumerConcurrency,
    poisonThreshold: c.poisonThreshold,
    maxAttempts: c.maxAttempts,
    backoffMs: c.backoffMs,
    claimLeaseMs: c.claimLeaseMs,
    batchSize: c.batchSize,
  };
}
