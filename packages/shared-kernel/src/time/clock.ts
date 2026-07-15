/**
 * Time abstractions. Business/domain code must depend on Clock,
 * never call the system clock directly.
 */

export type Instant = Date;

export interface Clock {
  /**
   * Current instant in UTC.
   */
  now(): Instant;
}

/**
 * Deterministic clock for tests and controlled scenarios.
 */
export class FixedClock implements Clock {
  constructor(private instant: Instant) {}

  now(): Instant {
    return new Date(this.instant.getTime());
  }

  set(instant: Instant): void {
    this.instant = new Date(instant.getTime());
  }

  advanceByMilliseconds(ms: number): void {
    this.instant = new Date(this.instant.getTime() + ms);
  }
}

/**
 * UTC system clock adapter. Injected at composition root only —
 * domain modules receive Clock, not this concrete type.
 */
export class SystemUtcClock implements Clock {
  now(): Instant {
    return new Date();
  }
}

export function toIsoUtc(instant: Instant): string {
  return instant.toISOString();
}
