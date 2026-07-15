/**
 * Build Command/Query envelopes for Application Runtime dispatch.
 */

import type { Command, Query } from "@afh/shared-kernel";
import {
  CausationId,
  CommandId,
  CorrelationId,
  IdempotencyKey,
  QueryId,
} from "@afh/shared-kernel";

export function buildCommand<TPayload>(input: {
  readonly commandType: string;
  readonly payload: TPayload;
  readonly correlationId: string;
  readonly companyId: string | null;
  readonly actorId: string | null;
  readonly idempotencyKey?: string | null;
  readonly clock: { now(): Date };
}): Command<TPayload> {
  const commandId = CommandId.from(crypto.randomUUID());
  return {
    commandId,
    commandType: input.commandType,
    payload: input.payload,
    metadata: {
      correlationId: CorrelationId.from(input.correlationId),
      causationId: CausationId.from(commandId.value),
      companyId: input.companyId,
      actorId: input.actorId,
      issuedAt: input.clock.now(),
    },
    idempotencyKey: input.idempotencyKey
      ? IdempotencyKey.from(input.idempotencyKey)
      : null,
  };
}

export function buildQuery<TPayload>(input: {
  readonly queryType: string;
  readonly payload: TPayload;
  readonly correlationId: string;
  readonly companyId: string | null;
  readonly actorId: string | null;
  readonly clock: { now(): Date };
}): Query<TPayload> {
  return {
    queryId: QueryId.from(crypto.randomUUID()),
    queryType: input.queryType,
    payload: input.payload,
    metadata: {
      correlationId: CorrelationId.from(input.correlationId),
      causationId: null,
      companyId: input.companyId,
      actorId: input.actorId,
      issuedAt: input.clock.now(),
    },
  };
}
