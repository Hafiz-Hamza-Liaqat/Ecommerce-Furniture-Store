/**
 * Shared identifier abstractions — no business-specific IDs.
 */

export type UuidString = string & { readonly __brand?: "UuidString" };

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

export abstract class Identifier {
  readonly value: string;

  protected constructor(value: string, name: string) {
    assertNonEmpty(value, name);
    this.value = value;
  }

  equals(other: Identifier | null | undefined): boolean {
    return other !== null && other !== undefined && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class AggregateId extends Identifier {
  private constructor(value: string) {
    super(value, "AggregateId");
  }

  static from(value: string): AggregateId {
    return new AggregateId(value);
  }
}

export class EventId extends Identifier {
  private constructor(value: string) {
    super(value, "EventId");
  }

  static from(value: string): EventId {
    return new EventId(value);
  }
}

export class CommandId extends Identifier {
  private constructor(value: string) {
    super(value, "CommandId");
  }

  static from(value: string): CommandId {
    return new CommandId(value);
  }
}

export class QueryId extends Identifier {
  private constructor(value: string) {
    super(value, "QueryId");
  }

  static from(value: string): QueryId {
    return new QueryId(value);
  }
}

export class CorrelationId extends Identifier {
  private constructor(value: string) {
    super(value, "CorrelationId");
  }

  static from(value: string): CorrelationId {
    return new CorrelationId(value);
  }
}

export class CausationId extends Identifier {
  private constructor(value: string) {
    super(value, "CausationId");
  }

  static from(value: string): CausationId {
    return new CausationId(value);
  }
}

export class SagaId extends Identifier {
  private constructor(value: string) {
    super(value, "SagaId");
  }

  static from(value: string): SagaId {
    return new SagaId(value);
  }
}

export class IdempotencyKey extends Identifier {
  private constructor(value: string) {
    super(value, "IdempotencyKey");
  }

  static from(value: string): IdempotencyKey {
    return new IdempotencyKey(value);
  }
}
