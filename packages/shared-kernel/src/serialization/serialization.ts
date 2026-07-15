/**
 * Serialization contracts — no transport-specific serializers.
 */

import type { Result } from "../result/result.js";
import type { PlatformError } from "../errors/platform-error.js";

export interface Serializer<T = unknown> {
  serialize(value: T): Result<string, PlatformError>;
  deserialize(payload: string): Result<T, PlatformError>;
}

export interface BinarySerializer<T = unknown> {
  serialize(value: T): Result<Uint8Array, PlatformError>;
  deserialize(payload: Uint8Array): Result<T, PlatformError>;
}
