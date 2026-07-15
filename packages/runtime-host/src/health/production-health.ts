/**
 * Additional production health probes — Outbox, Inbox, Secrets.
 * Complements database / Event Bus / config / SQL / messaging / security probes.
 */

import type { HealthProbe, OutboxDispatcher } from "@afh/infrastructure";
import type { InboxStore, OutboxStore } from "@afh/persistence";
import { JWT_SIGNING_KEY_REF } from "@afh/identity-providers";
import { isFail, ok, type SecretProvider } from "@afh/shared-kernel";

export function createOutboxHealthProbe(store: OutboxStore): HealthProbe {
  return {
    name: "outbox",
    async check() {
      const pending = await store.listPending(1);
      if (!pending.ok) {
        return ok({
          name: "outbox",
          status: "down",
          detail: pending.error.message,
        });
      }
      return ok({
        name: "outbox",
        status: "up",
        detail: `reachable pendingSample=${pending.value.length}`,
      });
    },
  };
}

export function createInboxHealthProbe(store: InboxStore): HealthProbe {
  return {
    name: "inbox",
    async check() {
      const seen = await store.hasProcessed("__health__", "__probe__");
      if (!seen.ok) {
        return ok({
          name: "inbox",
          status: "down",
          detail: seen.error.message,
        });
      }
      return ok({
        name: "inbox",
        status: "up",
        detail: "reachable",
      });
    },
  };
}

export function createSecretsHealthProbe(secrets: SecretProvider): HealthProbe {
  return {
    name: "secrets",
    async check() {
      const jwt = await secrets.getSecret(JWT_SIGNING_KEY_REF);
      if (isFail(jwt)) {
        return ok({
          name: "secrets",
          status: "down",
          detail: "jwt.signing_key unavailable",
        });
      }
      if (jwt.value.trim().length < 32) {
        return ok({
          name: "secrets",
          status: "degraded",
          detail: "jwt.signing_key weak",
        });
      }
      return ok({
        name: "secrets",
        status: "up",
        detail: "jwt.signing_key present",
      });
    },
  };
}

export function createOutboxDispatcherHealthProbe(
  dispatcher: OutboxDispatcher,
): HealthProbe {
  return {
    name: "outbox_dispatcher",
    async check() {
      void dispatcher;
      return ok({
        name: "outbox_dispatcher",
        status: "up",
        detail: "registered",
      });
    },
  };
}
