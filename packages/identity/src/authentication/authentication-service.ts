/**
 * Authentication foundation — no external IdP/OAuth/SMS/email providers.
 */

import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  fail,
  isFail,
  ok,
  type Clock,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { IdentityStore } from "../stores/identity-store.js";
import type { SecurityConfigProvider } from "../configuration/security-config.js";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  type PasswordHasher,
  validatePasswordPolicy,
} from "../credentials/credentials.js";
import type { SecurityAuditService } from "../audit/security-audit.js";
import type { SessionService, SessionTokens } from "../session/session-service.js";
import type {
  AccountStatus,
  CredentialChallengeRecord,
  UserRecord,
} from "../models/models.js";
import { newId } from "../util/ids.js";

export type RegisterUserInput = {
  readonly companyId: string | null;
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
  readonly phone?: string | null;
};

export class AuthenticationService {
  constructor(
    private readonly store: IdentityStore,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionService,
    private readonly config: SecurityConfigProvider,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
  ) {}

  async register(
    input: RegisterUserInput,
  ): Promise<Result<UserRecord, PlatformError>> {
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) {
      return fail(
        new ValidationError("Invalid email", { code: "invalid_email" }),
      );
    }
    const existing = await this.store.getUserByEmail(email);
    if (existing) {
      return fail(
        new ConflictError("Email already registered", {
          code: "email_taken",
        }),
      );
    }

    const policyCheck = validatePasswordPolicy(
      input.password,
      this.config.get().password,
    );
    if (isFail(policyCheck)) {
      return policyCheck;
    }

    const now = this.clock.now().toISOString();
    const passwordHash = await this.hasher.hash(input.password);
    const user: UserRecord = {
      id: newId("user"),
      companyId: input.companyId,
      email,
      phone: input.phone ?? null,
      passwordHash,
      status: "registered",
      principalKind: "human",
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      mfaEnabled: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      locale: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.store.saveUser(user);
    await this.store.saveProfile({
      userId: user.id,
      fullName: input.fullName,
      createdAt: now,
      updatedAt: now,
    });
    await this.audit.record({
      companyId: input.companyId,
      actorUserId: user.id,
      action: "auth.register",
      entityType: "user",
      entityId: user.id,
      outcome: "success",
    });
    return ok(user);
  }

  async activateAccount(
    userId: string,
  ): Promise<Result<UserRecord, PlatformError>> {
    return this.#setStatus(userId, "active", "auth.activate");
  }

  async suspendAccount(
    userId: string,
    actorUserId: string | null,
  ): Promise<Result<UserRecord, PlatformError>> {
    const result = await this.#setStatus(userId, "suspended", "auth.suspend");
    if (isFail(result)) return result;
    await this.sessions.revokeAllForUser(userId, actorUserId);
    return result;
  }

  async signIn(input: {
    readonly email: string;
    readonly password: string;
    readonly deviceLabel?: string | null;
    readonly userAgent?: string | null;
    readonly ipAddress?: string | null;
    readonly mfaToken?: string | null;
  }): Promise<Result<{ user: UserRecord; tokens: SessionTokens }, PlatformError>> {
    const email = input.email.trim().toLowerCase();
    const user = await this.store.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      await this.audit.record({
        companyId: null,
        actorUserId: null,
        action: "auth.sign_in",
        entityType: "user",
        outcome: "failure",
        details: { reason: "invalid_credentials" },
      });
      return fail(
        new AuthorizationError("Invalid credentials", {
          code: "invalid_credentials",
        }),
      );
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > this.clock.now()) {
      return fail(
        new AuthorizationError("Account locked", {
          code: "account_locked",
          details: { lockedUntil: user.lockedUntil },
        }),
      );
    }

    if (user.status !== "active") {
      return fail(
        new AuthorizationError("Account not active", {
          code: "account_not_active",
          details: { status: user.status },
        }),
      );
    }

    const valid = await this.hasher.verify(input.password, user.passwordHash);
    if (!valid) {
      await this.#registerFailedLogin(user);
      return fail(
        new AuthorizationError("Invalid credentials", {
          code: "invalid_credentials",
        }),
      );
    }

    if (
      user.mfaEnabled &&
      this.config.get().mfa.enabled &&
      !input.mfaToken
    ) {
      return fail(
        new AuthorizationError("MFA required", {
          code: "mfa_required",
        }),
      );
    }

    // MFA: verify issued challenge token (fail closed).
    if (user.mfaEnabled && input.mfaToken) {
      const verified = await this.#consumeChallenge("mfa_challenge", input.mfaToken);
      if (isFail(verified)) {
        await this.audit.record({
          companyId: user.companyId,
          actorUserId: user.id,
          action: "auth.mfa_challenge",
          entityType: "user",
          entityId: user.id,
          outcome: "failure",
          details: { code: verified.error.code },
        });
        return verified;
      }
      await this.audit.record({
        companyId: user.companyId,
        actorUserId: user.id,
        action: "auth.mfa_challenge",
        entityType: "user",
        entityId: user.id,
        outcome: "success",
        details: {},
      });
    }

    const cleared: UserRecord = {
      ...user,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: this.clock.now().toISOString(),
    };
    await this.store.saveUser(cleared);

    const tokens = await this.sessions.createSession({
      userId: user.id,
      companyId: user.companyId,
      deviceLabel: input.deviceLabel ?? null,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    });
    if (isFail(tokens)) {
      return tokens;
    }

    await this.audit.record({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "auth.sign_in",
      entityType: "user",
      entityId: user.id,
      outcome: "success",
    });

    return ok({ user: cleared, tokens: tokens.value });
  }

  async signOut(
    sessionId: string,
    actorUserId: string | null,
  ): Promise<Result<void, PlatformError>> {
    return this.sessions.revokeSession(sessionId, actorUserId);
  }

  async requestPasswordReset(
    email: string,
  ): Promise<Result<{ challengeId: string; token: string }, PlatformError>> {
    const user = await this.store.getUserByEmail(email.trim().toLowerCase());
    if (!user) {
      // Do not leak existence
      return ok({ challengeId: "noop", token: "" });
    }
    return this.#createChallenge(user.id, "password_reset", 60 * 60);
  }

  async resetPassword(input: {
    readonly token: string;
    readonly newPassword: string;
  }): Promise<Result<void, PlatformError>> {
    const challenge = await this.#consumeChallenge(
      "password_reset",
      input.token,
    );
    if (isFail(challenge)) return challenge;

    const policyCheck = validatePasswordPolicy(
      input.newPassword,
      this.config.get().password,
    );
    if (isFail(policyCheck)) return policyCheck;

    const user = await this.store.getUserById(challenge.value.userId);
    if (!user) {
      return fail(new NotFoundError("User not found", { code: "user_not_found" }));
    }

    const passwordHash = await this.hasher.hash(input.newPassword);
    await this.store.saveUser({
      ...user,
      passwordHash,
      updatedAt: this.clock.now().toISOString(),
    });
    await this.sessions.revokeAllForUser(user.id, user.id);
    await this.audit.record({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "auth.password_reset",
      entityType: "user",
      entityId: user.id,
      outcome: "success",
    });
    return ok(undefined);
  }

  async requestEmailVerification(
    userId: string,
  ): Promise<Result<{ challengeId: string; token: string }, PlatformError>> {
    return this.#createChallenge(userId, "email_verification", 24 * 60 * 60);
  }

  async verifyEmail(token: string): Promise<Result<void, PlatformError>> {
    const challenge = await this.#consumeChallenge("email_verification", token);
    if (isFail(challenge)) return challenge;
    const user = await this.store.getUserById(challenge.value.userId);
    if (!user) {
      return fail(new NotFoundError("User not found", { code: "user_not_found" }));
    }
    await this.store.saveUser({
      ...user,
      emailVerifiedAt: this.clock.now().toISOString(),
      updatedAt: this.clock.now().toISOString(),
    });
    return ok(undefined);
  }

  async requestPhoneVerification(
    userId: string,
  ): Promise<Result<{ challengeId: string; token: string }, PlatformError>> {
    return this.#createChallenge(userId, "phone_verification", 15 * 60);
  }

  async verifyPhone(token: string): Promise<Result<void, PlatformError>> {
    const challenge = await this.#consumeChallenge("phone_verification", token);
    if (isFail(challenge)) return challenge;
    const user = await this.store.getUserById(challenge.value.userId);
    if (!user) {
      return fail(new NotFoundError("User not found", { code: "user_not_found" }));
    }
    await this.store.saveUser({
      ...user,
      phoneVerifiedAt: this.clock.now().toISOString(),
      updatedAt: this.clock.now().toISOString(),
    });
    return ok(undefined);
  }

  /**
   * MFA architecture hook — enables flag; challenge issuance for later providers.
   */
  async enableMfaHook(
    userId: string,
  ): Promise<Result<{ challengeId: string; token: string }, PlatformError>> {
    const user = await this.store.getUserById(userId);
    if (!user) {
      return fail(new NotFoundError("User not found", { code: "user_not_found" }));
    }
    await this.store.saveUser({
      ...user,
      mfaEnabled: true,
      updatedAt: this.clock.now().toISOString(),
    });
    return this.#createChallenge(userId, "mfa_challenge", 5 * 60);
  }

  async #setStatus(
    userId: string,
    status: AccountStatus,
    action: string,
  ): Promise<Result<UserRecord, PlatformError>> {
    const user = await this.store.getUserById(userId);
    if (!user) {
      return fail(new NotFoundError("User not found", { code: "user_not_found" }));
    }
    const updated: UserRecord = {
      ...user,
      status,
      updatedAt: this.clock.now().toISOString(),
    };
    await this.store.saveUser(updated);
    await this.audit.record({
      companyId: user.companyId,
      actorUserId: userId,
      action,
      entityType: "user",
      entityId: userId,
      outcome: "success",
      details: { status },
    });
    return ok(updated);
  }

  async #registerFailedLogin(user: UserRecord): Promise<void> {
    const lockout = this.config.get().lockout;
    const attempts = user.failedLoginAttempts + 1;
    let lockedUntil: string | null = user.lockedUntil;
    if (attempts >= lockout.maxFailedAttempts) {
      lockedUntil = new Date(
        this.clock.now().getTime() + lockout.lockoutDurationSeconds * 1000,
      ).toISOString();
    }
    await this.store.saveUser({
      ...user,
      failedLoginAttempts: attempts,
      lockedUntil,
      updatedAt: this.clock.now().toISOString(),
    });
    await this.audit.record({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "auth.sign_in",
      entityType: "user",
      entityId: user.id,
      outcome: "failure",
      details: { attempts, locked: lockedUntil !== null },
    });
  }

  async #createChallenge(
    userId: string,
    kind: CredentialChallengeRecord["kind"],
    ttlSeconds: number,
  ): Promise<Result<{ challengeId: string; token: string }, PlatformError>> {
    const token = generateOpaqueToken();
    const now = this.clock.now();
    const challenge: CredentialChallengeRecord = {
      id: newId("chal"),
      userId,
      kind,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
      consumedAt: null,
      createdAt: now.toISOString(),
    };
    await this.store.saveChallenge(challenge);
    return ok({ challengeId: challenge.id, token });
  }

  async #consumeChallenge(
    kind: CredentialChallengeRecord["kind"],
    token: string,
  ): Promise<Result<CredentialChallengeRecord, PlatformError>> {
    if (!token) {
      return fail(
        new ValidationError("Invalid token", { code: "invalid_token" }),
      );
    }
    const challenge = await this.store.findChallengeByTokenHash(
      kind,
      hashOpaqueToken(token),
    );
    if (!challenge || challenge.consumedAt) {
      return fail(
        new AuthorizationError("Invalid or consumed token", {
          code: "invalid_token",
        }),
      );
    }
    if (new Date(challenge.expiresAt) < this.clock.now()) {
      return fail(
        new AuthorizationError("Token expired", { code: "token_expired" }),
      );
    }
    const consumed: CredentialChallengeRecord = {
      ...challenge,
      consumedAt: this.clock.now().toISOString(),
    };
    await this.store.saveChallenge(consumed);
    return ok(consumed);
  }
}
