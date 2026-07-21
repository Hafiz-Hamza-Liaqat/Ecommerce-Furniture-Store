/**
 * RC10.7 — Inventory analytics (local derive; imports BI widgets in UI only).
 * Does not modify RC10.6 analytics engine.
 */

import { availableStock, listItems, listMovements, listProcurements, listProductionJobs, listSuppliers } from "./service";
import type { NamedCount } from "../analytics/types";
import { PROCUREMENT_STAGE_LABELS, PRODUCTION_STAGE_LABELS } from "./types";

export type OpsAnalytics = {
  readonly lowStock: NamedCount[];
  readonly valuationPkr: number;
  readonly fastMoving: NamedCount[];
  readonly slowMoving: NamedCount[];
  readonly shortages: NamedCount[];
  readonly supplierLoad: NamedCount[];
  readonly procurementByStage: NamedCount[];
  readonly productionBacklog: number;
  readonly productionByStage: NamedCount[];
};

export function computeOpsAnalytics(): OpsAnalytics {
  const items = listItems();
  const movements = listMovements();
  const jobs = listProductionJobs();
  const procurements = listProcurements();
  const suppliers = listSuppliers();

  const lowStock = items
    .filter((i) => availableStock(i) <= i.minStock)
    .map((i) => ({ name: `${i.sku} ${i.name}`, value: availableStock(i) }))
    .slice(0, 12);

  const valuationPkr = items.reduce(
    (s, i) => s + i.stockOnHand * i.unitCostPkr,
    0,
  );

  const moveCount = new Map<string, number>();
  for (const m of movements) {
    if (m.type === "production_consumption" || m.type === "purchase_received") {
      moveCount.set(m.itemId, (moveCount.get(m.itemId) ?? 0) + Math.abs(m.qtyDelta));
    }
  }
  const ranked = [...moveCount.entries()].sort((a, b) => b[1] - a[1]);
  const fastMoving: NamedCount[] = ranked.slice(0, 8).map(([id, value]) => {
    const item = items.find((i) => i.id === id);
    return { name: item ? `${item.sku}` : id, value };
  });
  const slowMoving: NamedCount[] = items
    .filter((i) => !moveCount.has(i.id) && i.stockOnHand > 0)
    .slice(0, 8)
    .map((i) => ({ name: i.sku, value: i.stockOnHand }));

  const shortages: NamedCount[] = [];
  for (const job of jobs) {
    for (const line of job.allocations) {
      if (line.shortage > 0) {
        const item = items.find((i) => i.id === line.itemId);
        shortages.push({
          name: `${job.label}: ${item?.sku ?? line.itemId}`,
          value: line.shortage,
        });
      }
    }
  }

  const supplierLoad: NamedCount[] = suppliers.map((s) => ({
    name: s.company,
    value: procurements.filter((p) => p.supplierId === s.id && p.stage !== "closed").length,
  }));

  const procurementByStage: NamedCount[] = Object.entries(PROCUREMENT_STAGE_LABELS).map(
    ([stage, name]) => ({
      name,
      value: procurements.filter((p) => p.stage === stage).length,
    }),
  );

  const productionByStage: NamedCount[] = Object.entries(PRODUCTION_STAGE_LABELS).map(
    ([stage, name]) => ({
      name,
      value: jobs.filter((j) => j.stage === stage).length,
    }),
  );

  const productionBacklog = jobs.filter(
    (j) =>
      j.stage === "queued" ||
      j.stage === "material_ready" ||
      j.stage === "in_production" ||
      j.pendingProcurement,
  ).length;

  return {
    lowStock,
    valuationPkr: Math.round(valuationPkr),
    fastMoving,
    slowMoving,
    shortages: shortages.slice(0, 12),
    supplierLoad,
    procurementByStage,
    productionBacklog,
    productionByStage,
  };
}

export type { NamedCount };
