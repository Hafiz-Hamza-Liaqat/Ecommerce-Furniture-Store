/**
 * Metrics contracts — no monitoring vendor implementation.
 */

export type MetricLabels = Readonly<Record<string, string>>;

export interface Counter {
  add(value: number, labels?: MetricLabels): void;
}

export interface Histogram {
  record(value: number, labels?: MetricLabels): void;
}

export interface Gauge {
  set(value: number, labels?: MetricLabels): void;
}

export interface Metrics {
  counter(name: string, description?: string): Counter;
  histogram(name: string, description?: string): Histogram;
  gauge(name: string, description?: string): Gauge;
}
