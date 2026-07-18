/**
 * DAM application composition root.
 */

import { HandlerRegistry } from "@afh/application";
import type { AssetRepository, AssetVersionRepository, ObjectStore } from "@afh/dam";
import type { SecurityAuditService } from "@afh/identity";
import {
  createCreateAssetHandler,
  createGetAssetHandler,
  createListAssetHandler,
} from "../handlers/asset-handlers.js";
import type { DamHandlerDeps } from "../handlers/deps.js";

export type CreateDamApplicationOptions = {
  readonly assets: AssetRepository;
  readonly versions: AssetVersionRepository;
  readonly objectStore: ObjectStore;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type DamApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: DamHandlerDeps;
};

export function createDamApplication(
  options: CreateDamApplicationOptions,
): DamApplication {
  const deps: DamHandlerDeps = {
    assets: options.assets,
    versions: options.versions,
    objectStore: options.objectStore,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();
  handlers.registerCommand(createCreateAssetHandler(deps));
  handlers.registerQuery(createGetAssetHandler(deps));
  handlers.registerQuery(createListAssetHandler(deps));

  return { handlers, deps };
}
