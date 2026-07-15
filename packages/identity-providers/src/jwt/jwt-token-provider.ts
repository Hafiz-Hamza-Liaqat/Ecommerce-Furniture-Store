/**
 * Production JWT provider — HS256 access/refresh tokens via SecretProvider.
 * Authorization remains Policy-only; JWTs carry identity claims only.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  SecurityAuditService,
  SecurityConfigProvider,
  TokenPolicy,
} from "@afh/identity";
import {
  AuthorizationError,
  InfrastructureError,
  fail,
  isFail,
  ok,
  type Clock,
  type PlatformError,
  type Result,
  type SecretProvider,
} from "@afh/shared-kernel";
import type { SecurityMetrics } from "../observability/security-metrics.js";
import {
  JWT_SIGNING_KEY_PREVIOUS_REF,
  JWT_SIGNING_KEY_REF,
  resolveSigningKeys,
  type SigningKeyMaterial,
} from "../secrets/signing-keys.js";

export type JwtTokenKind = "access" | "refresh";

export type JwtClaims = {
  readonly sub: string;
  readonly companyId: string | null;
  readonly sid: string | null;
  readonly kind: JwtTokenKind;
  readonly iss: string;
  readonly aud: string;
  readonly iat: number;
  readonly exp: number;
  readonly jti: string;
};

export type IssuedJwtPair = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessExpiresAt: string;
  readonly refreshExpiresAt: string;
  readonly claims: {
    readonly access: JwtClaims;
    readonly refresh: JwtClaims;
  };
};

export type JwtKeyRotationHook = {
  /** Called after successful verification with a previous (rotated) key. */
  onVerifiedWithPreviousKey?(kid: string): void | Promise<void>;
  /** Called when active key material is reloaded. */
  onKeysReloaded?(material: SigningKeyMaterial): void | Promise<void>;
};

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function signHs256(signingInput: string, secret: string): string {
  return base64UrlEncode(
    createHmac("sha256", secret).update(signingInput).digest(),
  );
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export class JwtTokenProvider {
  #keys: SigningKeyMaterial | null = null;
  readonly #rotation: JwtKeyRotationHook;

  constructor(
    private readonly secrets: SecretProvider,
    private readonly config: SecurityConfigProvider,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
    private readonly metrics?: SecurityMetrics,
    rotation: JwtKeyRotationHook = {},
  ) {
    this.#rotation = rotation;
  }

  /** Reload signing keys from SecretProvider (rotation hook entrypoint). */
  async reloadKeys(): Promise<Result<SigningKeyMaterial, PlatformError>> {
    const resolved = await resolveSigningKeys(this.secrets);
    if (isFail(resolved)) {
      return resolved;
    }
    this.#keys = resolved.value;
    await this.#rotation.onKeysReloaded?.(resolved.value);
    await this.audit.record({
      companyId: null,
      actorUserId: null,
      action: "jwt.keys_reloaded",
      entityType: "signing_key",
      entityId: resolved.value.activeKid,
      outcome: "success",
      details: {
        hasPrevious: resolved.value.previous != null,
      },
    });
    return ok(resolved.value);
  }

  async issuePair(input: {
    readonly subject: string;
    readonly companyId: string | null;
    readonly sessionId: string | null;
    readonly actorUserId?: string | null;
  }): Promise<Result<IssuedJwtPair, PlatformError>> {
    const keys = await this.#ensureKeys();
    if (isFail(keys)) {
      return keys;
    }

    const policy = this.config.get().token;
    const now = this.clock.now();
    const access = this.#buildClaims("access", input, policy, now);
    const refresh = this.#buildClaims("refresh", input, policy, now);

    const accessToken = this.#encode(access, keys.value.activeSecret);
    const refreshToken = this.#encode(refresh, keys.value.activeSecret);

    this.metrics?.tokenIssued("access");
    this.metrics?.tokenIssued("refresh");
    await this.audit.record({
      companyId: input.companyId,
      actorUserId: input.actorUserId ?? input.subject,
      action: "jwt.issue",
      entityType: "token",
      entityId: access.jti,
      outcome: "success",
      details: { sessionId: input.sessionId, refreshJti: refresh.jti },
    });

    return ok({
      accessToken,
      refreshToken,
      accessExpiresAt: new Date(access.exp * 1000).toISOString(),
      refreshExpiresAt: new Date(refresh.exp * 1000).toISOString(),
      claims: { access, refresh },
    });
  }

  async verify(
    token: string,
    expectedKind?: JwtTokenKind,
  ): Promise<Result<JwtClaims, PlatformError>> {
    const keys = await this.#ensureKeys();
    if (isFail(keys)) {
      return keys;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      this.metrics?.authFailure("jwt_malformed");
      return fail(
        new AuthorizationError("Invalid token", { code: "jwt_malformed" }),
      );
    }

    const [headerB64, payloadB64, signature] = parts as [string, string, string];
    const signingInput = `${headerB64}.${payloadB64}`;

    let verifiedWithPrevious = false;
    let valid =
      safeEqual(signHs256(signingInput, keys.value.activeSecret), signature);
    if (!valid && keys.value.previous) {
      valid = safeEqual(
        signHs256(signingInput, keys.value.previous.secret),
        signature,
      );
      verifiedWithPrevious = valid;
    }

    if (!valid) {
      this.metrics?.authFailure("jwt_signature");
      return fail(
        new AuthorizationError("Invalid token signature", {
          code: "jwt_invalid_signature",
        }),
      );
    }

    if (verifiedWithPrevious && keys.value.previous) {
      await this.#rotation.onVerifiedWithPreviousKey?.(
        keys.value.previous.kid,
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
    } catch {
      return fail(
        new AuthorizationError("Invalid token payload", {
          code: "jwt_malformed",
        }),
      );
    }

    const claims = payload as JwtClaims;
    const policy = this.config.get().token;
    if (claims.iss !== policy.issuer || claims.aud !== policy.audience) {
      return fail(
        new AuthorizationError("Invalid token audience", {
          code: "jwt_audience",
        }),
      );
    }
    if (expectedKind && claims.kind !== expectedKind) {
      return fail(
        new AuthorizationError("Unexpected token kind", {
          code: "jwt_kind",
        }),
      );
    }
    if (claims.exp * 1000 < this.clock.now().getTime()) {
      this.metrics?.authFailure("jwt_expired");
      return fail(
        new AuthorizationError("Token expired", { code: "jwt_expired" }),
      );
    }

    return ok(claims);
  }

  /** Health: signing keys resolvable. */
  async readiness(): Promise<Result<{ kid: string }, PlatformError>> {
    const keys = await this.#ensureKeys();
    if (isFail(keys)) {
      return keys;
    }
    if (!keys.value.activeSecret) {
      return fail(
        new InfrastructureError("Signing key empty", {
          code: "jwt_key_empty",
          details: { ref: JWT_SIGNING_KEY_REF.name },
        }),
      );
    }
    return ok({ kid: keys.value.activeKid });
  }

  async #ensureKeys(): Promise<Result<SigningKeyMaterial, PlatformError>> {
    if (this.#keys) {
      return ok(this.#keys);
    }
    return this.reloadKeys();
  }

  #buildClaims(
    kind: JwtTokenKind,
    input: {
      readonly subject: string;
      readonly companyId: string | null;
      readonly sessionId: string | null;
    },
    policy: TokenPolicy,
    now: Date,
  ): JwtClaims {
    const ttl =
      kind === "access" ? policy.accessTtlSeconds : policy.refreshTtlSeconds;
    const iat = Math.floor(now.getTime() / 1000);
    return {
      sub: input.subject,
      companyId: input.companyId,
      sid: input.sessionId,
      kind,
      iss: policy.issuer,
      aud: policy.audience,
      iat,
      exp: iat + ttl,
      jti: `${kind}_${iat}_${Math.random().toString(36).slice(2, 10)}`,
    };
  }

  #encode(claims: JwtClaims, secret: string): string {
    const header = base64UrlEncode(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    );
    const payload = base64UrlEncode(JSON.stringify(claims));
    const signingInput = `${header}.${payload}`;
    return `${signingInput}.${signHs256(signingInput, secret)}`;
  }
}

export { JWT_SIGNING_KEY_REF, JWT_SIGNING_KEY_PREVIOUS_REF };
