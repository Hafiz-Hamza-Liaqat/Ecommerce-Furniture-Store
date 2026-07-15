/**
 * Correlation propagation helpers — reuse existing identifiers only.
 */

import type { EventEnvelope } from "@afh/infrastructure";
import { extractEnvelopeCorrelation } from "@afh/infrastructure";

export type PropagatedCorrelation = {
  readonly correlationId: string | null;
  readonly causationId: string | null;
  readonly eventId: string | null;
  readonly traceContext: string | null;
};

export function propagateCorrelation(
  envelope: EventEnvelope,
): PropagatedCorrelation {
  const fromPayload = extractEnvelopeCorrelation(envelope.payloadJson);
  return {
    correlationId: envelope.correlationId ?? fromPayload.correlationId,
    causationId: envelope.causationId ?? fromPayload.causationId,
    eventId: envelope.eventId ?? fromPayload.eventId,
    traceContext:
      envelope.traceContext ??
      envelope.correlationId ??
      fromPayload.traceContext,
  };
}

export function withPropagatedCorrelation(
  envelope: EventEnvelope,
): EventEnvelope {
  const c = propagateCorrelation(envelope);
  return {
    ...envelope,
    correlationId: c.correlationId,
    causationId: c.causationId,
    eventId: c.eventId,
    traceContext: c.traceContext,
  };
}
