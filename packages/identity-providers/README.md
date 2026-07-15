# @afh/identity-providers

Enterprise **Authentication & Security Providers** (Phase 7C).

Production-ready providers for password hashing, durable sessions, JWT, MFA,
email verification, password reset, and service-account credentials.

**Does not change** Identity authentication workflows or Policy authorization.

## Composition

```ts
import { MapSecretProvider, InMemoryMetrics } from "@afh/infrastructure";
import { createIdentitySecurityProviders } from "@afh/identity-providers";

const secrets = new MapSecretProvider({
  "jwt.signing_key": process.env.JWT_SIGNING_KEY!, // externalized
});

const security = createIdentitySecurityProviders({
  secrets,
  metrics: new InMemoryMetrics(),
  identity: {
    store: sql.identityStore,
    auditStore: sql.securityAuditStore,
  },
});

// Register readiness probes
for (const probe of security.healthProbes) {
  infra.health.register(probe);
}

// Identity foundation uses ScryptPasswordHasher; sessions use SQL store
const { identity, jwt, mfa, sessions } = security;
```

## Providers

| Provider | Role |
|----------|------|
| `ScryptPasswordHasher` | Production hashing + legacy sha256$ migration |
| `DurableSessionProvider` | Create / refresh / revoke / expire + device metadata |
| `JwtTokenProvider` | Access/refresh JWT, sign/verify, key rotation hooks |
| `TotpMfaProvider` / `EmailOtpMfaProvider` / `SmsOtpMfaProvider` | Pluggable MFA (no delivery) |
| `EmailVerificationProvider` | Verification token infrastructure |
| `PasswordResetProvider` | Secure reset tokens (no UI/transport) |
| `ServiceAccountCredentialProvider` | Issue / rotate / revoke / expire |
| Health probes | Signing keys, secrets, session persistence |
| `SecurityMetrics` | Login / token / MFA / failure counters |

## Secrets

JWT signing material is loaded only via `SecretProvider` refs:

- `jwt.signing_key` (required, ≥32 chars)
- `jwt.signing_key.previous` (optional, rotation)

## Out of scope

OAuth, social login, SSO, UI, HTTP redesign, business authorization,
Workflow/Rules/Approval, Event Bus, notification delivery.
