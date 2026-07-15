/**
 * In-memory tracer — correlation-aware spans. No APM vendor.
 */

import type {
  CorrelationId,
  Span,
  SpanAttributeValue,
  SpanAttributes,
  StartSpanOptions,
  Tracer,
} from "@afh/shared-kernel";

class InMemorySpan implements Span {
  readonly name: string;
  readonly attributes: Record<string, SpanAttributeValue> = {};
  readonly events: { name: string; attributes?: SpanAttributes }[] = [];
  readonly exceptions: unknown[] = [];
  ended = false;
  readonly correlationId: CorrelationId | null;

  constructor(name: string, options?: StartSpanOptions) {
    this.name = name;
    this.correlationId = options?.correlationId ?? null;
    if (options?.attributes) {
      Object.assign(this.attributes, options.attributes);
    }
  }

  setAttribute(key: string, value: SpanAttributeValue): void {
    this.attributes[key] = value;
  }

  addEvent(name: string, attributes?: SpanAttributes): void {
    if (attributes === undefined) {
      this.events.push({ name });
    } else {
      this.events.push({ name, attributes });
    }
  }

  recordException(error: unknown): void {
    this.exceptions.push(error);
  }

  end(): void {
    this.ended = true;
  }
}

export class InMemoryTracer implements Tracer {
  readonly spans: InMemorySpan[] = [];

  startSpan(name: string, options?: StartSpanOptions): Span {
    const span = new InMemorySpan(name, options);
    this.spans.push(span);
    return span;
  }

  async withSpan<T>(
    name: string,
    options: StartSpanOptions | undefined,
    fn: (span: Span) => Promise<T>,
  ): Promise<T> {
    const span = this.startSpan(name, options);
    try {
      return await fn(span);
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}
