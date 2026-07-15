/**
 * Identity module composition root — no HTTP controllers.
 */

import {
  SystemUtcClock,
  type Clock,
} from "@afh/shared-kernel";
import type { PersistenceFoundation } from "@afh/persistence";
import {
  DEFAULT_SECURITY_CONFIG,
  StaticSecurityConfigProvider,
  type SecurityConfig,
  type SecurityConfigProvider,
} from "../configuration/security-config.js";
import {
  InMemorySecurityAuditStore,
  SecurityAuditService,
  type SecurityAuditStore,
} from "../audit/security-audit.js";
import {
  Sha256PasswordHasher,
  type PasswordHasher,
} from "../credentials/credentials.js";
import {
  InMemoryIdentityStore,
  type IdentityStore,
} from "../stores/identity-store.js";
import { SessionService } from "../session/session-service.js";
import { AuthenticationService } from "../authentication/authentication-service.js";
import { RbacService } from "../rbac/rbac-service.js";
import { RbacPolicyEngine } from "../policy/policy-engine.js";
import { OrganizationService } from "../organization/organization-service.js";
import { ServiceAccountService } from "../service-accounts/service-account-service.js";
import { IdentityProfileService } from "../profiles/identity-profile-service.js";

export type IdentityFoundation = {
  readonly config: SecurityConfig;
  readonly clock: Clock;
  readonly store: IdentityStore;
  readonly passwordHasher: PasswordHasher;
  readonly audit: SecurityAuditService;
  readonly sessions: SessionService;
  readonly authentication: AuthenticationService;
  readonly rbac: RbacService;
  readonly policyEngine: RbacPolicyEngine;
  readonly organizations: OrganizationService;
  readonly serviceAccounts: ServiceAccountService;
  readonly profiles: IdentityProfileService;
};

export type CreateIdentityFoundationOptions = {
  readonly securityConfig?: SecurityConfig;
  readonly clock?: Clock;
  readonly passwordHasher?: PasswordHasher;
  readonly store?: IdentityStore;
  /** Inject durable audit store (e.g. Phase 7B SQL). Defaults to in-memory. */
  readonly auditStore?: SecurityAuditStore;
  /** Optional persistence handle reserved for future transactional identity writes */
  readonly persistence?: PersistenceFoundation;
};

export function createIdentityFoundation(
  options: CreateIdentityFoundationOptions = {},
): IdentityFoundation {
  const config = options.securityConfig ?? DEFAULT_SECURITY_CONFIG;
  const configProvider: SecurityConfigProvider =
    new StaticSecurityConfigProvider(config);
  const clock = options.clock ?? new SystemUtcClock();
  const store = options.store ?? new InMemoryIdentityStore();
  const passwordHasher = options.passwordHasher ?? new Sha256PasswordHasher();
  const auditStore = options.auditStore ?? new InMemorySecurityAuditStore();
  const audit = new SecurityAuditService(auditStore, clock);
  const sessions = new SessionService(store, configProvider, clock, audit);
  const authentication = new AuthenticationService(
    store,
    passwordHasher,
    sessions,
    configProvider,
    clock,
    audit,
  );
  const rbac = new RbacService(store, clock, audit);
  const policyEngine = new RbacPolicyEngine(store, clock, audit);
  const organizations = new OrganizationService(store, clock, audit);
  const serviceAccounts = new ServiceAccountService(
    store,
    passwordHasher,
    clock,
    audit,
  );
  const profiles = new IdentityProfileService(store, clock);

  // Reserve persistence linkage without coupling identity stores to SQL yet.
  void options.persistence;

  return {
    config,
    clock,
    store,
    passwordHasher,
    audit,
    sessions,
    authentication,
    rbac,
    policyEngine,
    organizations,
    serviceAccounts,
    profiles,
  };
}
