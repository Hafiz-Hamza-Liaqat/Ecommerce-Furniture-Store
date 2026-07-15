/**
 * Session lifecycle — no transport-specific implementation.
 */

import {
  AuthorizationError,
  NotFoundError,
  fail,
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
} from "../credentials/credentials.js";
import type { SecurityAuditService } from "../audit/security-audit.js";
import type { SessionRecord } from "../models/models.js";
import { newId } from "../util/ids.js";

export type SessionTokens = {
  readonly sessionId: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly absoluteExpiresAt: string;
};

export class SessionService {
  constructor(
    private readonly store: IdentityStore,
    private readonly config: SecurityConfigProvider,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
  ) {}

  async createSession(input: {
    readonly userId: string;
    readonly companyId: string | null;
    readonly deviceLabel: string | null;
    readonly userAgent: string | null;
    readonly ipAddress: string | null;
    readonly familyId?: string;
  }): Promise<Result<SessionTokens, PlatformError>> {
    const policy = this.config.get().session;
    const now = this.clock.now();
    const refreshToken = generateOpaqueToken();
    const session: SessionRecord = {
      id: newId("sess"),
      userId: input.userId,
      companyId: input.companyId,
      refreshTokenHash: hashOpaqueToken(refreshToken),
      deviceLabel: input.deviceLabel,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      createdAt: now.toISOString(),
      expiresAt: new Date(
        now.getTime() + policy.refreshTtlSeconds * 1000,
      ).toISOString(),
      absoluteExpiresAt: new Date(
        now.getTime() + policy.absoluteTtlSeconds * 1000,
      ).toISOString(),
      lastSeenAt: now.toISOString(),
      revokedAt: null,
      familyId: input.familyId ?? newId("sfam"),
    };
    await this.store.saveSession(session);
    await this.audit.record({
      companyId: input.companyId,
      actorUserId: input.userId,
      action: "session.create",
      entityType: "session",
      entityId: session.id,
      outcome: "success",
      details: { deviceLabel: input.deviceLabel },
    });
    return ok({
      sessionId: session.id,
      refreshToken,
      expiresAt: session.expiresAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
    });
  }

  async refreshSession(
    sessionId: string,
    refreshToken: string,
  ): Promise<Result<SessionTokens, PlatformError>> {
    const session = await this.store.getSession(sessionId);
    if (!session || session.revokedAt) {
      return fail(
        new AuthorizationError("Session invalid", { code: "session_invalid" }),
      );
    }

    const now = this.clock.now();
    if (new Date(session.absoluteExpiresAt) < now) {
      await this.revokeSession(sessionId, session.userId);
      return fail(
        new AuthorizationError("Session absolute expiry reached", {
          code: "session_absolute_expired",
        }),
      );
    }

    if (session.refreshTokenHash !== hashOpaqueToken(refreshToken)) {
      // Refresh reuse detection — revoke family
      await this.#revokeFamily(session.familyId, session.userId);
      return fail(
        new AuthorizationError("Refresh token reuse detected", {
          code: "refresh_reuse",
        }),
      );
    }

    const idleDeadline = new Date(
      new Date(session.lastSeenAt).getTime() +
        this.config.get().session.idleTtlSeconds * 1000,
    );
    if (idleDeadline < now) {
      await this.revokeSession(sessionId, session.userId);
      return fail(
        new AuthorizationError("Session idle expiry reached", {
          code: "session_idle_expired",
        }),
      );
    }

    // Rotate refresh token
    const newRefresh = generateOpaqueToken();
    const policy = this.config.get().session;
    const updated: SessionRecord = {
      ...session,
      refreshTokenHash: hashOpaqueToken(newRefresh),
      expiresAt: new Date(
        now.getTime() + policy.refreshTtlSeconds * 1000,
      ).toISOString(),
      lastSeenAt: now.toISOString(),
    };
    await this.store.saveSession(updated);
    await this.audit.record({
      companyId: session.companyId,
      actorUserId: session.userId,
      action: "session.refresh",
      entityType: "session",
      entityId: session.id,
      outcome: "success",
    });

    return ok({
      sessionId: session.id,
      refreshToken: newRefresh,
      expiresAt: updated.expiresAt,
      absoluteExpiresAt: updated.absoluteExpiresAt,
    });
  }

  async touchSession(sessionId: string): Promise<Result<void, PlatformError>> {
    const session = await this.store.getSession(sessionId);
    if (!session || session.revokedAt) {
      return fail(
        new NotFoundError("Session not found", { code: "session_not_found" }),
      );
    }
    await this.store.saveSession({
      ...session,
      lastSeenAt: this.clock.now().toISOString(),
    });
    return ok(undefined);
  }

  async revokeSession(
    sessionId: string,
    actorUserId: string | null,
  ): Promise<Result<void, PlatformError>> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      return ok(undefined);
    }
    if (session.revokedAt) {
      return ok(undefined);
    }
    await this.store.saveSession({
      ...session,
      revokedAt: this.clock.now().toISOString(),
    });
    await this.audit.record({
      companyId: session.companyId,
      actorUserId,
      action: "session.revoke",
      entityType: "session",
      entityId: sessionId,
      outcome: "success",
    });
    return ok(undefined);
  }

  async revokeAllForUser(
    userId: string,
    actorUserId: string | null,
  ): Promise<Result<void, PlatformError>> {
    const sessions = await this.store.listSessionsByUser(userId);
    for (const session of sessions) {
      if (!session.revokedAt) {
        await this.revokeSession(session.id, actorUserId);
      }
    }
    return ok(undefined);
  }

  async #revokeFamily(familyId: string, userId: string): Promise<void> {
    const sessions = await this.store.listSessionsByUser(userId);
    for (const session of sessions) {
      if (session.familyId === familyId && !session.revokedAt) {
        await this.revokeSession(session.id, userId);
      }
    }
    await this.audit.record({
      companyId: null,
      actorUserId: userId,
      action: "session.family_revoked",
      entityType: "session_family",
      entityId: familyId,
      outcome: "failure",
      details: { reason: "refresh_reuse" },
    });
  }
}
