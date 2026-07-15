/**
 * TOTP MFA provider (RFC 6238) — HMAC-SHA1, 30s steps, 6 digits.
 * No enrollment UI; no authentication workflow coupling.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SecurityAuditService } from "@afh/identity";
import {
  AuthorizationError,
  ValidationError,
  fail,
  ok,
  type Clock,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { SecurityMetrics } from "../observability/security-metrics.js";
import type { MfaProvider, TotpEnrollment } from "./types.js";

function base32Encode(buf: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      const idx = (value >>> (bits - 5)) & 31;
      output += alphabet[idx] ?? "A";
      bits -= 5;
    }
  }
  if (bits > 0) {
    const idx = (value << (5 - bits)) & 31;
    output += alphabet[idx] ?? "A";
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.replace(/=+$/g, "").toUpperCase().replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of cleaned) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) {
      continue;
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  const str = (code % 10 ** digits).toString().padStart(digits, "0");
  return str;
}

function safeCodeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a.padStart(8, "0"));
  const bb = Buffer.from(b.padStart(8, "0"));
  if (ab.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export class TotpMfaProvider implements MfaProvider {
  readonly kind = "totp" as const;
  /** userId → base32 secret (host persists; provider holds runtime map for verify). */
  readonly #secrets = new Map<string, string>();
  readonly #challenges = new Map<
    string,
    { userId: string; expiresAt: number }
  >();

  constructor(
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
    private readonly metrics?: SecurityMetrics,
    private readonly options: {
      readonly issuer?: string;
      readonly stepSeconds?: number;
      readonly window?: number;
    } = {},
  ) {}

  enroll(input: {
    readonly userId: string;
    readonly accountName: string;
    readonly secret?: string;
  }): TotpEnrollment {
    const secret =
      input.secret ?? base32Encode(randomBytes(20)).replace(/=+$/g, "");
    this.#secrets.set(input.userId, secret);
    const issuer = this.options.issuer ?? "AFH";
    const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(input.accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${this.options.stepSeconds ?? 30}`;
    return {
      secret,
      otpauthUri,
      issuer,
      accountName: input.accountName,
    };
  }

  bindSecret(userId: string, secret: string): void {
    this.#secrets.set(userId, secret);
  }

  async issue(input: {
    readonly userId: string;
    readonly destination?: string | null;
  }): Promise<Result<{ challengeId: string; kind: "totp"; expiresAt: string; deliveryHint: string | null }, PlatformError>> {
    if (!this.#secrets.has(input.userId)) {
      return fail(
        new ValidationError("TOTP secret not enrolled", {
          code: "totp_not_enrolled",
        }),
      );
    }
    const challengeId = `mfa_totp_${this.clock.now().getTime()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(
      this.clock.now().getTime() + 5 * 60 * 1000,
    ).toISOString();
    this.#challenges.set(challengeId, {
      userId: input.userId,
      expiresAt: Date.parse(expiresAt),
    });
    this.metrics?.mfaChallenge("totp");
    await this.audit.record({
      companyId: null,
      actorUserId: input.userId,
      action: "mfa.totp.issue",
      entityType: "mfa_challenge",
      entityId: challengeId,
      outcome: "success",
    });
    return ok({
      challengeId,
      kind: "totp",
      expiresAt,
      deliveryHint: null,
    });
  }

  async verify(input: {
    readonly userId: string;
    readonly challengeId: string;
    readonly code: string;
  }): Promise<Result<{ verified: true }, PlatformError>> {
    const challenge = this.#challenges.get(input.challengeId);
    if (!challenge || challenge.userId !== input.userId) {
      this.metrics?.mfaFailure("totp");
      return fail(
        new AuthorizationError("MFA challenge invalid", {
          code: "mfa_challenge_invalid",
        }),
      );
    }
    if (challenge.expiresAt < this.clock.now().getTime()) {
      this.#challenges.delete(input.challengeId);
      this.metrics?.mfaFailure("totp");
      return fail(
        new AuthorizationError("MFA challenge expired", {
          code: "mfa_challenge_expired",
        }),
      );
    }

    const secret = this.#secrets.get(input.userId);
    if (!secret) {
      return fail(
        new ValidationError("TOTP secret not enrolled", {
          code: "totp_not_enrolled",
        }),
      );
    }

    const valid = this.verifyCode(secret, input.code);
    if (!valid) {
      this.metrics?.mfaFailure("totp");
      await this.audit.record({
        companyId: null,
        actorUserId: input.userId,
        action: "mfa.totp.verify",
        entityType: "mfa_challenge",
        entityId: input.challengeId,
        outcome: "failure",
      });
      return fail(
        new AuthorizationError("Invalid MFA code", { code: "mfa_invalid" }),
      );
    }

    this.#challenges.delete(input.challengeId);
    this.metrics?.mfaSuccess("totp");
    await this.audit.record({
      companyId: null,
      actorUserId: input.userId,
      action: "mfa.totp.verify",
      entityType: "mfa_challenge",
      entityId: input.challengeId,
      outcome: "success",
    });
    return ok({ verified: true });
  }

  verifyCode(secretBase32: string, code: string): boolean {
    const step = this.options.stepSeconds ?? 30;
    const window = this.options.window ?? 1;
    const secret = base32Decode(secretBase32);
    const counter = Math.floor(this.clock.now().getTime() / 1000 / step);
    const normalized = code.replace(/\s+/g, "");
    for (let w = -window; w <= window; w += 1) {
      const expected = hotp(secret, counter + w);
      if (safeCodeEqual(expected, normalized)) {
        return true;
      }
    }
    return false;
  }
}
