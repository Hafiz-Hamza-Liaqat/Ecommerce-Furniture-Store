/**
 * Command and Query contracts — no handlers, dispatchers, or routing.
 */

import type {
  CausationId,
  CommandId,
  CorrelationId,
  IdempotencyKey,
  QueryId,
} from "../identifiers/identifiers.js";
import type { Result } from "../result/result.js";
import type { PlatformError } from "../errors/platform-error.js";

export type MessageMetadata = {
  readonly correlationId: CorrelationId;
  readonly causationId: CausationId | null;
  readonly companyId: string | null;
  readonly actorId: string | null;
  readonly issuedAt: Date;
};

export interface Command<TPayload = Readonly<Record<string, unknown>>> {
  readonly commandId: CommandId;
  readonly commandType: string;
  readonly payload: TPayload;
  readonly metadata: MessageMetadata;
  readonly idempotencyKey: IdempotencyKey | null;
}

export interface Query<TPayload = Readonly<Record<string, unknown>>> {
  readonly queryId: QueryId;
  readonly queryType: string;
  readonly payload: TPayload;
  readonly metadata: MessageMetadata;
}

export type CommandResponse<T = unknown> = Result<T, PlatformError>;
export type QueryResponse<T = unknown> = Result<T, PlatformError>;
