import type { CommandHandler, FetchListCandidates, QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { ProductionOrder } from "@afh/manufacturing";
import type { Page } from "@afh/shared-kernel";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import {
  ManufacturingCommandTypes,
  ManufacturingPolicyActions,
  ManufacturingQueryTypes,
} from "../constants.js";
import type { CreateProductionOrderPayload } from "../commands/commands.js";
import type {
  GetProductionOrderPayload,
  GetProductionOrderResult,
  ListProductionOrderPayload,
} from "../queries/queries.js";
import {
  createProductionOrderCommandValidator,
  getProductionOrderQueryValidator,
  listProductionOrderQueryValidator,
} from "../validators/validators.js";
import type { ManufacturingHandlerDeps } from "./deps.js";
import {
  companyResource,
  loadRecordForAuthorization,
  newEntityId,
  recordManufacturingAudit,
  requireCompanyId,
} from "../support/support.js";

export type CreateProductionOrderResult = {
  readonly productionOrderId: string;
};

export function createCreateProductionOrderHandler(
  deps: ManufacturingHandlerDeps,
): CommandHandler<CreateProductionOrderPayload, CreateProductionOrderResult> {
  return {
    commandType: ManufacturingCommandTypes.CreateProductionOrder,
    authorize(command) {
      return companyResource(
        "production_order",
        ManufacturingPolicyActions.ProductionOrderCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createProductionOrderCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      const id = newEntityId();
      const now = ctx.clock.now().toISOString();

      const order: ProductionOrder = {
        id,
        companyId: scope.value,
        number: p.number,
        status: "draft",
        bomId: null,
        routingId: null,
        finishedInventoryItemId: p.finishedInventoryItemId ?? null,
        salesOrderId: p.salesOrderId ?? null,
        salesOrderLineId: p.salesOrderLineId ?? null,
        projectId: p.projectId ?? null,
        warehouseId: p.warehouseId ?? null,
        quantity: p.quantity ?? null,
        unitCode: p.unitCode ?? null,
        plannedStartAt: p.plannedStartAt ?? null,
        plannedEndAt: p.plannedEndAt ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.productionOrders.save(order);
      if (!saved.ok) return saved;

      await recordManufacturingAudit(deps.audit, ctx, {
        action: ManufacturingPolicyActions.ProductionOrderCreate,
        entityType: "production_order",
        entityId: id,
        outcome: "success",
        details: { number: p.number },
      });

      return ok({ productionOrderId: id });
    },
  };
}

export function createGetProductionOrderHandler(
  deps: ManufacturingHandlerDeps,
): QueryHandler<GetProductionOrderPayload, GetProductionOrderResult> {
  return {
    queryType: ManufacturingQueryTypes.GetProductionOrder,
    async authorize(query) {
      const p = query.payload;
      await loadRecordForAuthorization(() =>
        deps.productionOrders.findById({
          companyId: p.companyId,
          id: p.productionOrderId,
        }),
      );
      return companyResource(
        "production_order",
        ManufacturingPolicyActions.ProductionOrderRead,
        p.companyId,
        p.productionOrderId,
      );
    },
    validate() {
      return getProductionOrderQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const found = await deps.productionOrders.findById({
        companyId: scope.value,
        id: query.payload.productionOrderId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Production order not found", {
            code: "production_order_not_found",
          }),
        );
      }

      return ok({ productionOrder: found.value });
    },
  };
}

function createProductionOrderListCandidateFetcher(
  listByCompany: ManufacturingHandlerDeps["productionOrders"]["listByCompany"],
): FetchListCandidates<ProductionOrder> {
  let prepared: ProductionOrder[] | null = null;

  return async ({ companyId, offset, limit }) => {
    if (prepared === null) {
      const all: ProductionOrder[] = [];
      let page = 1;
      for (;;) {
        const batch = await listByCompany(companyId, { page, pageSize: 100 });
        if (!batch.ok) {
          return batch;
        }
        all.push(...batch.value.items);
        if (!batch.value.hasMore) {
          break;
        }
        page += 1;
      }
      prepared = all;
    }

    return ok(prepared.slice(offset, offset + limit));
  };
}

export function createListProductionOrderHandler(
  deps: ManufacturingHandlerDeps,
): QueryHandler<ListProductionOrderPayload, Page<ProductionOrder>> {
  return {
    queryType: ManufacturingQueryTypes.ListProductionOrder,
    authorize(query, ctx) {
      return companyResource(
        "production_order",
        ManufacturingPolicyActions.ProductionOrderRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, ManufacturingPolicyActions.ProductionOrderRead),
      );
    },
    validate() {
      return listProductionOrderQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<ProductionOrder>({
        ctx,
        action: ManufacturingPolicyActions.ProductionOrderRead,
        resourceType: "production_order",
        request,
        toScope: (order) => ({
          id: order.id,
          companyId: order.companyId,
        }),
        fetchCandidates: createProductionOrderListCandidateFetcher((companyId, page) =>
          deps.productionOrders.listByCompany(companyId, page),
        ),
      });
    },
  };
}
