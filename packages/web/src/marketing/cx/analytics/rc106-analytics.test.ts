/**
 * RC10.6 — Analytics unit tests (read-only derive layer).
 */

import { beforeEach, describe, expect, it } from "vitest";
import { buildBiReport } from "./derive";
import { filterSnapshot, resolveDateWindow } from "./filter";
import { computeExecutive, computeSales } from "./metrics";
import type { BiSnapshot } from "./source";
import { DEFAULT_BI_FILTERS } from "./types";

function fixture(): BiSnapshot {
  const now = new Date().toISOString();
  return {
    opportunities: [
      {
        id: "opp-1",
        customerName: "Alpha Co",
        customerEmail: "a@example.com",
        stage: "quotation_sent",
        quoteIds: ["q-1"],
        orderIds: [],
        assignments: [{ role: "salesperson", userId: "u1", label: "A. Khan", assignedAt: now }],
        source: "test",
        packageTotalPkr: 200000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "opp-2",
        customerName: "Beta Co",
        customerEmail: "b@example.com",
        stage: "delivered",
        quoteIds: ["q-2"],
        orderIds: ["o-1"],
        assignments: [{ role: "salesperson", userId: "u2", label: "S. Malik", assignedAt: now }],
        source: "test",
        packageTotalPkr: 500000,
        createdAt: now,
        updatedAt: now,
      },
    ],
    quotes: [
      {
        id: "q-1",
        opportunityId: "opp-1",
        revision: 1,
        label: "Quote 1",
        status: "sent",
        lines: [{ productId: "p1", name: "Executive Chair", qty: 2, unitPkr: 50000 }],
        totalPkr: 100000,
        timestamps: { draftAt: now, sentAt: now },
        createdAt: now,
      },
      {
        id: "q-2",
        opportunityId: "opp-2",
        revision: 1,
        label: "Quote 2",
        status: "accepted",
        lines: [{ productId: "p2", name: "Conference Table", qty: 1, unitPkr: 400000 }],
        totalPkr: 400000,
        timestamps: { draftAt: now, sentAt: now, acceptedAt: now },
        createdAt: now,
      },
      {
        id: "q-3",
        opportunityId: "opp-1",
        revision: 2,
        label: "Quote 1b",
        status: "rejected",
        lines: [{ productId: "p1", name: "Executive Chair", qty: 1, unitPkr: 50000 }],
        totalPkr: 50000,
        timestamps: { draftAt: now, rejectedAt: now },
        createdAt: now,
      },
    ],
    orders: [
      {
        id: "o-1",
        opportunityId: "opp-2",
        quoteId: "q-2",
        customerName: "Beta Co",
        customerEmail: "b@example.com",
        salespersonLabel: "S. Malik",
        packageSnapshot: [{ productId: "p2", name: "Conference Table", qty: 1, unitPkr: 400000 }],
        subtotalPkr: 400000,
        taxPkr: 0,
        totalPkr: 400000,
        status: "delivered",
        deliveryStatus: "delivered",
        paymentStatus: "paid",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "o-2",
        opportunityId: "opp-2",
        quoteId: "q-2",
        customerName: "Beta Co",
        customerEmail: "b@example.com",
        salespersonLabel: "S. Malik",
        packageSnapshot: [{ productId: "p3", name: "Storage Cabinet", qty: 2, unitPkr: 30000 }],
        subtotalPkr: 60000,
        taxPkr: 0,
        totalPkr: 60000,
        status: "in_production",
        deliveryStatus: "not_scheduled",
        paymentStatus: "partial",
        createdAt: now,
        updatedAt: now,
      },
    ],
    timeline: [
      {
        id: "t-1",
        opportunityId: "opp-1",
        customerKey: "a@example.com",
        at: now,
        type: "inquiry_created",
        title: "Follow-up",
        body: "Called customer",
      },
    ],
    projects: [
      {
        id: "proj-1",
        title: "Alpha Office",
        status: "planning",
        createdAt: now,
        updatedAt: now,
        ownerLabel: "Local",
        templateId: "office",
        budgetPkr: 250000,
        totalPkr: 250000,
        roomCount: 3,
        aiAssisted: false,
        latestVersionNumber: 1,
      },
    ],
    plans: [
      {
        id: "plan-1",
        createdAt: now,
        budgetPkr: 250000,
        endUse: "office",
        style: "modern",
        seats: 8,
        packageId: "pkg-a",
        lineIds: ["p1"],
        totalPkr: 250000,
      },
    ],
    notifications: [],
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("RC10.6 analytics", () => {
  it("computes executive KPIs without mutating input", () => {
    const snap = fixture();
    const exec = computeExecutive(snap);
    expect(exec.kpis.length).toBeGreaterThanOrEqual(10);
    expect(exec.kpis.find((k) => k.id === "conversion")?.value).toBe("50%");
    expect(exec.kpis.find((k) => k.id === "in-production")?.value).toBe("1");
    expect(exec.kpis.find((k) => k.id === "delivered")?.value).toBe("1");
    expect(snap.orders.length).toBe(2);
  });

  it("computes quotation acceptance and category revenue", () => {
    const sales = computeSales(fixture());
    expect(sales.quotationAcceptanceRate).toBe(50);
    expect(sales.revenueByCategory.some((c) => c.name === "Tables")).toBe(true);
    expect(sales.topConfigurations[0]?.name).toBeTruthy();
  });

  it("filters by salesperson", () => {
    const filtered = filterSnapshot(fixture(), {
      ...DEFAULT_BI_FILTERS,
      salesperson: "A. Khan",
    });
    expect(filtered.opportunities.every((o) => o.id === "opp-1")).toBe(true);
    expect(filtered.orders.length).toBe(0);
  });

  it("builds a full report with default filters", () => {
    const report = buildBiReport(DEFAULT_BI_FILTERS, fixture());
    expect(report.executive.kpis.length).toBeGreaterThan(0);
    expect(report.crm.stageDistribution.length).toBeGreaterThan(0);
    expect(report.production.backlog).toBeGreaterThanOrEqual(0);
    expect(report.customers.newCustomers + report.customers.returningCustomers).toBeGreaterThan(0);
    expect(report.planner.styleDistribution.some((s) => s.name === "modern")).toBe(true);
  });

  it("resolves mtd date window", () => {
    const { from, to } = resolveDateWindow({ ...DEFAULT_BI_FILTERS, relative: "mtd" });
    expect(from).not.toBeNull();
    expect(to).not.toBeNull();
    expect(from! <= to!).toBe(true);
  });
});
