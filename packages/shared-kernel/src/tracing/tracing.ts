/**
 * Distributed tracing contracts — no APM vendor implementation.
 */

import type { CorrelationId } from "../identifiers/identifiers.js";

export type SpanAttributeValue = string | number | boolean;

export type SpanAttributes = Readonly<Record<string, SpanAttributeValue>>;

export interface Span {
  readonly name: string;
  setAttribute(key: string, value: SpanAttributeValue): void;
  addEvent(name: string, attributes?: SpanAttributes): void;
  recordException(error: unknown): void;
  end(): void;
}

export type StartSpanOptions = {
  readonly attributes?: SpanAttributes;
  readonly correlationId?: CorrelationId;
};

export interface Tracer {
  startSpan(name: string, options?: StartSpanOptions): Span;
  withSpan<T>(
    name: string,
    options: StartSpanOptions | undefined,
    fn: (span: Span) => Promise<T>,
  ): Promise<T>;
}
