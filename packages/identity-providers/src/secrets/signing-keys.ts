/**
 * Signing key material resolved from SecretProvider — never hardcoded.
 */

import {
  InfrastructureError,
  fail,
  isFail,
  ok,
  type PlatformError,
  type Result,
  type SecretProvider,
  type SecretRef,
} from "@afh/shared-kernel";

export const JWT_SIGNING_KEY_REF: SecretRef = { name: "jwt.signing_key" };
export const JWT_SIGNING_KEY_PREVIOUS_REF: SecretRef = {
  name: "jwt.signing_key.previous",
};

export type SigningKeyMaterial = {
  readonly activeKid: string;
  readonly activeSecret: string;
  readonly previous: { readonly kid: string; readonly secret: string } | null;
};

export async function resolveSigningKeys(
  secrets: SecretProvider,
): Promise<Result<SigningKeyMaterial, PlatformError>> {
  const active = await secrets.getSecret(JWT_SIGNING_KEY_REF);
  if (isFail(active)) {
    return fail(
      new InfrastructureError("JWT signing key unavailable", {
        code: "jwt_signing_key_missing",
        details: { ref: JWT_SIGNING_KEY_REF.name },
      }),
    );
  }
  if (active.value.trim().length < 32) {
    return fail(
      new InfrastructureError("JWT signing key too short", {
        code: "jwt_signing_key_weak",
        details: { minLength: 32 },
      }),
    );
  }

  const previousResult = await secrets.getSecret(JWT_SIGNING_KEY_PREVIOUS_REF);
  const previous =
    !isFail(previousResult) && previousResult.value.trim().length > 0
      ? {
          kid: "previous",
          secret: previousResult.value,
        }
      : null;

  return ok({
    activeKid: "active",
    activeSecret: active.value,
    previous,
  });
}

export async function secretProviderReady(
  secrets: SecretProvider,
  refs: readonly SecretRef[],
): Promise<Result<{ resolved: number }, PlatformError>> {
  let resolved = 0;
  for (const ref of refs) {
    const value = await secrets.getSecret(ref);
    if (isFail(value)) {
      return fail(
        new InfrastructureError(`Secret unavailable: ${ref.name}`, {
          code: "secret_unavailable",
          details: { name: ref.name },
        }),
      );
    }
    resolved += 1;
  }
  return ok({ resolved });
}
