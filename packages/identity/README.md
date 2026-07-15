# @afh/identity

Enterprise **Identity & Security Foundation** (Phase 2A).

Depends on: `@afh/shared-kernel`, `@afh/persistence`  
Architecture: [`docs/architecture/`](../../docs/architecture/README.md) (frozen), especially Phase 0E.

## Purpose

Authentication, session lifecycle, RBAC data, **Policy Engine as sole runtime authorization**, organization membership, service accounts, security audit hooks, and security configuration.

**No business domains. No HTTP controllers. No external IdP/OAuth/SMS/email providers.**

## Key rule

Services must call `PolicyEngine.evaluate(...)` for authorization. Do not embed allow/deny logic in application services.

## Contents

| Area | Path |
|------|------|
| Models | `src/models` |
| Security config | `src/configuration` |
| Password hasher contracts | `src/credentials` |
| Security audit | `src/audit` |
| Identity store | `src/stores` |
| Policy engine | `src/policy` |
| RBAC | `src/rbac` |
| Sessions | `src/session` |
| Authentication | `src/authentication` |
| Organizations | `src/organization` |
| Service accounts | `src/service-accounts` |
| Employee/partner links | `src/profiles` |
| Composition root | `src/composition` |

## Usage

```ts
import { createIdentityFoundation } from "@afh/identity";

const identity = createIdentityFoundation();
const registered = await identity.authentication.register({
  companyId: "co_1",
  email: "user@example.com",
  password: "Str0ngPassword!",
  fullName: "Example User",
});
```

## Out of scope

Workflow, Approval, Rules (Phase 2B), Event Bus, Notifications delivery, Commerce/Sales/etc., OAuth providers, APIs/UI.
