/**
 * SQL adapters for Manufacturing domain repositories.
 */

import type { Clock } from "@afh/shared-kernel";
import type {
  BillOfMaterials,
  BomItem,
  BomRepository,
  Operation,
  OperationRepository,
  ProductionOrder,
  ProductionOrderLine,
  ProductionOrderRepository,
  Routing,
  RoutingRepository,
  RoutingStep,
  RoutingVersion,
  WorkCenter,
  WorkCenterRepository,
} from "@afh/manufacturing";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import { SqlDocumentRepository } from "../mapping/document-repository.js";

export function createSqlBomRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): BomRepository {
  const docs = new SqlDocumentRepository<BillOfMaterials>(
    client,
    "manufacturing.bom",
    clock,
  );
  const items = new SqlDocumentRepository<BomItem>(
    client,
    "manufacturing.bom_item",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveItem: (item) => items.save(item, `${item.bomId}:${item.versionId}`),
    listItems: (companyId, bomId, versionId) =>
      items.listByParent(companyId, `${bomId}:${versionId}`),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlProductionOrderRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ProductionOrderRepository {
  const docs = new SqlDocumentRepository<ProductionOrder>(
    client,
    "manufacturing.production_order",
    clock,
  );
  const lines = new SqlDocumentRepository<ProductionOrderLine>(
    client,
    "manufacturing.production_order_line",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveLine: (line) => lines.save(line, line.productionOrderId),
    listLines: (companyId, productionOrderId) =>
      lines.listByParent(companyId, productionOrderId),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlRoutingRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): RoutingRepository {
  const docs = new SqlDocumentRepository<Routing>(
    client,
    "manufacturing.routing",
    clock,
  );
  const versions = new SqlDocumentRepository<RoutingVersion>(
    client,
    "manufacturing.routing_version",
    clock,
  );
  const steps = new SqlDocumentRepository<RoutingStep>(
    client,
    "manufacturing.routing_step",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    saveVersion: (version) => versions.save(version, version.routingId),
    saveStep: (step) =>
      steps.save(step, `${step.routingId}:${step.versionId}`),
    listSteps: (companyId, routingId, versionId) =>
      steps.listByParent(companyId, `${routingId}:${versionId}`),
  };
}

export function createSqlWorkCenterRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): WorkCenterRepository {
  const docs = new SqlDocumentRepository<WorkCenter>(
    client,
    "manufacturing.work_center",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlOperationRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): OperationRepository {
  const docs = new SqlDocumentRepository<Operation>(
    client,
    "manufacturing.operation",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
  };
}
