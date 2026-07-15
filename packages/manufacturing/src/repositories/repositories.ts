/**
 * Manufacturing repository interfaces only — no persistence implementations.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type { BillOfMaterials, BomItem } from "../bom/bom.js";
import type {
  ProductionOrder,
  ProductionOrderLine,
} from "../production-order/production-order.js";
import type { Routing, RoutingVersion } from "../routing/routing.js";
import type { WorkCenter } from "../work-center/work-center.js";
import type { Operation, RoutingStep } from "../operation/operation.js";

export type CompanyScopedId = {
  readonly companyId: string;
  readonly id: string;
};

export interface BomRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<BillOfMaterials | null, PlatformError>>;
  save(bom: BillOfMaterials): Promise<Result<void, PlatformError>>;
  saveItem(item: BomItem): Promise<Result<void, PlatformError>>;
  listItems(
    companyId: string,
    bomId: string,
    versionId: string,
  ): Promise<Result<readonly BomItem[], PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<BillOfMaterials>, PlatformError>>;
}

export interface ProductionOrderRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<ProductionOrder | null, PlatformError>>;
  save(order: ProductionOrder): Promise<Result<void, PlatformError>>;
  saveLine(line: ProductionOrderLine): Promise<Result<void, PlatformError>>;
  listLines(
    companyId: string,
    productionOrderId: string,
  ): Promise<Result<readonly ProductionOrderLine[], PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<ProductionOrder>, PlatformError>>;
}

export interface RoutingRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Routing | null, PlatformError>>;
  save(routing: Routing): Promise<Result<void, PlatformError>>;
  saveVersion(version: RoutingVersion): Promise<Result<void, PlatformError>>;
  saveStep(step: RoutingStep): Promise<Result<void, PlatformError>>;
  listSteps(
    companyId: string,
    routingId: string,
    versionId: string,
  ): Promise<Result<readonly RoutingStep[], PlatformError>>;
}

export interface WorkCenterRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<WorkCenter | null, PlatformError>>;
  save(workCenter: WorkCenter): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<WorkCenter>, PlatformError>>;
}

export interface OperationRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Operation | null, PlatformError>>;
  save(operation: Operation): Promise<Result<void, PlatformError>>;
}
