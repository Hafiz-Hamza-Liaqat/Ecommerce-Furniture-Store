/**
 * Units and measurement primitives — no conversion engine beyond shared types.
 */

export type UnitCode = string;

export type UnitOfMeasure = {
  readonly code: UnitCode;
  readonly name: string;
  readonly dimension:
    | "count"
    | "length"
    | "area"
    | "volume"
    | "weight"
    | "time"
    | "other";
};

export type Measurement = {
  readonly value: number;
  readonly unitCode: UnitCode;
};

export type Dimensions = {
  readonly length: Measurement | null;
  readonly width: Measurement | null;
  readonly height: Measurement | null;
};

export type Weight = Measurement;
export type Area = Measurement;
export type Volume = Measurement;
