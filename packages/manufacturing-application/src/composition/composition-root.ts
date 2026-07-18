/**
 * Manufacturing application composition root.
 */

import { HandlerRegistry } from "@afh/application";
import type { ProductionOrderRepository } from "@afh/manufacturing";
import type { SecurityAuditService } from "@afh/identity";
import {
  createCreateProductionOrderHandler,
  createGetProductionOrderHandler,
  createListProductionOrderHandler,
} from "../handlers/production-order-handlers.js";
import type { ManufacturingHandlerDeps } from "../handlers/deps.js";

export type CreateManufacturingApplicationOptions = {
  readonly productionOrders: ProductionOrderRepository;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type ManufacturingApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: ManufacturingHandlerDeps;
};

export function createManufacturingApplication(
  options: CreateManufacturingApplicationOptions,
): ManufacturingApplication {
  const deps: ManufacturingHandlerDeps = {
    productionOrders: options.productionOrders,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();
  handlers.registerCommand(createCreateProductionOrderHandler(deps));
  handlers.registerQuery(createGetProductionOrderHandler(deps));
  handlers.registerQuery(createListProductionOrderHandler(deps));

  return { handlers, deps };
}
