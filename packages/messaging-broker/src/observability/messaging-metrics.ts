/**
 * Messaging observability — Phase 0F Metrics contracts.
 */

import type { Metrics } from "@afh/shared-kernel";

export class MessagingMetrics {
  constructor(private readonly metrics: Metrics) {}

  publish(topic: string): void {
    this.metrics.counter("messaging.publish").add(1, { topic });
  }

  throughput(count: number): void {
    this.metrics.counter("messaging.consumer.throughput").add(count);
  }

  retry(source: string): void {
    this.metrics.counter("messaging.retry").add(1, { source });
  }

  lag(pending: number): void {
    this.metrics.gauge("messaging.consumer.lag").set(pending);
  }

  dlq(source: string): void {
    this.metrics.counter("messaging.dlq").add(1, { source });
    this.metrics.gauge("messaging.dlq.depth").set(0);
  }

  setDlqDepth(depth: number): void {
    this.metrics.gauge("messaging.dlq.depth").set(depth);
  }

  latency(ms: number): void {
    this.metrics.histogram("messaging.processing.latency_ms").record(ms);
  }
}
