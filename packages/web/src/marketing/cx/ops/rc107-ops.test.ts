/**
 * RC10.7 — Ops unit tests (inventory invariants, allocation, procurement, edits).
 */

import { beforeEach, describe, expect, it } from "vitest";
import { clearOpsWorkspace } from "./store";
import {
  advanceProduction,
  adjustStock,
  availableStock,
  createBom,
  createItem,
  createProcurement,
  createProductionJob,
  createSupplier,
  listMovements,
  receiveProcurement,
  advanceProcurement,
  listItems,
  getItem,
  recordReturn,
  releaseJobMaterials,
  searchOps,
  updateBom,
  updateItem,
  updateSupplier,
} from "./service";
import { computeOpsAnalytics } from "./analytics";
import { loadSalesWorkspace, saveSalesWorkspace } from "../sales/store";

beforeEach(() => {
  localStorage.clear();
  clearOpsWorkspace();
});

describe("RC10.7 ops", () => {
  it("creates inventory and never allows negative stock", () => {
    const wood = createItem({
      sku: "WOOD-01",
      name: "Oak board",
      category: "wood",
      stockOnHand: 5,
      minStock: 2,
      unitCostPkr: 1000,
    });
    expect(availableStock(wood)).toBe(5);
    expect(() => adjustStock(wood.id, -10, "bad")).toThrow(/negative|invariant/i);
    expect(getItem(wood.id)?.stockOnHand).toBe(5);
  });

  it("rejects duplicate SKUs and supports edit", () => {
    createItem({ sku: "DUP-1", name: "A", category: "metal", stockOnHand: 1 });
    expect(() =>
      createItem({ sku: "dup-1", name: "B", category: "metal", stockOnHand: 1 }),
    ).toThrow(/duplicate/i);
    const item = listItems()[0]!;
    const edited = updateItem(item.id, { name: "Edited", minStock: 4 });
    expect(edited?.name).toBe("Edited");
    expect(edited?.minStock).toBe(4);
  });

  it("records returns and adjustments in movement history", () => {
    const item = createItem({ sku: "RET-1", name: "Panel", category: "wood", stockOnHand: 2 });
    adjustStock(item.id, 3, "found stock");
    recordReturn(item.id, 1, "customer return");
    expect(getItem(item.id)?.stockOnHand).toBe(6);
    const types = listMovements().map((m) => m.type);
    expect(types).toContain("manual_adjustment");
    expect(types).toContain("return");
  });

  it("allocates materials and records shortages without negative stock", () => {
    const product = createItem({
      sku: "SOFA-1",
      name: "Sofa",
      category: "furniture_product",
      stockOnHand: 0,
    });
    const fabric = createItem({
      sku: "FAB-1",
      name: "Fabric",
      category: "fabric",
      stockOnHand: 3,
      minStock: 1,
    });
    const bom = createBom({
      productItemId: product.id,
      label: "Sofa BOM",
      lines: [{ itemId: fabric.id, qtyPerUnit: 2 }],
    });
    const job = createProductionJob({ label: "SOFA-JOB", bomId: bom.id, qty: 3 });
    expect(job.allocations[0]?.allocated).toBe(3);
    expect(job.allocations[0]?.shortage).toBe(3);
    expect(job.pendingProcurement).toBe(true);
    expect(job.stage).toBe("queued");
    const after = getItem(fabric.id)!;
    expect(after.reserved).toBe(3);
    expect(availableStock(after)).toBe(0);
    expect(after.stockOnHand).toBe(3);
  });

  it("receives procurement through stages and increases on-hand", () => {
    const supplier = createSupplier({ company: "Timber Co" });
    const wood = createItem({
      sku: "WOOD-02",
      name: "Walnut",
      category: "wood",
      stockOnHand: 1,
      supplierId: supplier.id,
    });
    const po = createProcurement({
      supplierId: supplier.id,
      lines: [{ itemId: wood.id, qtyOrdered: 10 }],
    });
    expect(po.stage).toBe("draft");
    advanceProcurement(po.id, "requested");
    advanceProcurement(po.id, "approved");
    advanceProcurement(po.id, "ordered");
    const received = receiveProcurement(po.id, [{ itemId: wood.id, qty: 10 }]);
    expect(received?.stage).toBe("received");
    advanceProcurement(po.id, "closed");
    expect(getItem(wood.id)?.stockOnHand).toBe(11);
    expect(listMovements().some((m) => m.type === "purchase_received")).toBe(true);
  });

  it("consumes reserved stock when production starts and can release before", () => {
    createItem({ sku: "P", name: "Product", category: "furniture_product", stockOnHand: 0 });
    const hw = createItem({
      sku: "HW-1",
      name: "Screw",
      category: "hardware",
      stockOnHand: 10,
    });
    const product = listItems().find((i) => i.sku === "P")!;
    const bom = createBom({
      productItemId: product.id,
      label: "BOM",
      lines: [{ itemId: hw.id, qtyPerUnit: 2 }],
    });
    const job = createProductionJob({ label: "J1", bomId: bom.id, qty: 2 });
    expect(job.stage).toBe("material_ready");
    releaseJobMaterials(job.id);
    expect(getItem(hw.id)?.reserved).toBe(0);
    expect(listMovements().some((m) => m.type === "allocation_release")).toBe(true);

    const job2 = createProductionJob({ label: "J2", bomId: bom.id, qty: 2 });
    advanceProduction(job2.id, "in_production");
    const after = getItem(hw.id)!;
    expect(after.stockOnHand).toBe(6);
    expect(after.reserved).toBe(0);
    expect(listMovements().some((m) => m.type === "production_consumption")).toBe(true);
  });

  it("updates BOM with multiple materials and does not touch sales workspace", () => {
    const beforeSales = JSON.stringify(loadSalesWorkspace());
    const product = createItem({
      sku: "CHAIR",
      name: "Chair",
      category: "furniture_product",
      stockOnHand: 0,
    });
    const wood = createItem({ sku: "W", name: "Wood", category: "wood", stockOnHand: 20 });
    const fab = createItem({ sku: "F", name: "Fabric", category: "fabric", stockOnHand: 20 });
    const bom = createBom({
      productItemId: product.id,
      label: "Chair BOM",
      lines: [
        { itemId: wood.id, qtyPerUnit: 4 },
        { itemId: fab.id, qtyPerUnit: 1 },
      ],
    });
    const updated = updateBom(bom.id, {
      lines: [
        { itemId: wood.id, qtyPerUnit: 5 },
        { itemId: fab.id, qtyPerUnit: 2 },
      ],
    });
    expect(updated?.lines).toHaveLength(2);
    expect(updated?.lines[0]?.qtyPerUnit).toBe(5);
    expect(JSON.stringify(loadSalesWorkspace())).toBe(beforeSales);
    // ensure sales save path still works independently
    saveSalesWorkspace(loadSalesWorkspace());
  });

  it("updates suppliers and filters by SKU / stage / stock", () => {
    const supplier = createSupplier({ company: "Glass Co", categories: ["glass"] });
    updateSupplier(supplier.id, { company: "Glass Co Ltd", categories: ["glass", "metal"] });
    const glass = createItem({
      sku: "GL-1",
      name: "Pane",
      category: "glass",
      stockOnHand: 1,
      minStock: 5,
      supplierId: supplier.id,
    });
    const found = searchOps({ sku: "GL", stockStatus: "low", supplierId: supplier.id });
    expect(found.items.some((i) => i.id === glass.id)).toBe(true);
  });

  it("computes ops analytics without throwing", () => {
    createItem({ sku: "X", name: "X", category: "metal", stockOnHand: 1, minStock: 5, unitCostPkr: 100 });
    const a = computeOpsAnalytics();
    expect(a.lowStock.length).toBeGreaterThan(0);
    expect(a.valuationPkr).toBe(100);
  });

  it("verifies CRUD, BOM, supplier, PO receive, allocation, stages, analytics, filters", () => {
    // 1) Inventory CRUD
    const supplier = createSupplier({
      company: "Verify Co",
      categories: ["wood", "hardware"],
      contactPerson: "Ali",
    });
    const product = createItem({
      sku: "VF-SOFA",
      name: "Verify Sofa",
      category: "furniture_product",
      stockOnHand: 0,
      unitCostPkr: 50000,
    });
    const wood = createItem({
      sku: "VF-WOOD",
      name: "Oak",
      category: "wood",
      stockOnHand: 4,
      minStock: 2,
      supplierId: supplier.id,
      unitCostPkr: 1000,
    });
    const hw = createItem({
      sku: "VF-HW",
      name: "Screws",
      category: "hardware",
      stockOnHand: 10,
      minStock: 1,
      supplierId: supplier.id,
      unitCostPkr: 50,
    });
    expect(updateItem(wood.id, { name: "Oak Board", minStock: 3 })?.name).toBe("Oak Board");
    expect(() => createItem({ sku: "vf-wood", name: "dup", category: "wood" })).toThrow(/duplicate/i);
    adjustStock(wood.id, 6, "opening adjust"); // 4+6=10
    expect(getItem(wood.id)?.stockOnHand).toBe(10);

    // 2) BOM editing
    const bom = createBom({
      productItemId: product.id,
      label: "Verify BOM",
      lines: [
        { itemId: wood.id, qtyPerUnit: 2 },
        { itemId: hw.id, qtyPerUnit: 4 },
      ],
    });
    const bom2 = updateBom(bom.id, {
      label: "Verify BOM v2",
      lines: [
        { itemId: wood.id, qtyPerUnit: 3 },
        { itemId: hw.id, qtyPerUnit: 5 },
      ],
    });
    expect(bom2?.label).toBe("Verify BOM v2");
    expect(bom2?.lines.map((l) => l.qtyPerUnit)).toEqual([3, 5]);

    // 3) Supplier editing
    expect(updateSupplier(supplier.id, { company: "Verify Co Ltd", phone: "0300" })?.company).toBe(
      "Verify Co Ltd",
    );

    // 4) Procurement receive flow
    const po = createProcurement({
      supplierId: supplier.id,
      lines: [{ itemId: wood.id, qtyOrdered: 5 }],
    });
    for (const stage of ["requested", "approved", "ordered"] as const) {
      expect(advanceProcurement(po.id, stage)?.stage).toBe(stage);
    }
    const received = receiveProcurement(po.id, [{ itemId: wood.id, qty: 5 }]);
    expect(received?.stage).toBe("received");
    expect(getItem(wood.id)?.stockOnHand).toBe(15); // 10+5
    expect(advanceProcurement(po.id, "closed")?.stage).toBe("closed");
    expect(listMovements().some((m) => m.type === "purchase_received")).toBe(true);

    // 5) Material allocation (qty 2 → need wood 6, hw 10; have wood 15, hw 10)
    const job = createProductionJob({ label: "VF-JOB", bomId: bom.id, qty: 2 });
    expect(job.stage).toBe("material_ready");
    expect(job.pendingProcurement).toBe(false);
    expect(job.allocations.find((a) => a.itemId === wood.id)).toMatchObject({
      required: 6,
      allocated: 6,
      shortage: 0,
    });
    expect(job.allocations.find((a) => a.itemId === hw.id)).toMatchObject({
      required: 10,
      allocated: 10,
      shortage: 0,
    });
    expect(getItem(wood.id)?.reserved).toBe(6);
    expect(availableStock(getItem(wood.id)!)).toBe(9);

    // Shortage path
    const shortJob = createProductionJob({ label: "VF-SHORT", bomId: bom.id, qty: 10 });
    expect(shortJob.pendingProcurement).toBe(true);
    expect(shortJob.stage).toBe("queued");
    expect(shortJob.allocations.some((a) => a.shortage > 0)).toBe(true);

    // 6) Production stage progression
    for (const stage of [
      "in_production",
      "quality_check",
      "packaging",
      "ready",
      "dispatched",
      "delivered",
    ] as const) {
      expect(advanceProduction(job.id, stage)?.stage).toBe(stage);
    }
    expect(getItem(wood.id)?.stockOnHand).toBe(9); // 15-6 consumed
    expect(getItem(wood.id)?.reserved).toBe(9); // remaining reservation from VF-SHORT
    expect(listMovements().some((m) => m.type === "production_consumption")).toBe(true);

    // 7) Operations analytics
    const analytics = computeOpsAnalytics();
    expect(analytics.valuationPkr).toBeGreaterThan(0);
    expect(analytics.procurementByStage.some((x) => x.name === "Closed" && x.value >= 1)).toBe(true);
    expect(analytics.productionByStage.some((x) => x.name === "Delivered" && x.value >= 1)).toBe(true);
    expect(analytics.productionBacklog).toBeGreaterThanOrEqual(1); // shortJob still open
    expect(analytics.fastMoving.length + analytics.slowMoving.length + analytics.lowStock.length).toBeGreaterThan(
      0,
    );

    // 8) Search / filter combinations
    // After allocation, VF-WOOD available is 0 → not "ok"; "out" + other filters match.
    const notOk = searchOps({
      sku: "VF-WOOD",
      supplierId: supplier.id,
      category: "wood",
      stockStatus: "ok",
    });
    expect(notOk.items).toHaveLength(0);

    const combo = searchOps({
      sku: "VF-WOOD",
      supplierId: supplier.id,
      category: "wood",
      material: "oak",
      stockStatus: "out",
    });
    expect(combo.items).toHaveLength(1);
    expect(combo.items[0]?.sku).toBe("VF-WOOD");

    const byProd = searchOps({ productionStage: "queued" });
    expect(byProd.jobs.some((j) => j.label === "VF-SHORT")).toBe(true);

    const byPo = searchOps({ procurementStage: "closed" });
    expect(byPo.procurements.some((p) => p.id === po.id)).toBe(true);

    const byDate = searchOps({
      dateFrom: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
      dateTo: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    });
    expect(byDate.jobs.length).toBeGreaterThan(0);
    expect(byDate.procurements.length).toBeGreaterThan(0);
  });
});
