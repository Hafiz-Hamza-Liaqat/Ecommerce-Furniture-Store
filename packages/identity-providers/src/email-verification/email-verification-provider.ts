/**
 * Email verification token infrastructure — no transport/UI.
 * Authentication workflow (AuthenticationService) remains unchanged.
 */

import {
  generateOpaqueToken,
  hashOpaqueToken,
  type IdentityStore,
  type SecurityAuditService,
} from "@afh/identity";
import {
  AuthorizationError,
  NotFoundError,
  fail,
  ok,
  type Clock,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";

export type EmailVerificationToken = {
  readonly challengeId: string;
  readonly token: string;
  readonly expiresAt: string;
};

export class EmailVerificationProvider {
  constructor(
    private readonly store: IdentityStore,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
    private readonly ttlSeconds = 24 * 60 * 60,
  ) {}

  async issue(userId: string): Promise<Result<EmailVerificationToken, PlatformError>> {
    const user = await this.store.getUserById(userId);
    if (!user) {
      return fail(new NotFoundError("User not found", { code: "user_not_found" }));
    }
    const token = generateOpaqueToken();
    const challengeId = `email_verify_${this.clock.now().getTime()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(
      this.clock.now().getTime() + this.ttlSeconds * 1000,
    ).toISOString();
    await this.store.saveChallenge({
      id: challengeId,
      userId,
      kind: "email_verification",
      tokenHash: hashOpaqueToken(token),
      expiresAt,
      consumedAt: null,
      createdAt: this.clock.now().toISOString(),
    });
    await this.audit.record({
      companyId: user.companyId,
      actorUserId: userId,
      action: "email_verification.issue",
      entityType: "credential_challenge",
      entityId: challengeId,
      outcome: "success",
    });
    return ok({ challengeId, token, expiresAt });
  }

  async consume(
    token: string,
  ): Promise<Result<{ userId: string; challengeId: string }, PlatformError>> {
    const hash = hashOpaqueToken(token);
    const challenge = await this.store.findChallengeByTokenHash(
      "email_verification",
      hash,
    );
    if (!challenge || challenge.consumedAt) {
      return fail(
        new AuthorizationError("Invalid verification token", {
          code: "email_verification_invalid",
        }),
      );
    }
    if (new Date(challenge.expiresAt) < this.clock.now()) {
      return fail(
        new AuthorizationError("Verification token expired", {
          code: "email_verification_expired",
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
      action: "email_verification.consume",
      entityType: "credential_challenge",
      entityId: challenge.id,
      outcome: "success",
    });
    return ok({ userId: challenge.userId, challengeId: challenge.id });
  }
}
