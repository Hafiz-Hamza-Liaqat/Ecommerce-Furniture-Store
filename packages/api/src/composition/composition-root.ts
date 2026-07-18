/**
 * Enterprise dependency composition — wires infrastructure, identity,
 * platform engines, application runtime, and all Phase 6A–6G apps.
 * No business logic.
 */

import {
  HandlerRegistry,
  createApplicationRuntime,
  type ApplicationRuntime,
  type EntityAttachmentLinkRepository,
  type EntityNoteRepository,
} from "@afh/application";
import {
  createInfrastructureRuntime,
  type CreateInfrastructureRuntimeOptions,
  type InfrastructureRuntime,
} from "@afh/infrastructure";
import {
  createIdentityFoundation,
  type CreateIdentityFoundationOptions,
  type IdentityFoundation,
} from "@afh/identity";
import {
  createIdentitySecurityProviders,
  type CreateIdentitySecurityProvidersOptions,
  type IdentitySecurityProviders,
} from "@afh/identity-providers";
import {
  createPlatformEngines,
  type CreatePlatformEnginesOptions,
  type PlatformEngines,
} from "@afh/platform";
import {
  createSalesApplication,
  type CreateSalesApplicationOptions,
} from "@afh/sales-application";
import {
  createProcurementApplication,
  type CreateProcurementApplicationOptions,
} from "@afh/procurement-application";
import {
  createInventoryApplication,
  type CreateInventoryApplicationOptions,
} from "@afh/inventory-application";
import {
  createFinanceApplication,
  type CreateFinanceApplicationOptions,
} from "@afh/finance-application";
import {
  createProjectApplication,
  type CreateProjectApplicationOptions,
} from "@afh/projects-application";
import {
  createServiceApplication,
  type CreateServiceApplicationOptions,
} from "@afh/service-application";
import {
  createCrmApplication,
  type CreateCrmApplicationOptions,
} from "@afh/crm-application";
import {
  createWorkflowApplication,
} from "@afh/workflow-application";
import type { AssetRepository } from "@afh/dam";

export type EnterpriseModuleRepositories = {
  readonly sales: Omit<
    CreateSalesApplicationOptions,
    "outbox" | "audit" | "handlers"
  >;
  readonly procurement: Omit<
    CreateProcurementApplicationOptions,
    "outbox" | "audit" | "handlers"
  >;
  readonly inventory: Omit<
    CreateInventoryApplicationOptions,
    "outbox" | "audit" | "handlers"
  >;
  readonly finance: Omit<
    CreateFinanceApplicationOptions,
    "outbox" | "audit" | "handlers"
  >;
  readonly projects: Omit<
    CreateProjectApplicationOptions,
    "outbox" | "audit" | "handlers"
  >;
  readonly service: Omit<
    CreateServiceApplicationOptions,
    "outbox" | "audit" | "handlers"
  >;
  readonly crm: Omit<
    CreateCrmApplicationOptions,
    "outbox" | "audit" | "handlers"
  >;
  readonly collaboration: {
    readonly notes: EntityNoteRepository;
    readonly attachmentLinks: EntityAttachmentLinkRepository;
  };
  readonly damAssets: AssetRepository;
};

export type CreateEnterpriseCompositionOptions = {
  readonly repositories: EnterpriseModuleRepositories;
  readonly infrastructure?: CreateInfrastructureRuntimeOptions;
  readonly identity?: CreateIdentityFoundationOptions;
  readonly platform?: Omit<CreatePlatformEnginesOptions, "identity" | "persistence" | "clock">;
  /**
   * When set, wires Phase 7C production security providers (password/JWT/MFA/…).
   * Authentication flows and Policy authorization remain unchanged.
   */
  readonly security?: Omit<
    CreateIdentitySecurityProvidersOptions,
    "secrets" | "metrics" | "clock" | "identity"
  > & {
    readonly enabled: true;
  };
};

export type EnterpriseComposition = {
  readonly infrastructure: InfrastructureRuntime;
  readonly identity: IdentityFoundation;
  readonly platform: PlatformEngines;
  readonly runtime: ApplicationRuntime;
  readonly repositories: EnterpriseModuleRepositories;
  /** Present when `security.enabled` was requested. */
  readonly security: IdentitySecurityProviders | null;
  dispose(): void;
};

/**
 * Wires the full enterprise stack for API hosting.
 * Repositories remain injected (interfaces only — no SQL here).
 */
export function createEnterpriseComposition(
  options: CreateEnterpriseCompositionOptions,
): EnterpriseComposition {
  const infrastructure = createInfrastructureRuntime(
    options.infrastructure ?? {},
  );

  let identity: IdentityFoundation;
  let security: IdentitySecurityProviders | null = null;

  if (options.security?.enabled) {
    const { enabled: _enabled, ...securityOpts } = options.security;
    void _enabled;
    security = createIdentitySecurityProviders({
      ...securityOpts,
      secrets: infrastructure.secrets,
      metrics: infrastructure.metrics,
      clock: options.identity?.clock ?? infrastructure.clock,
      identity: {
        ...(options.identity ?? {}),
        persistence: infrastructure.persistence,
      },
    });
    identity = security.identity;
    for (const probe of security.healthProbes) {
      infrastructure.health.register(probe);
    }
  } else {
    identity = createIdentityFoundation({
      ...(options.identity ?? {}),
      clock: options.identity?.clock ?? infrastructure.clock,
      persistence: infrastructure.persistence,
      metrics: infrastructure.metrics,
    });
  }

  const platform = createPlatformEngines({
    identity,
    persistence: infrastructure.persistence,
    clock: infrastructure.clock,
    ...(options.platform ?? {}),
  });

  const handlers = new HandlerRegistry();
  const outbox = infrastructure.persistence.outboxStore;
  const audit = identity.audit;
  const repos = options.repositories;

  createSalesApplication({
    ...repos.sales,
    outbox,
    audit,
    handlers,
  });
  createProcurementApplication({
    ...repos.procurement,
    outbox,
    audit,
    handlers,
  });
  createInventoryApplication({
    ...repos.inventory,
    notes: repos.collaboration.notes,
    attachmentLinks: repos.collaboration.attachmentLinks,
    outbox,
    audit,
    handlers,
  });
  createFinanceApplication({
    ...repos.finance,
    outbox,
    audit,
    handlers,
  });
  createProjectApplication({
    ...repos.projects,
    outbox,
    audit,
    handlers,
  });
  createServiceApplication({
    ...repos.service,
    outbox,
    audit,
    handlers,
  });
  createCrmApplication({
    ...repos.crm,
    outbox,
    audit,
    handlers,
  });
  createWorkflowApplication({ handlers });

  const runtime = createApplicationRuntime({
    infrastructure,
    policyEngine: platform.policyEngine,
    workflow: platform.workflow,
    approval: platform.approval,
    rules: platform.rules,
    handlers,
    resolvePrincipal: async (userId) =>
      identity.policyEngine.buildPrincipal(userId),
  });

  return {
    infrastructure,
    identity,
    platform,
    runtime,
    repositories: repos,
    security,
    dispose() {
      runtime.dispose();
      infrastructure.dispose();
    },
  };
}
