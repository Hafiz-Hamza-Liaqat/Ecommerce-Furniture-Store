/**
 * Production secret loading — never hardcode secrets.
 * Supports JWT, database, broker, and API secret refs with rotation hooks.
 */

import { randomBytes } from "node:crypto";
import { MapSecretProvider } from "@afh/infrastructure";
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
  type SecretRef,
} from "@afh/shared-kernel";

export const DATABASE_URL_REF: SecretRef = { name: "database.url" };
export const BROKER_CREDENTIAL_REF: SecretRef = { name: "broker.credential" };
export const API_SECRET_REF: SecretRef = { name: "api.secret" };

export const PRODUCTION_SECRET_REFS = [
  JWT_SIGNING_KEY_REF,
  DATABASE_URL_REF,
  BROKER_CREDENTIAL_REF,
  API_SECRET_REF,
] as const;

function envNameForRef(ref: SecretRef): string {
  return `AFH_SECRET_${ref.name.replace(/\./g, "_").toUpperCase()}`;
}

/**
 * Loads secrets from process environment into a SecretProvider.
 * Optional previous JWT key enables rotation without downtime.
 */
export function loadProductionSecrets(
  env: NodeJS.ProcessEnv = process.env,
): SecretProvider {
  const map: Record<string, string> = {};
  const pairs: Array<{ ref: SecretRef; envKey: string }> = [
    { ref: JWT_SIGNING_KEY_REF, envKey: "AFH_SECRET_JWT_SIGNING_KEY" },
    {
      ref: JWT_SIGNING_KEY_PREVIOUS_REF,
      envKey: "AFH_SECRET_JWT_SIGNING_KEY_PREVIOUS",
    },
    { ref: DATABASE_URL_REF, envKey: "AFH_SECRET_DATABASE_URL" },
    { ref: BROKER_CREDENTIAL_REF, envKey: "AFH_SECRET_BROKER_CREDENTIAL" },
    { ref: API_SECRET_REF, envKey: "AFH_SECRET_API_SECRET" },
  ];

  for (const { ref, envKey } of pairs) {
    const value = env[envKey] ?? env[envNameForRef(ref)];
    if (value != null && value.trim().length > 0) {
      map[ref.name] = value.trim();
    }
  }

  return new MapSecretProvider(map);
}

export type SecretValidationOptions = {
  readonly requireAll: boolean;
  /** Development may generate an ephemeral JWT key when missing. */
  readonly allowEphemeralJwt: boolean;
};

export type ValidatedSecrets = {
  readonly provider: SecretProvider;
  readonly ephemeralJwt: boolean;
};

/**
 * Validates required secrets. Optionally installs an ephemeral JWT key for local/dev.
 */
export async function validateProductionSecrets(
  secrets: SecretProvider,
  options: SecretValidationOptions,
): Promise<Result<ValidatedSecrets, PlatformError>> {
  const missing: string[] = [];
  for (const ref of PRODUCTION_SECRET_REFS) {
    if (ref.name === JWT_SIGNING_KEY_REF.name) continue;
    const value = await secrets.getSecret(ref);
    if (isFail(value) && options.requireAll) {
      missing.push(ref.name);
    }
  }

  const jwt = await secrets.getSecret(JWT_SIGNING_KEY_REF);
  let provider = secrets;
  let ephemeralJwt = false;

  if (isFail(jwt)) {
    if (options.allowEphemeralJwt) {
      const ephemeral = randomBytes(48).toString("base64url");
      provider = new MapSecretProvider({
        ...(await dumpSecrets(secrets)),
        [JWT_SIGNING_KEY_REF.name]: ephemeral,
      });
      ephemeralJwt = true;
    } else {
      missing.push(JWT_SIGNING_KEY_REF.name);
    }
  } else if (jwt.value.trim().length < 32) {
    missing.push(`${JWT_SIGNING_KEY_REF.name} (min 32 chars)`);
  }

  if (missing.length > 0) {
    return fail(
      new InfrastructureError(`Missing required secrets: ${missing.join(", ")}`, {
        code: "secrets_missing",
        details: { missing },
      }),
    );
  }

  return ok({ provider, ephemeralJwt });
}

async function dumpSecrets(
  secrets: SecretProvider,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const refs = [
    JWT_SIGNING_KEY_REF,
    JWT_SIGNING_KEY_PREVIOUS_REF,
    DATABASE_URL_REF,
    BROKER_CREDENTIAL_REF,
    API_SECRET_REF,
  ];
  for (const ref of refs) {
    const value = await secrets.getSecret(ref);
    if (!isFail(value)) {
      out[ref.name] = value.value;
    }
  }
  return out;
}
