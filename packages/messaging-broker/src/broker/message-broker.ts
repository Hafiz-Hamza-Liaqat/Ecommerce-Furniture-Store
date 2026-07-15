/**
 * Production message broker contracts — publish/subscribe/ack/retry/DLQ.
 * Business modules remain unaware of this adapter.
 */

import type { EventEnvelope } from "@afh/infrastructure";
import type { PlatformError, Result } from "@afh/shared-kernel";

export type BrokerMessageStatus =
  | "pending"
  | "inflight"
  | "acked"
  | "dead";

export type BrokerMessage = {
  readonly id: string;
  readonly topic: string;
  readonly envelope: EventEnvelope;
  readonly status: BrokerMessageStatus;
  readonly attempts: number;
  readonly nextAttemptAt: string | null;
  readonly lockedUntil: string | null;
  readonly lastError: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type BrokerClaim = {
  readonly message: BrokerMessage;
};

export interface MessageBroker {
  readonly endpoint: string;
  publish(envelope: EventEnvelope): Promise<Result<{ brokerId: string }, PlatformError>>;
  claim(input: {
    readonly batchSize: number;
    readonly leaseMs: number;
    readonly now: Date;
  }): Promise<Result<readonly BrokerClaim[], PlatformError>>;
  acknowledge(brokerId: string): Promise<Result<void, PlatformError>>;
  scheduleRetry(input: {
    readonly brokerId: string;
    readonly attempts: number;
    readonly nextAttemptAt: string;
    readonly errorMessage: string;
  }): Promise<Result<void, PlatformError>>;
  moveToDeadLetter(input: {
    readonly brokerId: string;
    readonly reason: string;
    readonly attempts: number;
    readonly diagnostics?: Readonly<Record<string, unknown>>;
  }): Promise<Result<void, PlatformError>>;
  pendingDepth(): Promise<Result<number, PlatformError>>;
  inflightDepth(): Promise<Result<number, PlatformError>>;
  healthCheck(): Promise<Result<{ healthy: boolean; detail: string }, PlatformError>>;
  dispose(): void;
}
