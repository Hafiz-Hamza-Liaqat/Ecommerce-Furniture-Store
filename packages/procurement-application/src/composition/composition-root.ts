/**
 * Procurement application composition root.
 * Registers handlers into the Phase 5B HandlerRegistry. No HTTP/APIs.
 */

import { HandlerRegistry } from "@afh/application";
import type { OutboxStore } from "@afh/persistence";
import type { SecurityAuditService } from "@afh/identity";
import type {
  PurchaseOrderRepository,
  PurchaseRequisitionRepository,
  SupplierRepository,
} from "@afh/procurement";
import {
  createCancelPurchaseOrderHandler,
  createCreatePurchaseOrderHandler,
  createCreatePurchaseRequisitionHandler,
  createCreateSupplierHandler,
  createGetProcurementSummaryHandler,
  createGetPurchaseOrderHandler,
  createGetPurchaseRequisitionHandler,
  createGetSupplierHandler,
  createIssuePurchaseOrderHandler,
  createListPurchaseOrderHandler,
  createListPurchaseRequisitionHandler,
  createListSupplierHandler,
  createSubmitPurchaseRequisitionHandler,
  createUpdateSupplierHandler,
} from "../handlers/index.js";
import type { ProcurementHandlerDeps } from "../handlers/deps.js";

export type CreateProcurementApplicationOptions = {
  readonly suppliers: SupplierRepository;
  readonly requisitions: PurchaseRequisitionRepository;
  readonly purchaseOrders: PurchaseOrderRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type ProcurementApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: ProcurementHandlerDeps;
};

/**
 * Wires Procurement command/query handlers into a HandlerRegistry.
 * Host then passes `handlers` to `createApplicationRuntime({ handlers, ... })`.
 */
export function createProcurementApplication(
  options: CreateProcurementApplicationOptions,
): ProcurementApplication {
  const deps: ProcurementHandlerDeps = {
    suppliers: options.suppliers,
    requisitions: options.requisitions,
    purchaseOrders: options.purchaseOrders,
    outbox: options.outbox,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();

  handlers.registerCommand(createCreateSupplierHandler(deps));
  handlers.registerCommand(createUpdateSupplierHandler(deps));
  handlers.registerCommand(createCreatePurchaseRequisitionHandler(deps));
  handlers.registerCommand(createSubmitPurchaseRequisitionHandler(deps));
  handlers.registerCommand(createCreatePurchaseOrderHandler(deps));
  handlers.registerCommand(createIssuePurchaseOrderHandler(deps));
  handlers.registerCommand(createCancelPurchaseOrderHandler(deps));

  handlers.registerQuery(createGetSupplierHandler(deps));
  handlers.registerQuery(createGetPurchaseRequisitionHandler(deps));
  handlers.registerQuery(createGetPurchaseOrderHandler(deps));
  handlers.registerQuery(createGetProcurementSummaryHandler(deps));
  handlers.registerQuery(createListSupplierHandler(deps));
  handlers.registerQuery(createListPurchaseRequisitionHandler(deps));
  handlers.registerQuery(createListPurchaseOrderHandler(deps));

  return { handlers, deps };
}
