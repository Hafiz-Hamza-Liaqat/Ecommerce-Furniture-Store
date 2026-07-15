/**
 * Service account identity support — scoped credentials + rotation hooks.
 */

import {
  NotFoundError,
  ValidationError,
  fail,
  ok,
  type Clock,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { IdentityStore } from "../stores/identity-store.js";
import type { PasswordHasher } from "../credentials/credentials.js";
import {
  generateOpaqueToken,
} from "../credentials/credentials.js";
import type { SecurityAuditService } from "../audit/security-audit.js";
import type { ServiceAccountRecord, UserRecord } from "../models/models.js";
import { newId } from "../util/ids.js";

export type ServiceAccountCredentials = {
  readonly serviceAccountId: string;
  readonly userId: string;
  readonly clientSecret: string;
};

export class ServiceAccountService {
  constructor(
    private readonly store: IdentityStore,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
  ) {}

  async create(input: {
    readonly companyId: string;
    readonly name: string;
    readonly actorUserId: string | null;
  }): Promise<Result<ServiceAccountCredentials, PlatformError>> {
    if (!input.name.trim()) {
      return fail(
        new ValidationError("name required", { code: "name_required" }),
      );
    }

    const now = this.clock.now().toISOString();
    const clientSecret = generateOpaqueToken();
    const passwordHash = await this.hasher.hash(clientSecret);

    const user: UserRecord = {
      id: newId("user"),
      companyId: input.companyId,
      email: `sa+${newId("mail")}@service.local`,
      phone: null,
      passwordHash,
      status: "active",
      principalKind: "service_account",
      emailVerifiedAt: now,
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

    const account: ServiceAccountRecord = {
      id: newId("sa"),
      userId: user.id,
      companyId: input.companyId,
      name: input.name.trim(),
      status: "active",
      credentialHash: passwordHash,
      credentialRotatedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.store.saveServiceAccount(account);
    await this.audit.record({
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      action: "service_account.create",
      entityType: "service_account",
      entityId: account.id,
      outcome: "success",
    });

    return ok({
      serviceAccountId: account.id,
      userId: user.id,
      clientSecret,
    });
  }

  async rotateCredential(
    serviceAccountId: string,
    actorUserId: string | null,
  ): Promise<Result<{ clientSecret: string }, PlatformError>> {
    const account = await this.store.getServiceAccount(serviceAccountId);
    if (!account) {
      return fail(
        new NotFoundError("Service account not found", {
          code: "service_account_not_found",
        }),
      );
    }
    const user = await this.store.getUserById(account.userId);
    if (!user) {
      return fail(new NotFoundError("User not found", { code: "user_not_found" }));
    }

    const clientSecret = generateOpaqueToken();
    const passwordHash = await this.hasher.hash(clientSecret);
    const now = this.clock.now().toISOString();

    await this.store.saveUser({
      ...user,
      passwordHash,
      updatedAt: now,
    });
    await this.store.saveServiceAccount({
      ...account,
      credentialHash: passwordHash,
      credentialRotatedAt: now,
      updatedAt: now,
    });
    await this.audit.record({
      companyId: account.companyId,
      actorUserId,
      action: "service_account.rotate_credential",
      entityType: "service_account",
      entityId: account.id,
      outcome: "success",
    });

    return ok({ clientSecret });
  }
}
