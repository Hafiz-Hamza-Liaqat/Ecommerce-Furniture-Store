/**
 * Observability hooks for transport — reuse infrastructure telemetry.
 */

import {
  CorrelationId,
  type Logger,
  type Metrics,
  type Tracer,
} from "@afh/shared-kernel";
import type { TransportRequest, TransportResponse } from "../transport/contracts.js";

export type TransportObservability = {
  readonly logger: Logger;
  readonly metrics: Metrics;
  readonly tracer: Tracer;
};

export async function withTransportSpan<T>(
  obs: TransportObservability,
  name: string,
  correlationId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return obs.tracer.withSpan(
    name,
    {
      correlationId: CorrelationId.from(correlationId),
      attributes: { correlation_id: correlationId },
    },
    async (span) => {
      span.setAttribute("correlation_id", correlationId);
      try {
        return await fn();
      } catch (error) {
        span.recordException(error);
        throw error;
      }
    },
  );
}

export function recordTransportMetrics(
  obs: TransportObservability,
  request: TransportRequest,
  response: TransportResponse,
  durationMs: number,
): void {
  const labels = {
    method: request.method,
    path: request.path,
    status: String(response.status),
  };
  obs.metrics.counter("api.http.requests").add(1, labels);
  obs.metrics
    .histogram("api.http.duration_ms")
    .record(durationMs, {
      method: request.method,
      path: request.path,
    });
  if (response.status >= 500) {
    obs.metrics.counter("api.http.errors").add(1, {
      method: request.method,
      path: request.path,
    });
  }
}
