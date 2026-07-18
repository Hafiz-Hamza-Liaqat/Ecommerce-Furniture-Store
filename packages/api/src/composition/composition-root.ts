/**
 * Enterprise dependency composition — wires infrastructure, identity,
 * platform engines, application runtime, and all Phase 6A–6G + RC7 apps.
 * No business logic.
 */

import {
  HandlerRegistry,
  createApplicationRuntime,
  registerBulkIoHandlers,
  registerCollaborationHandlers,
  registerJobHandlers,
  type ApplicationRuntime,
  type AssetExistenceChecker,
  type BackgroundJobRepository,
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
import {
  createDamApplication,
} from "@afh/dam-application";
import {
  createManufacturingApplication,
  type CreateManufacturingApplicationOptions,
} from "@afh/manufacturing-application";
import {
  createHrApplication,
  type CreateHrApplicationOptions,
} from "@afh/hr-application";
import {
  createCmsApplication,
  type CreateCmsApplicationOptions,
} from "@afh/cms-application";
import {
  createNotificationsApplication,
  type CreateNotificationsApplicationOptions,
} from "@afh/notifications-application";
import {
  createReportingApplication,
  type CreateReportingApplicationOptions,
} from "@afh/reporting-application";
import {
  createSearchApplication,
  type CreateSearchApplicationOptions,
} from "@afh/search-application";
import type { AssetRepository, AssetVersionRepository, ObjectStore } from "@afh/dam";
import { ok } from "@afh/shared-kernel";
import { V1_COLLABORATION_BINDINGS } from "../collaboration/v1-bindings.js";
import { V1_BULK_IO_BINDINGS } from "../bulk-io/v1-bindings.js";
import {
  createCrmLeadBulkAdapter,
  createInventoryItemBulkAdapter,
  createSupplierBulkAdapter,
} from "../bulk-io/v1-adapters.js";

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
  readonly damVersions: AssetVersionRepository;
  readonly damObjectStore: ObjectStore;
  readonly backgroundJobs: BackgroundJobRepository;
  readonly manufacturing: Omit<
    CreateManufacturingApplicationOptions,
    "audit" | "handlers"
  >;
  readonly hr: Omit<CreateHrApplicationOptions, "audit" | "handlers">;
  readonly cms: Omit<CreateCmsApplicationOptions, "audit" | "handlers">;
  readonly notifications: Omit<
    CreateNotificationsApplicationOptions,
    "audit" | "handlers"
  >;
  readonly reporting: Omit<
    CreateReportingApplicationOptions,
    "audit" | "handlers"
  >;
  readonly search: Omit<CreateSearchApplicationOptions, "audit" | "handlers">;
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
  createDamApplication({
    assets: repos.damAssets,
    versions: repos.damVersions,
    objectStore: repos.damObjectStore,
    audit,
    handlers,
  });
  createManufacturingApplication({
    ...repos.manufacturing,
    audit,
    handlers,
  });
  createHrApplication({
    ...repos.hr,
    audit,
    handlers,
  });
  createCmsApplication({
    ...repos.cms,
    audit,
    handlers,
  });
  createNotificationsApplication({
    ...repos.notifications,
    audit,
    handlers,
  });
  createReportingApplication({
    ...repos.reporting,
    audit,
    handlers,
  });
  createSearchApplication({
    ...repos.search,
    audit,
    handlers,
  });
  createWorkflowApplication({ handlers });

  registerCollaborationHandlers(handlers, {
    notes: repos.collaboration.notes,
    attachmentLinks: repos.collaboration.attachmentLinks,
    assets: toAssetExistenceChecker(repos.damAssets),
    audit,
    bindings: V1_COLLABORATION_BINDINGS,
  });

  registerBulkIoHandlers(handlers, {
    bindings: V1_BULK_IO_BINDINGS,
    adapters: {
      "inventory.item": createInventoryItemBulkAdapter(repos.inventory.items),
      "crm.lead": createCrmLeadBulkAdapter(repos.crm.leads),
      "procurement.supplier": createSupplierBulkAdapter(repos.procurement.suppliers),
    },
    audit,
  });

  registerJobHandlers(handlers, {
    jobs: repos.backgroundJobs,
    audit,
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
    security,
    dispose() {
      runtime.dispose();
      infrastructure.dispose();
    },
  };
}

function toAssetExistenceChecker(
  assets: AssetRepository,
): AssetExistenceChecker {
  return {
    findById: async (key) => {
      const result = await assets.findById(key);
      if (!result.ok) return result;
      if (!result.value) return ok(null);
      return ok({ id: result.value.id, companyId: result.value.companyId });
    },
  };
}
