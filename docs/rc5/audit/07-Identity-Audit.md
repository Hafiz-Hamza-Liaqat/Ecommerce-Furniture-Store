# RC5 Identity Audit

## 1. Identity capability matrix

| Capability | API / implementation | Current status | RC5 documentation drift |
|---|---|---|---|
| Register | `POST /api/v1/auth/register`; `AuthenticationService.register` | Implemented; creates status `registered` | Activation is a separate service method with no public activation route; a registered account is not automatically active |
| Login | `POST /api/v1/auth/sign-in` | Implemented; password, status, lockout, optional MFA challenge | Session response has no roles/permissions |
| Logout | `POST /api/v1/auth/sign-out` | Implemented; revokes own session | Matches |
| Refresh | `POST /api/v1/auth/refresh` | Implemented rotation/session service | Frontend refresh works; roles are resolved from RBAC store during Policy evaluation, not “picked up only on re-login” |
| Session probe | `GET /api/v1/auth/session` | Implemented | Returns session ID and basic user only; no effective principal/authorization revision |
| Password reset request | Public token challenge route | Implemented | Delivery provider is not integrated; challenge value is returned through API flow |
| Password reset confirm | Public token + new password | Implemented | Sessions are invalidated by Identity behavior; UI supports flow |
| Email verification request/confirm | Authenticated request; public token confirm | Implemented | Challenge token is displayed/handled in UI; no email delivery integration |
| MFA enable | Authenticated `mfa/enable` hook | Partial | Enables challenge-hook flow; no TOTP/WebAuthn enrollment, QR/recovery codes, or provider verification |
| MFA sign-in | Sign-in accepts `mfaToken`; challenge is consumed fail-closed | Implemented challenge mechanics | UI calls it a “code,” but it is the issued challenge token |
| Devices | Identity session records contain device metadata | Backend session model partial | Security UI invents/persists device rows in local storage; no list/revoke-other-device API |
| Account activation | `AuthenticationService.activateAccount` | Service method only | No normal verification/approval route wires activation; development script is operational workaround |

## 2. Principal and authorization hand-off

`RbacPolicyEngine.resolvePrincipal(userId)` loads the user, active role assignments, role hierarchy, and permission links from the Identity store at evaluation time. This has two consequences:

1. Existing backend sessions do not need re-login to acquire newly saved role assignments.
2. The browser cannot gate routes from the current session DTO because that DTO includes only ID, email, company, status, MFA state, and optional full name.

The RC5 migration statement “re-login picks up roles” is therefore inaccurate for backend Policy and insufficient for frontend authorization.

## 3. Session and device drift

- `SecurityCenterPage` calls the real session probe only for a session hint.
- The displayed devices are read from `afh.web.security.devices` in local storage.
- “Revoke” removes a local row only; it cannot revoke an Identity session.
- The current device uses real sign-out.

RC5 documents must label device management as presentation-only except for current-session sign-out/refresh.

## 4. Email and password delivery drift

Identity generates and validates password-reset, email-verification, and MFA challenges. No mail/SMS/authenticator delivery integration is registered in this flow. The UI reads challenge values from responses for manual testing. This is functional test plumbing, not production verification delivery.

## 5. MFA drift

MFA mechanics are stronger than a pure UI stub because sign-in fails with `mfa_required` and consumes a stored challenge token. They are weaker than the RC5 role “MFA required” expectations:

- no role-based MFA policy lookup;
- no step-up check for sensitive actions;
- no authenticating-factor enrollment protocol;
- no recovery workflow;
- no device trust.

Role catalog MFA columns are therefore requirements, not implemented enforcement.

## 6. Identity readiness findings

| Finding | Effect on RC5 |
|---|---|
| Identity RBAC APIs/services and SQL store exist | RC5.1 can seed without new architecture |
| No role/permission seed exists | All handler Policy allows remain unavailable by default |
| Session DTO lacks authorization state | Blocks RC5.2 route/nav gates until an approved hand-off is defined |
| Activation not wired to normal registration | Test-user setup prerequisite |
| Device UI is local | Must not be used as security evidence |
| MFA not role-aware | Role MFA expectations cannot be signed off in RC5 without explicit scope decision |

## 7. Verdict

Core login/session/reset/challenge services are implemented. RC5 documentation overstates device management, role-aware MFA, authorization exposure to the UI, and the need for re-login after backend RBAC changes.
