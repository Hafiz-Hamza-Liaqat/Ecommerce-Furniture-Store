/**
 * Enterprise dependency composition — wires infrastructure, identity,
 * platform engines, application runtime, and all Phase 6A–6G apps.
 * No business logic.
 */

import {
  HandlerRegistry,
  createApplicationRuntime,
  type ApplicationRuntime,
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
  readonly damAssets: AssetRepository;
};

export type CreateEnterpriseCompositionOptions = {
  readonly repositories: EnterpriseModuleRepositories;
  readonly infrastructure?: CreateInfrastructureRuntimeOptions;
  readonly identity?: CreateIdentityFoundationOptions;
  readonly platform?: Omit<CreatePlatformEnginesOptions, "identity" | "persistence" | "clock">;
};

export type EnterpriseComposition = {
  readonly infrastructure: InfrastructureRuntime;
  readonly identity: IdentityFoundation;
  readonly platform: PlatformEngines;
  readonly runtime: ApplicationRuntime;
  readonly repositories: EnterpriseModuleRepositories;
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
  const identity = createIdentityFoundation({
    ...(options.identity ?? {}),
    clock: options.identity?.clock ?? infrastructure.clock,
    persistence: infrastructure.persistence,
  });
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
    dispose() {
      runtime.dispose();
      infrastructure.dispose();
    },
  };
}
