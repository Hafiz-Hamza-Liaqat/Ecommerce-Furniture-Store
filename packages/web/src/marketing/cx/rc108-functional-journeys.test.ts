/**
 * RC10.8 Phase 2 — integrated functional journeys.
 *
 * These tests cross the existing RC10 domain boundaries without introducing
 * new behavior: project/planner/configurator → quote → CRM → order → BI, and
 * sales → manufacturing operations. Persistence assertions reload from the
 * public stores rather than retaining only in-memory references.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { getCatalogueProduct } from "../data/catalogue";
import { planFromBrief } from "./intelligent/planner";
import {
  createProject,
  getProject,
  recordQuote,
  restorePlannerFromRoom,
  setLocalOwnerId,
  upsertRoomSnapshot,
} from "./projects";
import { unitPriceForSelection } from "./configurator";
import {
  addInternalNote,
  advanceStage,
  assignStaff,
  clearSalesWorkspace,
  createOrderFromAcceptedQuote,
  createQuoteRevision,
  findOpportunityForProject,
  getOrder,
  getQuote,
  listCustomerTimeline,
  listInternalNotes,
  listOrders,
  listQuotes,
  setOrderStatus,
  setQuoteStatus,
} from "./sales";
import { buildBiReport } from "./analytics/derive";
import { loadBiSnapshot } from "./analytics/source";
import { DEFAULT_BI_FILTERS } from "./analytics/types";
import {
  advanceProcurement,
  advanceProduction,
  clearOpsWorkspace,
  createBom,
  createItem,
  createProcurement,
  createProductionJob,
  createSupplier,
  getItem,
  listMovements,
  receiveProcurement,
} from "./ops";

beforeEach(() => {
  localStorage.clear();
  setLocalOwnerId("functional-auditor");
  clearSalesWorkspace();
  clearOpsWorkspace();
});

describe("RC10.8 Phase 2 integrated journeys", () => {
  it("persists planner configuration through quote, CRM, order, and analytics", () => {
    const project = createProject({
      title: "P2 Integrated Office",
      templateId: "office",
      budgetPkr: 2_000_000,
      owner: {
        ownerId: "functional-auditor",
        ownerLabel: "audit@example.test",
        customerName: "Audit Customer",
      },
    });
    const restored = restorePlannerFromRoom(project.rooms[0]!);
    expect(restored).not.toBeNull();
    const planned = planFromBrief(restored!.brief);
    const result = planned.primaryResult;
    expect(result.lines.length).toBeGreaterThan(0);

    const lines = result.lines.map((line) => ({
      productId: line.product.id,
      name: line.product.name,
      qty: line.qty,
      role: line.role,
      ...(line.zone ? { zone: line.zone } : {}),
      unitPkr: line.product.pricePkr,
    }));
    const totalPkr = lines.reduce(
      (sum, line) => sum + line.qty * line.unitPkr,
      0,
    );
    upsertRoomSnapshot(
      project.id,
      {
        roomId: project.activeRoomId,
        templateId: "office",
        brief: restored!.brief,
        activeTier: "recommended",
        lines,
        totalPkr,
        packageName: "Integrated recommended package",
        packageCustomized: true,
      },
      "Phase 2 planner save",
    );

    const sofa = getCatalogueProduct("meridian-sofa");
    expect(sofa).toBeDefined();
    const variantPrice = unitPriceForSelection(sofa!, ["ink", "leather"]);
    expect(variantPrice).toBeGreaterThan(sofa!.pricePkr);

    const quotedProject = recordQuote(project.id, {
      label: "P2-Q-1",
      lines: [
        ...lines.map(({ productId, name, qty, unitPkr }) => ({
          productId,
          name,
          qty,
          unitPkr,
        })),
        {
          productId: sofa!.id,
          name: sofa!.name,
          qty: 1,
          unitPkr: variantPrice,
        },
      ],
      totalPkr: totalPkr + variantPrice,
    });
    expect(quotedProject?.status).toBe("quoted");
    expect(getProject(project.id)?.quotes[0]?.totalPkr).toBe(
      totalPkr + variantPrice,
    );

    const opportunity = findOpportunityForProject(project.id);
    expect(opportunity).not.toBeNull();
    assignStaff(
      opportunity!.id,
      "salesperson",
      "sales-auditor",
      "Audit Salesperson",
    );
    addInternalNote(
      opportunity!.id,
      "Internal margin note — never customer visible",
      "sales-auditor",
      "Audit Salesperson",
    );
    for (const stage of [
      "qualified",
      "quotation_sent",
      "negotiation",
      "approved",
      "production",
      "ready_for_delivery",
      "delivered",
      "closed",
    ] as const) {
      expect(advanceStage(opportunity!.id, stage)?.stage).toBe(stage);
    }

    const firstQuote = listQuotes(opportunity!.id)[0]!;
    const revision = createQuoteRevision({
      opportunityId: opportunity!.id,
      projectId: project.id,
      label: "P2-Q-2",
      lines: firstQuote.lines,
      totalPkr: firstQuote.totalPkr,
    })!;
    expect(revision.revisesQuoteId).toBe(firstQuote.id);
    expect(getQuote(firstQuote.id)?.totalPkr).toBe(firstQuote.totalPkr);
    setQuoteStatus(revision.id, "sent");
    setQuoteStatus(revision.id, "viewed");
    setQuoteStatus(revision.id, "accepted");

    const order = createOrderFromAcceptedQuote(revision.id);
    expect(order).not.toBeNull();
    const plannerSnapshot = JSON.stringify(order!.packageSnapshot);
    for (const status of [
      "awaiting_approval",
      "approved",
      "in_production",
      "ready_for_delivery",
      "delivered",
      "completed",
    ] as const) {
      expect(setOrderStatus(order!.id, status)?.status).toBe(status);
    }
    const restoredOrder = getOrder(order!.id);
    expect(restoredOrder?.deliveryStatus).toBe("delivered");
    expect(JSON.stringify(restoredOrder?.packageSnapshot)).toBe(
      plannerSnapshot,
    );
    expect(listOrders().filter((item) => item.id === order!.id)).toHaveLength(1);

    const notes = listInternalNotes(opportunity!.id);
    expect(notes[0]?.staffOnly).toBe(true);
    const customerTimeline = listCustomerTimeline(
      opportunity!.customerEmail,
      opportunity!.customerName,
    );
    expect(
      customerTimeline.every((entry) => !/Internal margin note/i.test(entry.body)),
    ).toBe(true);
    expect(
      customerTimeline.some((entry) => entry.type === "order_created"),
    ).toBe(true);

    const before = localStorage.getItem("afh.cx.sales.workspace");
    const report = buildBiReport(DEFAULT_BI_FILTERS, loadBiSnapshot());
    expect(report.executive.kpis.length).toBeGreaterThan(0);
    expect(report.production.backlog).toBeGreaterThanOrEqual(0);
    expect(localStorage.getItem("afh.cx.sales.workspace")).toBe(before);
  });

  it("moves supplier receipt through allocation and production without negative stock", () => {
    const supplier = createSupplier({
      company: "P2 Materials",
      contactPerson: "Audit Supplier",
      categories: ["wood", "hardware"],
    });
    const product = createItem({
      sku: "P2-PRODUCT",
      name: "P2 Chair",
      category: "furniture_product",
      stockOnHand: 0,
    });
    const wood = createItem({
      sku: "P2-WOOD",
      name: "P2 Wood",
      category: "wood",
      stockOnHand: 0,
      supplierId: supplier.id,
    });
    const hardware = createItem({
      sku: "P2-HARDWARE",
      name: "P2 Hardware",
      category: "hardware",
      stockOnHand: 10,
      supplierId: supplier.id,
    });
    const bom = createBom({
      productItemId: product.id,
      label: "P2 Chair BOM",
      lines: [
        { itemId: wood.id, qtyPerUnit: 2 },
        { itemId: hardware.id, qtyPerUnit: 4 },
      ],
    });
    const procurement = createProcurement({
      supplierId: supplier.id,
      lines: [{ itemId: wood.id, qtyOrdered: 10 }],
    });
    for (const stage of ["requested", "approved", "ordered"] as const) {
      expect(advanceProcurement(procurement.id, stage)?.stage).toBe(stage);
    }
    expect(
      receiveProcurement(procurement.id, [{ itemId: wood.id, qty: 10 }])?.stage,
    ).toBe("received");
    expect(advanceProcurement(procurement.id, "closed")?.stage).toBe("closed");

    const job = createProductionJob({
      label: "P2 Production",
      bomId: bom.id,
      qty: 2,
    });
    expect(job.stage).toBe("material_ready");
    expect(job.pendingProcurement).toBe(false);
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
    expect(getItem(wood.id)?.stockOnHand).toBe(6);
    expect(getItem(hardware.id)?.stockOnHand).toBe(2);
    expect(getItem(wood.id)?.reserved).toBe(0);
    expect(getItem(hardware.id)?.reserved).toBe(0);
    expect(
      listMovements().some(
        (movement) => movement.type === "production_consumption",
      ),
    ).toBe(true);
  });
});
