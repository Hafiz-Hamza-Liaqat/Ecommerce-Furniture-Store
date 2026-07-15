/**
 * In-memory metrics — implements Shared Kernel Metrics.
 */

import type {
  Counter,
  Gauge,
  Histogram,
  MetricLabels,
  Metrics,
} from "@afh/shared-kernel";

class InMemoryCounter implements Counter {
  value = 0;
  add(amount: number, labels?: MetricLabels): void {
    void labels;
    this.value += amount;
  }
}

class InMemoryHistogram implements Histogram {
  readonly samples: number[] = [];
  record(value: number, labels?: MetricLabels): void {
    void labels;
    this.samples.push(value);
  }
}

class InMemoryGauge implements Gauge {
  value = 0;
  set(value: number, labels?: MetricLabels): void {
    void labels;
    this.value = value;
  }
}

export type Timer = {
  stop(): number;
};

export class InMemoryMetrics implements Metrics {
  readonly counters = new Map<string, InMemoryCounter>();
  readonly histograms = new Map<string, InMemoryHistogram>();
  readonly gauges = new Map<string, InMemoryGauge>();

  counter(name: string, description?: string): Counter {
    void description;
    let c = this.counters.get(name);
    if (!c) {
      c = new InMemoryCounter();
      this.counters.set(name, c);
    }
    return c;
  }

  histogram(name: string, description?: string): Histogram {
    void description;
    let h = this.histograms.get(name);
    if (!h) {
      h = new InMemoryHistogram();
      this.histograms.set(name, h);
    }
    return h;
  }

  gauge(name: string, description?: string): Gauge {
    void description;
    let g = this.gauges.get(name);
    if (!g) {
      g = new InMemoryGauge();
      this.gauges.set(name, g);
    }
    return g;
  }

  startTimer(name: string): Timer {
    const started = Date.now();
    const hist = this.histogram(name);
    return {
      stop(): number {
        const elapsed = Date.now() - started;
        hist.record(elapsed);
        return elapsed;
      },
    };
  }
}
