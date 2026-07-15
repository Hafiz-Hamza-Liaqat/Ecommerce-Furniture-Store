/**
 * Security provider readiness probes — signing keys, secrets, session store.
 */

import type { IdentityStore } from "@afh/identity";
import type { HealthProbe } from "@afh/infrastructure";
import { ok, type SecretProvider, type SecretRef } from "@afh/shared-kernel";
import type { JwtTokenProvider } from "../jwt/jwt-token-provider.js";
import {
  JWT_SIGNING_KEY_REF,
  secretProviderReady,
} from "../secrets/signing-keys.js";

export function createSigningKeyHealthProbe(
  jwt: JwtTokenProvider,
): HealthProbe {
  return {
    name: "security_signing_keys",
    async check() {
      const ready = await jwt.readiness();
      if (!ready.ok) {
        return ready;
      }
      return ok({
        name: "security_signing_keys",
        status: "up",
        detail: `kid=${ready.value.kid}`,
      });
    },
  };
}

export function createSecretProviderHealthProbe(
  secrets: SecretProvider,
  refs: readonly SecretRef[] = [JWT_SIGNING_KEY_REF],
): HealthProbe {
  return {
    name: "security_secret_provider",
    async check() {
      const ready = await secretProviderReady(secrets, refs);
      if (!ready.ok) {
        return ready;
      }
      return ok({
        name: "security_secret_provider",
        status: "up",
        detail: `resolved=${ready.value.resolved}`,
      });
    },
  };
}

export function createSessionPersistenceHealthProbe(
  store: IdentityStore,
): HealthProbe {
  return {
    name: "security_session_persistence",
    async check() {
      // Round-trip probe: list for a sentinel user id (empty is healthy).
      await store.listSessionsByUser("__health_probe__");
      return ok({
        name: "security_session_persistence",
        status: "up",
        detail: "reachable",
      });
    },
  };
}
