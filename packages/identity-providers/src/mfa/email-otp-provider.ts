/**
 * Email OTP MFA provider — issues hashed OTPs into IdentityStore challenges.
 * No email transport/delivery.
 */

import {
  generateOpaqueToken,
  hashOpaqueToken,
  type IdentityStore,
  type SecurityAuditService,
} from "@afh/identity";
import {
  AuthorizationError,
  fail,
  ok,
  type Clock,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { SecurityMetrics } from "../observability/security-metrics.js";
import type { MfaChallenge, MfaProvider } from "./types.js";

function numericOtp(length = 6): string {
  const raw = generateOpaqueToken();
  let digits = "";
  for (let i = 0; i < raw.length && digits.length < length; i += 1) {
    const code = raw.charCodeAt(i) % 10;
    digits += String(code);
  }
  return digits.padStart(length, "0").slice(0, length);
}

export class EmailOtpMfaProvider implements MfaProvider {
  readonly kind = "email_otp" as const;

  constructor(
    private readonly store: IdentityStore,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
    private readonly metrics?: SecurityMetrics,
    private readonly ttlSeconds = 10 * 60,
  ) {}

  async issue(input: {
    readonly userId: string;
    readonly destination?: string | null;
  }): Promise<Result<MfaChallenge & { code: string }, PlatformError>> {
    const code = numericOtp(6);
    const challengeId = `mfa_email_${this.clock.now().getTime()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(
      this.clock.now().getTime() + this.ttlSeconds * 1000,
    ).toISOString();
    await this.store.saveChallenge({
      id: challengeId,
      userId: input.userId,
      kind: "mfa_challenge",
      tokenHash: hashOpaqueToken(`email_otp:${code}`),
      expiresAt,
      consumedAt: null,
      createdAt: this.clock.now().toISOString(),
    });
    this.metrics?.mfaChallenge("email_otp");
    await this.audit.record({
      companyId: null,
      actorUserId: input.userId,
      action: "mfa.email_otp.issue",
      entityType: "mfa_challenge",
      entityId: challengeId,
      outcome: "success",
      details: {
        destinationHint: input.destination
          ? maskEmail(input.destination)
          : null,
      },
    });
    return ok({
      challengeId,
      kind: "email_otp",
      expiresAt,
      deliveryHint: input.destination ? maskEmail(input.destination) : null,
      /** Returned once for host binding to a mailer — never logged by this provider. */
      code,
    });
  }

  async verify(input: {
    readonly userId: string;
    readonly challengeId: string;
    readonly code: string;
  }): Promise<Result<{ verified: true }, PlatformError>> {
    const challenge = await this.store.getChallenge(input.challengeId);
    if (
      !challenge ||
      challenge.kind !== "mfa_challenge" ||
      challenge.userId !== input.userId ||
      challenge.consumedAt
    ) {
      this.metrics?.mfaFailure("email_otp");
      return fail(
        new AuthorizationError("MFA challenge invalid", {
          code: "mfa_challenge_invalid",
        }),
      );
    }
    if (new Date(challenge.expiresAt) < this.clock.now()) {
      this.metrics?.mfaFailure("email_otp");
      return fail(
        new AuthorizationError("MFA challenge expired", {
          code: "mfa_challenge_expired",
        }),
      );
    }
    const expected = hashOpaqueToken(`email_otp:${input.code.trim()}`);
    if (challenge.tokenHash !== expected) {
      this.metrics?.mfaFailure("email_otp");
      await this.audit.record({
        companyId: null,
        actorUserId: input.userId,
        action: "mfa.email_otp.verify",
        entityType: "mfa_challenge",
        entityId: input.challengeId,
        outcome: "failure",
      });
      return fail(
        new AuthorizationError("Invalid MFA code", { code: "mfa_invalid" }),
      );
    }
    await this.store.saveChallenge({
      ...challenge,
      consumedAt: this.clock.now().toISOString(),
    });
    this.metrics?.mfaSuccess("email_otp");
    await this.audit.record({
      companyId: null,
      actorUserId: input.userId,
      action: "mfa.email_otp.verify",
      entityType: "mfa_challenge",
      entityId: input.challengeId,
      outcome: "success",
    });
    return ok({ verified: true });
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return "***";
  }
  return `${local.slice(0, 1)}***@${domain}`;
}
