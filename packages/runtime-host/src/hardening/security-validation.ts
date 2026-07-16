/**
 * Security operational validation — rotation / session / MFA / audit wiring.
 * Does not redesign authentication or authorization.
 */

import type { ApiHost } from "@afh/api";
import {
  JWT_SIGNING_KEY_PREVIOUS_REF,
  JWT_SIGNING_KEY_REF,
} from "@afh/identity-providers";
import {
  InfrastructureError,
  fail,
  isFail,
  ok,
  type PlatformError,
  type Result,
  type SecretProvider,
} from "@afh/shared-kernel";

export type SecurityValidationReport = {
  readonly checked: readonly string[];
  readonly jwtPresent: boolean;
  readonly jwtRotationConfigured: boolean;
  readonly securityCompositionEnabled: boolean;
  readonly auditStorePresent: boolean;
  readonly sessionProbePresent: boolean;
  readonly signingProbePresent: boolean;
};

/**
 * Validates production security operational posture without reading secret values into logs.
 */
export async function validateSecurityHardening(options: {
  readonly secrets: SecretProvider;
  readonly host: ApiHost;
  readonly requireRotationKey?: boolean;
}): Promise<Result<SecurityValidationReport, PlatformError>> {
  const checked: string[] = [];

  const jwt = await options.secrets.getSecret(JWT_SIGNING_KEY_REF);
  if (isFail(jwt) || jwt.value.trim().length < 32) {
    return fail(
      new InfrastructureError("JWT signing key missing or weak", {
        code: "security_jwt_invalid",
      }),
    );
  }
  checked.push("jwt_signing_key");

  const previous = await options.secrets.getSecret(JWT_SIGNING_KEY_PREVIOUS_REF);
  const jwtRotationConfigured = !isFail(previous) && previous.value.trim().length >= 32;
  if (options.requireRotationKey && !jwtRotationConfigured) {
    return fail(
      new InfrastructureError("JWT previous signing key required for rotation validation", {
        code: "security_jwt_rotation_missing",
      }),
    );
  }
  checked.push(
    jwtRotationConfigured ? "jwt_rotation_configured" : "jwt_rotation_optional",
  );

  const securityEnabled = options.host.composition.security != null;
  if (!securityEnabled) {
    return fail(
      new InfrastructureError("Security providers not enabled on host", {
        code: "security_providers_disabled",
      }),
    );
  }
  checked.push("security_composition");

  const health = await options.host.composition.infrastructure.health.checkAll();
  if (!health.ok) return health;
  const names = new Set(health.value.checks.map((c) => c.name));
  const sessionProbePresent = names.has("security_session_persistence");
  const signingProbePresent = names.has("security_signing_keys");
  if (!sessionProbePresent || !signingProbePresent) {
    return fail(
      new InfrastructureError("Security health probes missing", {
        code: "security_probes_missing",
        details: {
          sessionProbePresent,
          signingProbePresent,
        },
      }),
    );
  }
  checked.push("security_health_probes");

  // Audit pipeline: security composition exposes identity audit; presence of auditStore wiring
  const auditStorePresent =
    options.host.composition.identity.audit != null;
  if (!auditStorePresent) {
    return fail(
      new InfrastructureError("Security audit pipeline missing", {
        code: "security_audit_missing",
      }),
    );
  }
  checked.push("audit_pipeline");

  // MFA: verify provider surface exists when security enabled (config verification only)
  const mfa = options.host.composition.security?.mfa;
  if (!mfa) {
    return fail(
      new InfrastructureError("MFA provider not composed", {
        code: "security_mfa_missing",
      }),
    );
  }
  checked.push("mfa_provider");

  return ok({
    checked,
    jwtPresent: true,
    jwtRotationConfigured,
    securityCompositionEnabled: true,
    auditStorePresent: true,
    sessionProbePresent: true,
    signingProbePresent: true,
  });
}
