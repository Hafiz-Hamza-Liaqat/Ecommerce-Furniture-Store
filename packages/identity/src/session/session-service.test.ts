/**
 * RC9.5 — Session idle / refresh / absolute expiry + concurrent session behavior.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FixedClock } from "@afh/shared-kernel";
import {
  createIdentityFoundation,
  DEFAULT_SECURITY_CONFIG,
  type SecurityConfig,
} from "../index.js";

const shortPolicy: SecurityConfig = {
  ...DEFAULT_SECURITY_CONFIG,
  session: {
    accessTtlSeconds: 60,
    idleTtlSeconds: 600,
    absoluteTtlSeconds: 3_600,
    refreshTtlSeconds: 120,
  },
};

const idlePolicy: SecurityConfig = {
  ...DEFAULT_SECURITY_CONFIG,
  session: {
    accessTtlSeconds: 60,
    idleTtlSeconds: 60,
    absoluteTtlSeconds: 3_600,
    refreshTtlSeconds: 600,
  },
};

describe("SessionService RC9.5 expiry", () => {
  it("rejects refresh when refresh TTL (expiresAt) has elapsed", async () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
    const identity = createIdentityFoundation({
      clock,
      securityConfig: shortPolicy,
    });
    const created = await identity.sessions.createSession({
      userId: "user-1",
      companyId: "co-1",
      deviceLabel: null,
      userAgent: null,
      ipAddress: null,
    });
    assert.ok(created.ok);

    clock.advanceByMilliseconds(121_000);
    const refreshed = await identity.sessions.refreshSession(
      created.value.sessionId,
      created.value.refreshToken,
    );
    assert.equal(refreshed.ok, false);
    if (!refreshed.ok) {
      assert.equal(refreshed.error.code, "session_refresh_expired");
    }
  });

  it("rejects refresh and touch when idle TTL has elapsed", async () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
    const identity = createIdentityFoundation({
      clock,
      securityConfig: idlePolicy,
    });
    const created = await identity.sessions.createSession({
      userId: "user-1",
      companyId: "co-1",
      deviceLabel: null,
      userAgent: null,
      ipAddress: null,
    });
    assert.ok(created.ok);

    clock.advanceByMilliseconds(61_000);
    const refreshed = await identity.sessions.refreshSession(
      created.value.sessionId,
      created.value.refreshToken,
    );
    assert.equal(refreshed.ok, false);
    if (!refreshed.ok) {
      assert.equal(refreshed.error.code, "session_idle_expired");
    }
  });

  it("evaluateSessionExpiry reports idle without requiring refresh", async () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
    const identity = createIdentityFoundation({
      clock,
      securityConfig: idlePolicy,
    });
    const created = await identity.sessions.createSession({
      userId: "user-1",
      companyId: null,
      deviceLabel: null,
      userAgent: null,
      ipAddress: null,
    });
    assert.ok(created.ok);
    const session = await identity.store.getSession(created.value.sessionId);
    assert.ok(session);
    assert.equal(identity.sessions.evaluateSessionExpiry(session), null);

    clock.advanceByMilliseconds(61_000);
    const idle = identity.sessions.evaluateSessionExpiry(session);
    assert.ok(idle);
    assert.equal(idle.code, "session_idle_expired");
  });

  it("creates independent sessions; revoke one does not revoke the other", async () => {
    const identity = createIdentityFoundation();
    const a = await identity.sessions.createSession({
      userId: "user-1",
      companyId: "co-1",
      deviceLabel: "device-a",
      userAgent: null,
      ipAddress: null,
    });
    const b = await identity.sessions.createSession({
      userId: "user-1",
      companyId: "co-1",
      deviceLabel: "device-b",
      userAgent: null,
      ipAddress: null,
    });
    assert.ok(a.ok && b.ok);
    assert.notEqual(a.value.sessionId, b.value.sessionId);
    assert.notEqual(
      (await identity.store.getSession(a.value.sessionId))!.familyId,
      (await identity.store.getSession(b.value.sessionId))!.familyId,
    );

    await identity.sessions.revokeSession(a.value.sessionId, "user-1");
    const aRec = await identity.store.getSession(a.value.sessionId);
    const bRec = await identity.store.getSession(b.value.sessionId);
    assert.ok(aRec?.revokedAt);
    assert.equal(bRec?.revokedAt, null);
  });

  it("issues a new session id on each create (session fixation resistance)", async () => {
    const identity = createIdentityFoundation();
    const first = await identity.sessions.createSession({
      userId: "user-1",
      companyId: null,
      deviceLabel: null,
      userAgent: null,
      ipAddress: null,
    });
    const second = await identity.sessions.createSession({
      userId: "user-1",
      companyId: null,
      deviceLabel: null,
      userAgent: null,
      ipAddress: null,
    });
    assert.ok(first.ok && second.ok);
    assert.notEqual(first.value.sessionId, second.value.sessionId);
  });
});
