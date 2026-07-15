/**
 * Production security configuration binding — values only, no business rules.
 */

import {
  DEFAULT_SECURITY_CONFIG,
  StaticSecurityConfigProvider,
  type SecurityConfig,
  type SecurityConfigProvider,
} from "@afh/identity";
import type { ConfigurationSource } from "@afh/shared-kernel";

function readNumber(
  source: ConfigurationSource,
  key: string,
  fallback: number,
): number {
  const value = source.get(key);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(
  source: ConfigurationSource,
  key: string,
  fallback: string,
): string {
  const value = source.get(key);
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readBoolean(
  source: ConfigurationSource,
  key: string,
  fallback: boolean,
): boolean {
  const value = source.get(key);
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Loads production security policy values from a configuration source.
 * Missing keys fall back to DEFAULT_SECURITY_CONFIG.
 */
export function bindProductionSecurityConfig(
  source: ConfigurationSource,
  overrides: Partial<SecurityConfig> = {},
): SecurityConfig {
  const base = DEFAULT_SECURITY_CONFIG;
  return {
    password: {
      minLength: readNumber(
        source,
        "security.password.minLength",
        overrides.password?.minLength ?? base.password.minLength,
      ),
      requireUppercase: readBoolean(
        source,
        "security.password.requireUppercase",
        overrides.password?.requireUppercase ?? base.password.requireUppercase,
      ),
      requireLowercase: readBoolean(
        source,
        "security.password.requireLowercase",
        overrides.password?.requireLowercase ?? base.password.requireLowercase,
      ),
      requireDigit: readBoolean(
        source,
        "security.password.requireDigit",
        overrides.password?.requireDigit ?? base.password.requireDigit,
      ),
      requireSymbol: readBoolean(
        source,
        "security.password.requireSymbol",
        overrides.password?.requireSymbol ?? base.password.requireSymbol,
      ),
    },
    session: {
      accessTtlSeconds: readNumber(
        source,
        "security.session.accessTtlSeconds",
        overrides.session?.accessTtlSeconds ?? base.session.accessTtlSeconds,
      ),
      idleTtlSeconds: readNumber(
        source,
        "security.session.idleTtlSeconds",
        overrides.session?.idleTtlSeconds ?? base.session.idleTtlSeconds,
      ),
      absoluteTtlSeconds: readNumber(
        source,
        "security.session.absoluteTtlSeconds",
        overrides.session?.absoluteTtlSeconds ??
          base.session.absoluteTtlSeconds,
      ),
      refreshTtlSeconds: readNumber(
        source,
        "security.session.refreshTtlSeconds",
        overrides.session?.refreshTtlSeconds ?? base.session.refreshTtlSeconds,
      ),
    },
    mfa: {
      enabled: readBoolean(
        source,
        "security.mfa.enabled",
        overrides.mfa?.enabled ?? base.mfa.enabled,
      ),
      requiredForAdminRoles: readBoolean(
        source,
        "security.mfa.requiredForAdminRoles",
        overrides.mfa?.requiredForAdminRoles ??
          base.mfa.requiredForAdminRoles,
      ),
      stepUpForHighRiskActions: readBoolean(
        source,
        "security.mfa.stepUpForHighRiskActions",
        overrides.mfa?.stepUpForHighRiskActions ??
          base.mfa.stepUpForHighRiskActions,
      ),
    },
    lockout: {
      maxFailedAttempts: readNumber(
        source,
        "security.lockout.maxFailedAttempts",
        overrides.lockout?.maxFailedAttempts ??
          base.lockout.maxFailedAttempts,
      ),
      lockoutDurationSeconds: readNumber(
        source,
        "security.lockout.lockoutDurationSeconds",
        overrides.lockout?.lockoutDurationSeconds ??
          base.lockout.lockoutDurationSeconds,
      ),
    },
    token: {
      accessTtlSeconds: readNumber(
        source,
        "security.token.accessTtlSeconds",
        overrides.token?.accessTtlSeconds ?? base.token.accessTtlSeconds,
      ),
      refreshTtlSeconds: readNumber(
        source,
        "security.token.refreshTtlSeconds",
        overrides.token?.refreshTtlSeconds ?? base.token.refreshTtlSeconds,
      ),
      issuer: readString(
        source,
        "security.token.issuer",
        overrides.token?.issuer ?? base.token.issuer,
      ),
      audience: readString(
        source,
        "security.token.audience",
        overrides.token?.audience ?? base.token.audience,
      ),
    },
    serviceAccountCredential: {
      ttlSeconds: readNumber(
        source,
        "security.serviceAccountCredential.ttlSeconds",
        overrides.serviceAccountCredential?.ttlSeconds ??
          base.serviceAccountCredential.ttlSeconds,
      ),
    },
  };
}

export function createProductionSecurityConfigProvider(
  source: ConfigurationSource,
  overrides: Partial<SecurityConfig> = {},
): SecurityConfigProvider {
  return new StaticSecurityConfigProvider(
    bindProductionSecurityConfig(source, overrides),
  );
}
