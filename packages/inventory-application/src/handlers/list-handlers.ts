/**
 * RC7.2c — Inventory List* query handlers.
 * Authorization totals and paging via buildAuthorizedListPage (ADR D56).
 * Inventory remains owner of aggregates/repositories; this file only adds List*.
 */

import type { QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { Page } from "@afh/shared-kernel";
import type {
  InventoryItem,
  StockPosition,
  Warehouse,
} from "@afh/inventory";
import {
  InventoryPolicyActions,
  InventoryQueryTypes,
} from "../constants.js";
import type {
  ListInventoryItemPayload,
  ListStockPayload,
  ListWarehousePayload,
} from "../queries/queries.js";
import {
  listInventoryItemQueryValidator,
  listStockQueryValidator,
  listWarehouseQueryValidator,
} from "../validators/validators.js";
import type { InventoryHandlerDeps } from "./deps.js";
import { companyResource, requireCompanyId } from "../support/support.js";
import { createInventoryListCandidateFetcher } from "./list-support.js";

export {
  INVENTORY_ITEM_FILTER_FIELDS,
  INVENTORY_ITEM_SORT_FIELDS,
  WAREHOUSE_FILTER_FIELDS,
  WAREHOUSE_SORT_FIELDS,
  STOCK_FILTER_FIELDS,
  STOCK_SORT_FIELDS,
} from "../list-fields.js";

export function createListInventoryItemHandler(
  deps: InventoryHandlerDeps,
): QueryHandler<ListInventoryItemPayload, Page<InventoryItem>> {
  return {
    queryType: InventoryQueryTypes.ListInventoryItem,
    authorize(query, ctx) {
      return companyResource(
        "inventory_item",
        InventoryPolicyActions.ItemRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, InventoryPolicyActions.ItemRead),
      );
    },
    validate() {
      return listInventoryItemQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<InventoryItem>({
        ctx,
        action: InventoryPolicyActions.ItemRead,
        resourceType: "inventory_item",
        request,
        toScope: (i) => ({
          id: i.id,
          companyId: i.companyId,
        }),
        fetchCandidates: createInventoryListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.items.listByCompany(companyId, page),
          request,
          searchFields: ["name", "code"],
        }),
      });
    },
  };
}

export function createListWarehouseHandler(
  deps: InventoryHandlerDeps,
): QueryHandler<ListWarehousePayload, Page<Warehouse>> {
  return {
    queryType: InventoryQueryTypes.ListWarehouse,
    authorize(query, ctx) {
      return companyResource(
        "warehouse",
        InventoryPolicyActions.WarehouseRead,
        query.payload.companyId,
        null,
        principalListScope(
          ctx.principal,
          InventoryPolicyActions.WarehouseRead,
        ),
      );
    },
    validate() {
      return listWarehouseQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Warehouse>({
        ctx,
        action: InventoryPolicyActions.WarehouseRead,
        resourceType: "warehouse",
        request,
        toScope: (w) => ({
          id: w.id,
          companyId: w.companyId,
          branchId: w.branchId,
        }),
        fetchCandidates: createInventoryListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.warehouses.listByCompany(companyId, page),
          request,
          searchFields: ["name", "code"],
        }),
      });
    },
  };
}

export function createListStockHandler(
  deps: InventoryHandlerDeps,
): QueryHandler<ListStockPayload, Page<StockPosition>> {
  return {
    queryType: InventoryQueryTypes.ListStock,
    authorize(query, ctx) {
      return companyResource(
        "stock",
        InventoryPolicyActions.StockRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, InventoryPolicyActions.StockRead),
      );
    },
    validate() {
      return listStockQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      const branchByWarehouse = new Map<string, string | null>();
      const baseFetcher = createInventoryListCandidateFetcher({
        listByCompany: (companyId, page) =>
          deps.stock.listByCompany(companyId, page),
        request,
        searchFields: ["inventoryItemId", "warehouseId"],
      });
      return buildAuthorizedListPage<StockPosition>({
        ctx,
        action: InventoryPolicyActions.StockRead,
        resourceType: "stock",
        request,
        toScope: (s) => ({
          id: s.id,
          companyId: s.companyId,
          branchId: branchByWarehouse.get(s.warehouseId) ?? null,
        }),
        fetchCandidates: async (args) => {
          const result = await baseFetcher(args);
          if (!result.ok) return result;
          for (const s of result.value) {
            if (!branchByWarehouse.has(s.warehouseId)) {
              const wh = await deps.warehouses.findById({
                companyId: scope.value,
                id: s.warehouseId,
              });
              branchByWarehouse.set(
                s.warehouseId,
                wh.ok && wh.value ? wh.value.branchId : null,
              );
            }
          }
          return result;
        },
      });
    },
  };
}
