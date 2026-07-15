/**
 * Security configuration — policy values only (Phase 0E).
 */

export type PasswordPolicy = {
  readonly minLength: number;
  readonly requireUppercase: boolean;
  readonly requireLowercase: boolean;
  readonly requireDigit: boolean;
  readonly requireSymbol: boolean;
};

export type SessionPolicy = {
  readonly accessTtlSeconds: number;
  readonly idleTtlSeconds: number;
  readonly absoluteTtlSeconds: number;
  readonly refreshTtlSeconds: number;
};

export type MfaPolicy = {
  readonly enabled: boolean;
  readonly requiredForAdminRoles: boolean;
  readonly stepUpForHighRiskActions: boolean;
};

export type LockoutPolicy = {
  readonly maxFailedAttempts: number;
  readonly lockoutDurationSeconds: number;
};

export type SecurityConfig = {
  readonly password: PasswordPolicy;
  readonly session: SessionPolicy;
  readonly mfa: MfaPolicy;
  readonly lockout: LockoutPolicy;
};

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    requireSymbol: false,
  },
  session: {
    accessTtlSeconds: 15 * 60,
    idleTtlSeconds: 30 * 60,
    absoluteTtlSeconds: 12 * 60 * 60,
    refreshTtlSeconds: 7 * 24 * 60 * 60,
  },
  mfa: {
    enabled: true,
    requiredForAdminRoles: true,
    stepUpForHighRiskActions: true,
  },
  lockout: {
    maxFailedAttempts: 5,
    lockoutDurationSeconds: 15 * 60,
  },
};

export interface SecurityConfigProvider {
  get(): SecurityConfig;
}

export class StaticSecurityConfigProvider implements SecurityConfigProvider {
  constructor(private readonly config: SecurityConfig) {}

  get(): SecurityConfig {
    return this.config;
  }
}
