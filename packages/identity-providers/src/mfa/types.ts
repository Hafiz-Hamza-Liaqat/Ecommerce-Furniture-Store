/**
 * MFA provider contracts — pluggable; no vendor/business logic.
 */

import type { PlatformError, Result } from "@afh/shared-kernel";

export type MfaFactorKind = "totp" | "email_otp" | "sms_otp";

export type MfaChallenge = {
  readonly challengeId: string;
  readonly kind: MfaFactorKind;
  readonly expiresAt: string;
  /** Opaque delivery hint only (never the OTP itself in logs). */
  readonly deliveryHint: string | null;
};

export interface MfaProvider {
  readonly kind: MfaFactorKind;
  issue(input: {
    readonly userId: string;
    readonly destination?: string | null;
  }): Promise<Result<MfaChallenge, PlatformError>>;
  verify(input: {
    readonly userId: string;
    readonly challengeId: string;
    readonly code: string;
  }): Promise<Result<{ verified: true }, PlatformError>>;
}

export type TotpEnrollment = {
  readonly secret: string;
  readonly otpauthUri: string;
  readonly issuer: string;
  readonly accountName: string;
};
