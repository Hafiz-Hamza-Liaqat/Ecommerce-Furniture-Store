/**
 * Configuration contracts — no provider-specific implementations.
 */

import type { Result } from "../result/result.js";
import type { PlatformError } from "../errors/platform-error.js";

export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | ConfigValue[]
  | { readonly [key: string]: ConfigValue };

export interface ConfigurationSource {
  get(key: string): ConfigValue | undefined;
  has(key: string): boolean;
}

/**
 * Typed configuration loader. Implementations live in later infrastructure phases.
 */
export interface TypedConfiguration<T> {
  load(): Result<T, PlatformError>;
}

export interface ConfigurationValidator<T> {
  validate(value: unknown): Result<T, PlatformError>;
}

/**
 * Secret material must never be logged. Access is explicit via this contract.
 */
export interface SecretRef {
  readonly name: string;
}

export interface SecretProvider {
  getSecret(ref: SecretRef): Result<string, PlatformError> | Promise<Result<string, PlatformError>>;
}
