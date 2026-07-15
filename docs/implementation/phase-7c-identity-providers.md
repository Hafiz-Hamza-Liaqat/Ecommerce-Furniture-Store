# Phase 7C — Enterprise Authentication & Security Providers

**Status:** Implemented  
**Package:** `@afh/identity-providers`  
**Depends on:** Phase 2A Identity, Phase 7B SQL (sessions), Phase 0E / 0F  
**Architecture:** Phases 0A–0F (unchanged / frozen)

## Summary

Production security **provider integrations** only. Identity authentication workflows and Policy-only authorization are preserved. Secrets are externalized via `SecretProvider`. Durable sessions use the Phase 7B `IdentityStore` when injected.

## Package path

`packages/identity-providers`

## Composition

```ts
import { MapSecretProvider, InMemoryMetrics } from "@afh/infrastructure";
import { createIdentitySecurityProviders } from "@afh/identity-providers";
import { createSqlPersistenceFoundation } from "@afh/persistence-sql";

const sql = createSqlPersistenceFoundation({
  config: { databasePath: "./data/afh.sqlite" },
});

const security = createIdentitySecurityProviders({
  secrets: new MapSecretProvider({
    "jwt.signing_key": process.env.JWT_SIGNING_KEY!,
  }),
  metrics: new InMemoryMetrics(),
  identity: {
    store: sql.identityStore,
    auditStore: sql.securityAuditStore,
  },
});

// Optional API host wiring (no route redesign)
createEnterpriseComposition({
  repositories,
  infrastructure: { secrets: /* SecretProvider */, persistence: sql },
  identity: {
    store: sql.identityStore,
    auditStore: sql.securityAuditStore,
  },
  security: { enabled: true },
});
```

## Deliverables

| Deliverable | Implementation |
|-------------|----------------|
| Password provider | `ScryptPasswordHasher` + legacy `sha256$` verify / `needsRehash` |
| Session provider | `DurableSessionProvider` over `SessionService` + durable store |
| JWT provider | `JwtTokenProvider` HS256 access/refresh, verify, key reload hooks |
| MFA providers | TOTP / Email OTP / SMS OTP (pluggable; no delivery) |
| Email verification | `EmailVerificationProvider` token infra |
| Password reset | `PasswordResetProvider` secure tokens |
| Service account credentials | Issue / rotate / revoke / expire |
| Secret integration | `jwt.signing_key` (+ optional previous) via `SecretProvider` |
| Security audit | All provider ops → existing `SecurityAuditService` |
| Security configuration | `bindProductionSecurityConfig` (+ token / SA TTL) |
| Health checks | Signing keys, secret provider, session persistence |
| Observability | `SecurityMetrics` (login / token / MFA / failures) |

## Architecture compliance

| Law | Compliance |
|-----|------------|
| Policy sole authorization | JWT carries identity claims only; Policy unchanged |
| Authentication flow unchanged | `AuthenticationService` methods untouched |
| SQL session storage | Inject `SqlIdentityStore`; provider delegates to SessionService |
| Secrets externalized | No signing keys or secrets in source |
| Architecture pack untouched | No edits under `docs/architecture/` |

## Explicit non-goals

OAuth, social login, SSO, UI, HTTP/API redesign, business authorization, Workflow/Rules/Approval, Event Bus, notification delivery.

## Related

- [Phase 2A Identity](./phase-2a-identity.md) (if present)
- [Phase 7B SQL Persistence](./phase-7b-sql-persistence.md)
- [Phase 0E Security Architecture](../architecture/03-security/phase-0e-enterprise-security-architecture.md)
