/**
 * Secure password-reset token provider — no transport/UI.
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

export type PasswordResetToken = {
  readonly challengeId: string;
  readonly token: string;
  readonly expiresAt: string;
};

export class PasswordResetProvider {
  constructor(
    private readonly store: IdentityStore,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
    private readonly ttlSeconds = 60 * 60,
  ) {}

  /**
   * Issues a reset token when the email exists. Always returns success-shaped
   * noop for unknown emails to avoid account enumeration at the provider layer.
   */
  async issue(
    email: string,
  ): Promise<Result<PasswordResetToken, PlatformError>> {
    const user = await this.store.getUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return ok({
        challengeId: "noop",
        token: "",
        expiresAt: this.clock.now().toISOString(),
      });
    }
    const token = generateOpaqueToken();
    const challengeId = `pwd_reset_${this.clock.now().getTime()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(
      this.clock.now().getTime() + this.ttlSeconds * 1000,
    ).toISOString();
    await this.store.saveChallenge({
      id: challengeId,
      userId: user.id,
      kind: "password_reset",
      tokenHash: hashOpaqueToken(token),
      expiresAt,
      consumedAt: null,
      createdAt: this.clock.now().toISOString(),
    });
    await this.audit.record({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "password_reset.issue",
      entityType: "credential_challenge",
      entityId: challengeId,
      outcome: "success",
    });
    return ok({ challengeId, token, expiresAt });
  }

  async consume(
    token: string,
  ): Promise<Result<{ userId: string; challengeId: string }, PlatformError>> {
    if (!token) {
      return fail(
        new AuthorizationError("Invalid reset token", {
          code: "password_reset_invalid",
        }),
      );
    }
    const hash = hashOpaqueToken(token);
    const challenge = await this.store.findChallengeByTokenHash(
      "password_reset",
      hash,
    );
    if (!challenge || challenge.consumedAt) {
      return fail(
        new AuthorizationError("Invalid reset token", {
          code: "password_reset_invalid",
        }),
      );
    }
    if (new Date(challenge.expiresAt) < this.clock.now()) {
      return fail(
        new AuthorizationError("Reset token expired", {
          code: "password_reset_expired",
        }),
      );
    }
    await this.store.saveChallenge({
      ...challenge,
      consumedAt: this.clock.now().toISOString(),
    });
    await this.audit.record({
      companyId: null,
      actorUserId: challenge.userId,
      action: "password_reset.consume",
      entityType: "credential_challenge",
      entityId: challenge.id,
      outcome: "success",
    });
    return ok({ userId: challenge.userId, challengeId: challenge.id });
  }
}
