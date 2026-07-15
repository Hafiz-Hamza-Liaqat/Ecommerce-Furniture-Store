/**
 * Production service-account credential generation — rotation, revocation, expiration.
 * Wraps Identity ServiceAccountService; does not change Policy authorization.
 */

import {
  generateOpaqueToken,
  type IdentityStore,
  type PasswordHasher,
  type SecurityAuditService,
  type SecurityConfigProvider,
  type ServiceAccountService,
} from "@afh/identity";
import {
  AuthorizationError,
  NotFoundError,
  fail,
  isFail,
  ok,
  type Clock,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";

export type IssuedServiceAccountCredential = {
  readonly serviceAccountId: string;
  readonly userId: string;
  readonly clientSecret: string;
  readonly expiresAt: string;
};

export class ServiceAccountCredentialProvider {
  /** serviceAccountId → credential expiry ISO */
  readonly #expiresAt = new Map<string, string>();

  constructor(
    private readonly serviceAccounts: ServiceAccountService,
    private readonly store: IdentityStore,
    private readonly hasher: PasswordHasher,
    private readonly config: SecurityConfigProvider,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
  ) {}

  async create(input: {
    readonly companyId: string;
    readonly name: string;
    readonly actorUserId: string | null;
    readonly ttlSeconds?: number;
  }): Promise<Result<IssuedServiceAccountCredential, PlatformError>> {
    const created = await this.serviceAccounts.create({
      companyId: input.companyId,
      name: input.name,
      actorUserId: input.actorUserId,
    });
    if (isFail(created)) {
      return created;
    }
    const ttl =
      input.ttlSeconds ??
      this.config.get().serviceAccountCredential.ttlSeconds;
    const expiresAt = new Date(
      this.clock.now().getTime() + ttl * 1000,
    ).toISOString();
    this.#expiresAt.set(created.value.serviceAccountId, expiresAt);
    await this.audit.record({
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      action: "service_account.credential.issue",
      entityType: "service_account",
      entityId: created.value.serviceAccountId,
      outcome: "success",
      details: { expiresAt },
    });
    return ok({
      ...created.value,
      expiresAt,
    });
  }

  async rotate(
    serviceAccountId: string,
    actorUserId: string | null,
    ttlSeconds?: number,
  ): Promise<Result<{ clientSecret: string; expiresAt: string }, PlatformError>> {
    const expired = await this.assertNotExpired(serviceAccountId);
    if (isFail(expired)) {
      // Allow rotate even if expired — rotation renews life
      if (expired.error.code !== "service_account_credential_expired") {
        return expired;
      }
    }
    const rotated = await this.serviceAccounts.rotateCredential(
      serviceAccountId,
      actorUserId,
    );
    if (isFail(rotated)) {
      return rotated;
    }
    const account = await this.store.getServiceAccount(serviceAccountId);
    const ttl =
      ttlSeconds ?? this.config.get().serviceAccountCredential.ttlSeconds;
    const expiresAt = new Date(
      this.clock.now().getTime() + ttl * 1000,
    ).toISOString();
    this.#expiresAt.set(serviceAccountId, expiresAt);
    await this.audit.record({
      companyId: account?.companyId ?? null,
      actorUserId,
      action: "service_account.credential.rotate",
      entityType: "service_account",
      entityId: serviceAccountId,
      outcome: "success",
      details: { expiresAt },
    });
    return ok({ clientSecret: rotated.value.clientSecret, expiresAt });
  }

  async revoke(
    serviceAccountId: string,
    actorUserId: string | null,
  ): Promise<Result<void, PlatformError>> {
    const account = await this.store.getServiceAccount(serviceAccountId);
    if (!account) {
      return fail(
        new NotFoundError("Service account not found", {
          code: "service_account_not_found",
        }),
      );
    }
    const user = await this.store.getUserById(account.userId);
    const now = this.clock.now().toISOString();
    await this.store.saveServiceAccount({
      ...account,
      status: "deactivated",
      credentialHash: null,
      updatedAt: now,
    });
    if (user) {
      await this.store.saveUser({
        ...user,
        status: "deactivated",
        passwordHash: null,
        updatedAt: now,
      });
    }
    this.#expiresAt.delete(serviceAccountId);
    await this.audit.record({
      companyId: account.companyId,
      actorUserId,
      action: "service_account.credential.revoke",
      entityType: "service_account",
      entityId: serviceAccountId,
      outcome: "success",
    });
    return ok(undefined);
  }

  async verifySecret(
    serviceAccountId: string,
    clientSecret: string,
  ): Promise<Result<{ userId: string }, PlatformError>> {
    const account = await this.store.getServiceAccount(serviceAccountId);
    if (!account || account.status !== "active" || !account.credentialHash) {
      return fail(
        new AuthorizationError("Service account invalid", {
          code: "service_account_invalid",
        }),
      );
    }
    const expiry = await this.assertNotExpired(serviceAccountId);
    if (isFail(expiry)) {
      return expiry;
    }
    const valid = await this.hasher.verify(
      clientSecret,
      account.credentialHash,
    );
    if (!valid) {
      await this.audit.record({
        companyId: account.companyId,
        actorUserId: account.userId,
        action: "service_account.credential.verify",
        entityType: "service_account",
        entityId: serviceAccountId,
        outcome: "failure",
      });
      return fail(
        new AuthorizationError("Invalid client secret", {
          code: "service_account_invalid_secret",
        }),
      );
    }
    return ok({ userId: account.userId });
  }

  getExpiresAt(serviceAccountId: string): string | null {
    return this.#expiresAt.get(serviceAccountId) ?? null;
  }

  /** Generate a fresh opaque secret (host may hash via PasswordHasher). */
  generateSecret(): string {
    return generateOpaqueToken();
  }

  async assertNotExpired(
    serviceAccountId: string,
  ): Promise<Result<void, PlatformError>> {
    const expiresAt = this.#expiresAt.get(serviceAccountId);
    if (expiresAt && new Date(expiresAt) < this.clock.now()) {
      return fail(
        new AuthorizationError("Service account credential expired", {
          code: "service_account_credential_expired",
          details: { expiresAt },
        }),
      );
    }
    return ok(undefined);
  }
}
