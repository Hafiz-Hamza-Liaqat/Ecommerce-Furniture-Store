/**
 * Enterprise security providers composition — provider integrations only.
 * Does not alter AuthenticationService flows or Policy authorization.
 */

import {
  createIdentityFoundation,
  StaticSecurityConfigProvider,
  type CreateIdentityFoundationOptions,
  type IdentityFoundation,
  type SecurityAuditStore,
  type SecurityConfig,
} from "@afh/identity";
import type { HealthProbe } from "@afh/infrastructure";
import {
  SystemUtcClock,
  type Clock,
  type Metrics,
  type SecretProvider,
} from "@afh/shared-kernel";
import { bindProductionSecurityConfig } from "../configuration/production-security-config.js";
import { EmailVerificationProvider } from "../email-verification/email-verification-provider.js";
import {
  createSecretProviderHealthProbe,
  createSessionPersistenceHealthProbe,
  createSigningKeyHealthProbe,
} from "../health/security-health-probes.js";
import { JwtTokenProvider, type JwtKeyRotationHook } from "../jwt/jwt-token-provider.js";
import { EmailOtpMfaProvider } from "../mfa/email-otp-provider.js";
import { SmsOtpMfaProvider } from "../mfa/sms-otp-provider.js";
import { TotpMfaProvider } from "../mfa/totp-provider.js";
import { SecurityMetrics } from "../observability/security-metrics.js";
import {
  DEFAULT_SCRYPT_WORK_FACTORS,
  ScryptPasswordHasher,
  type ScryptWorkFactors,
} from "../password/scrypt-password-hasher.js";
import { PasswordResetProvider } from "../password-reset/password-reset-provider.js";
import { ServiceAccountCredentialProvider } from "../service-accounts/service-account-credential-provider.js";
import { DurableSessionProvider } from "../session/durable-session-provider.js";
import type { ConfigurationSource } from "@afh/shared-kernel";

export type IdentitySecurityProviders = {
  readonly identity: IdentityFoundation;
  readonly passwordHasher: ScryptPasswordHasher;
  readonly sessions: DurableSessionProvider;
  readonly jwt: JwtTokenProvider;
  readonly mfa: {
    readonly totp: TotpMfaProvider;
    readonly emailOtp: EmailOtpMfaProvider;
    readonly smsOtp: SmsOtpMfaProvider;
  };
  readonly emailVerification: EmailVerificationProvider;
  readonly passwordReset: PasswordResetProvider;
  readonly serviceAccountCredentials: ServiceAccountCredentialProvider;
  readonly metrics: SecurityMetrics;
  readonly healthProbes: readonly HealthProbe[];
  readonly config: SecurityConfig;
};

export type CreateIdentitySecurityProvidersOptions = {
  readonly secrets: SecretProvider;
  readonly metrics: Metrics;
  readonly clock?: Clock;
  readonly securityConfig?: SecurityConfig;
  readonly configSource?: ConfigurationSource;
  readonly scrypt?: Partial<ScryptWorkFactors>;
  readonly jwtRotation?: JwtKeyRotationHook;
  /** Identity foundation options (store / auditStore / persistence). */
  readonly identity?: Omit<
    CreateIdentityFoundationOptions,
    "passwordHasher" | "securityConfig" | "clock"
  > & {
    readonly auditStore?: SecurityAuditStore;
  };
};

/**
 * Wires production password, session, JWT, MFA, verification, reset,
 * service-account credentials, health, and observability providers onto
 * an Identity foundation instance. Authentication/Policy services unchanged.
 */
export function createIdentitySecurityProviders(
  options: CreateIdentitySecurityProvidersOptions,
): IdentitySecurityProviders {
  const clock = options.clock ?? new SystemUtcClock();
  const config = options.configSource
    ? bindProductionSecurityConfig(
        options.configSource,
        options.securityConfig ?? {},
      )
    : (options.securityConfig ??
      bindProductionSecurityConfig(
        { get: () => undefined, has: () => false },
        {},
      ));

  const passwordHasher = new ScryptPasswordHasher(
    options.scrypt ?? DEFAULT_SCRYPT_WORK_FACTORS,
  );

  const identity = createIdentityFoundation({
    ...(options.identity ?? {}),
    clock,
    securityConfig: config,
    passwordHasher,
    metrics: options.metrics,
  });

  const configProvider = new StaticSecurityConfigProvider(config);
  const securityMetrics = new SecurityMetrics(options.metrics);

  const sessions = new DurableSessionProvider(
    identity.sessions,
    identity.store,
    clock,
    identity.audit,
    securityMetrics,
  );

  const jwt = new JwtTokenProvider(
    options.secrets,
    configProvider,
    clock,
    identity.audit,
    securityMetrics,
    options.jwtRotation ?? {},
  );

  const totp = new TotpMfaProvider(
    clock,
    identity.audit,
    securityMetrics,
    { issuer: config.token.issuer },
  );
  const emailOtp = new EmailOtpMfaProvider(
    identity.store,
    clock,
    identity.audit,
    securityMetrics,
  );
  const smsOtp = new SmsOtpMfaProvider(
    identity.store,
    clock,
    identity.audit,
    securityMetrics,
  );

  const emailVerification = new EmailVerificationProvider(
    identity.store,
    clock,
    identity.audit,
  );
  const passwordReset = new PasswordResetProvider(
    identity.store,
    clock,
    identity.audit,
  );
  const serviceAccountCredentials = new ServiceAccountCredentialProvider(
    identity.serviceAccounts,
    identity.store,
    passwordHasher,
    configProvider,
    clock,
    identity.audit,
  );

  const healthProbes: HealthProbe[] = [
    createSigningKeyHealthProbe(jwt),
    createSecretProviderHealthProbe(options.secrets),
    createSessionPersistenceHealthProbe(identity.store),
  ];

  return {
    identity,
    passwordHasher,
    sessions,
    jwt,
    mfa: { totp, emailOtp, smsOtp },
    emailVerification,
    passwordReset,
    serviceAccountCredentials,
    metrics: securityMetrics,
    healthProbes,
    config,
  };
}
