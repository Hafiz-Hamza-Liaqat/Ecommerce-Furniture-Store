/**
 * JSON serializers for commands, queries, events, DTOs.
 */

import {
  ValidationError,
  fail,
  ok,
  type PlatformError,
  type Result,
  type Serializer,
} from "@afh/shared-kernel";

export class JsonSerializer<T = unknown> implements Serializer<T> {
  serialize(value: T): Result<string, PlatformError> {
    try {
      return ok(JSON.stringify(value));
    } catch (error) {
      return fail(
        new ValidationError("JSON serialize failed", {
          code: "serialize_failed",
          details: { error: String(error) },
        }),
      );
    }
  }

  deserialize(payload: string): Result<T, PlatformError> {
    try {
      return ok(JSON.parse(payload) as T);
    } catch (error) {
      return fail(
        new ValidationError("JSON deserialize failed", {
          code: "deserialize_failed",
          details: { error: String(error) },
        }),
      );
    }
  }
}

export type SerializationRuntime = {
  readonly json: JsonSerializer;
  readonly command: JsonSerializer;
  readonly query: JsonSerializer;
  readonly event: JsonSerializer;
  readonly dto: JsonSerializer;
};

export function createSerializationRuntime(): SerializationRuntime {
  const json = new JsonSerializer();
  return {
    json,
    command: json,
    query: json,
    event: json,
    dto: json,
  };
}
