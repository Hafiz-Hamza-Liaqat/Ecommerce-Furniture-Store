/**
 * Durable session provider — delegates lifecycle to Identity SessionService
 * (Phase 7B SQL IdentityStore when injected). No auth-flow changes.
 */

import type {
  IdentityStore,
  SecurityAuditService,
  SessionRecord,
  SessionService,
  SessionTokens,
} from "@afh/identity";
import type { Clock, PlatformError, Result } from "@afh/shared-kernel";
import { AuthorizationError, fail, ok } from "@afh/shared-kernel";
import type { SecurityMetrics } from "../observability/security-metrics.js";

export type SessionDeviceMetadata = {
  readonly deviceLabel: string | null;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
};

/**
 * Production session facade over durable IdentityStore + SessionService.
 * Creation, refresh rotation, revocation, expiration, and device metadata.
 */
export class DurableSessionProvider {
  constructor(
    private readonly sessions: SessionService,
    private readonly store: IdentityStore,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
    private readonly metrics?: SecurityMetrics,
  ) {}

  async create(
    input: {
      readonly userId: string;
      readonly companyId: string | null;
      readonly familyId?: string;
    } & SessionDeviceMetadata,
  ): Promise<Result<SessionTokens, PlatformError>> {
    const result = await this.sessions.createSession(input);
    if (result.ok) {
      this.metrics?.tokenIssued("session");
    }
    return result;
  }

  async refresh(
    sessionId: string,
    refreshToken: string,
  ): Promise<Result<SessionTokens, PlatformError>> {
    const result = await this.sessions.refreshSession(sessionId, refreshToken);
    if (result.ok) {
      this.metrics?.tokenIssued("session_refresh");
    } else {
      this.metrics?.authFailure("session_refresh");
    }
    return result;
  }

  async revoke(
    sessionId: string,
    actorUserId: string | null,
  ): Promise<Result<void, PlatformError>> {
    return this.sessions.revokeSession(sessionId, actorUserId);
  }

  async revokeAllForUser(
    userId: string,
    actorUserId: string | null,
  ): Promise<Result<void, PlatformError>> {
    return this.sessions.revokeAllForUser(userId, actorUserId);
  }

  /**
   * Expire a session if idle/absolute deadlines have passed (idempotent revoke).
   */
  async expireIfNeeded(
    sessionId: string,
  ): Promise<Result<{ expired: boolean; session: SessionRecord | null }, PlatformError>> {
    const session = await this.store.getSession(sessionId);
    if (!session || session.revokedAt) {
      return ok({ expired: false, session: session ?? null });
    }

    const now = this.clock.now();
    const absoluteExpired = new Date(session.absoluteExpiresAt) < now;
    const refreshExpired = new Date(session.expiresAt) < now;

    if (!absoluteExpired && !refreshExpired) {
      return ok({ expired: false, session });
    }

    await this.sessions.revokeSession(sessionId, session.userId);
    await this.audit.record({
      companyId: session.companyId,
      actorUserId: session.userId,
      action: "session.expire",
      entityType: "session",
      entityId: sessionId,
      outcome: "success",
      details: {
        reason: absoluteExpired ? "absolute" : "refresh",
      },
    });
    return ok({ expired: true, session });
  }

  async get(sessionId: string): Promise<SessionRecord | null> {
    return this.store.getSession(sessionId);
  }

  async assertActive(
    sessionId: string,
  ): Promise<Result<SessionRecord, PlatformError>> {
    const expired = await this.expireIfNeeded(sessionId);
    if (!expired.ok) {
      return expired;
    }
    const session = expired.value.session;
    if (!session || session.revokedAt || expired.value.expired) {
      return fail(
        new AuthorizationError("Session invalid", { code: "session_invalid" }),
      );
    }
    return ok(session);
  }

  deviceMetadata(session: SessionRecord): SessionDeviceMetadata {
    return {
      deviceLabel: session.deviceLabel,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    };
  }
}
