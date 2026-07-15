/**
 * Credential hashing contracts — no external IdP/OAuth providers.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  ValidationError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { PasswordPolicy } from "../configuration/security-config.js";

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

/**
 * Reference hasher for foundation (provider-neutral). Replaceable later.
 * Not a third-party IdP integration.
 */
export class Sha256PasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const digest = createHash("sha256")
      .update(`${salt}:${plain}`)
      .digest("hex");
    return `sha256$${salt}$${digest}`;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    const parts = hash.split("$");
    if (parts.length !== 3 || parts[0] !== "sha256") {
      return false;
    }
    const salt = parts[1] ?? "";
    const expected = parts[2] ?? "";
    const digest = createHash("sha256")
      .update(`${salt}:${plain}`)
      .digest("hex");
    try {
      return timingSafeEqual(
        Buffer.from(digest, "utf8"),
        Buffer.from(expected, "utf8"),
      );
    } catch {
      return false;
    }
  }
}

export function validatePasswordPolicy(
  plain: string,
  policy: PasswordPolicy,
): Result<void, PlatformError> {
  if (plain.length < policy.minLength) {
    return fail(
      new ValidationError("Password does not meet minimum length", {
        code: "password_too_short",
        details: { minLength: policy.minLength },
      }),
    );
  }
  if (policy.requireUppercase && !/[A-Z]/.test(plain)) {
    return fail(
      new ValidationError("Password requires an uppercase letter", {
        code: "password_missing_uppercase",
      }),
    );
  }
  if (policy.requireLowercase && !/[a-z]/.test(plain)) {
    return fail(
      new ValidationError("Password requires a lowercase letter", {
        code: "password_missing_lowercase",
      }),
    );
  }
  if (policy.requireDigit && !/[0-9]/.test(plain)) {
    return fail(
      new ValidationError("Password requires a digit", {
        code: "password_missing_digit",
      }),
    );
  }
  if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(plain)) {
    return fail(
      new ValidationError("Password requires a symbol", {
        code: "password_missing_symbol",
      }),
    );
  }
  return ok(undefined);
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}
