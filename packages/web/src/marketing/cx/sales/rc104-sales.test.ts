/**
 * RC10.4 — Sales workflow unit tests.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  addInternalNote,
  advanceStage,
  assignStaff,
  bridgeLeadToSales,
  clearSalesWorkspace,
  computeOperationalMetrics,
  createInquiry,
  createOrderFromAcceptedQuote,
  createQuoteRevision,
  getQuote,
  listCustomerTimeline,
  listInternalNotes,
  listQuotes,
  searchSales,
  setOrderStatus,
  setQuoteStatus,
} from "./index";
import type { LeadDraft } from "../stores";

beforeEach(() => {
  clearSalesWorkspace();
  localStorage.clear();
});

describe("RC10.4 CRM pipeline", () => {
  it("creates inquiry and advances stages", () => {
    const opp = createInquiry({
      customerName: "Marina Hotels",
      customerEmail: "buyer@marina.test",
      source: "test",
      projectId: "proj-1",
      projectTitle: "Lobby refresh",
      packageTotalPkr: 1_200_000,
    });
    expect(opp.stage).toBe("new_inquiry");
    const next = advanceStage(opp.id, "qualified");
    expect(next?.stage).toBe("qualified");
  });
});

describe("RC10.4 quotation workflow", () => {
  it("never overwrites prior quote revisions", () => {
    const opp = createInquiry({
      customerName: "Indus Group",
      customerEmail: "ops@indus.test",
      source: "planner",
    });
    const q1 = createQuoteRevision({
      opportunityId: opp.id,
      label: "Q-1",
      lines: [{ productId: "a", name: "Chair", qty: 2, unitPkr: 50_000 }],
      totalPkr: 100_000,
      status: "draft",
    });
    const q2 = createQuoteRevision({
      opportunityId: opp.id,
      label: "Q-1 revised",
      lines: [{ productId: "a", name: "Chair", qty: 2, unitPkr: 55_000 }],
      totalPkr: 110_000,
      status: "sent",
    });
    expect(q1).not.toBeNull();
    expect(q2).not.toBeNull();
    expect(q1!.id).not.toBe(q2!.id);
    expect(q2!.revisesQuoteId).toBe(q1!.id);
    expect(q2!.revision).toBe(2);
    expect(getQuote(q1!.id)?.totalPkr).toBe(100_000);
    expect(listQuotes(opp.id)).toHaveLength(2);
  });

  it("tracks quote status timestamps and creates order only when accepted", () => {
    const opp = createInquiry({
      customerName: "Cedar Club",
      customerEmail: "hello@cedar.test",
      source: "test",
    });
    const quote = createQuoteRevision({
      opportunityId: opp.id,
      label: "Q-Cedar",
      lines: [{ productId: "sofa", name: "Sofa", qty: 1, unitPkr: 200_000 }],
      totalPkr: 200_000,
    })!;
    setQuoteStatus(quote.id, "sent");
    setQuoteStatus(quote.id, "viewed");
    expect(createOrderFromAcceptedQuote(quote.id)).toBeNull();
    setQuoteStatus(quote.id, "accepted");
    const accepted = getQuote(quote.id)!;
    expect(accepted.timestamps.acceptedAt).toBeTruthy();
    const order = createOrderFromAcceptedQuote(quote.id);
    expect(order).not.toBeNull();
    expect(order!.taxPkr).toBe(0);
    expect(order!.packageSnapshot).toHaveLength(1);
    // Order status must not require mutating planner data
    const moved = setOrderStatus(order!.id, "in_production");
    expect(moved?.status).toBe("in_production");
    expect(moved?.packageSnapshot).toEqual(order!.packageSnapshot);
  });
});

describe("RC10.4 timeline, notes, assignments", () => {
  it("records timeline and keeps internal note text staff-only", () => {
    const opp = createInquiry({
      customerName: "Horizon",
      customerEmail: "p@horizon.test",
      source: "test",
      message: "Need delivery before Eid",
    });
    addInternalNote(opp.id, "Customer prefers walnut finish.", "u1", "A. Khan");
    assignStaff(opp.id, "salesperson", "u1", "A. Khan");
    const timeline = listCustomerTimeline(opp.customerEmail, opp.customerName);
    expect(timeline.some((e) => e.type === "inquiry_created")).toBe(true);
    expect(timeline.some((e) => e.type === "note_added")).toBe(true);
    expect(timeline.every((e) => !/walnut/i.test(e.body))).toBe(true);
    const notes = listInternalNotes(opp.id);
    expect(notes[0]?.staffOnly).toBe(true);
    expect(notes[0]?.text).toMatch(/walnut/i);
  });
});

describe("RC10.4 search and analytics", () => {
  it("filters by customer and computes conversion metrics", () => {
    const a = createInquiry({
      customerName: "Alpha",
      customerEmail: "a@test.com",
      source: "t",
    });
    createInquiry({ customerName: "Beta", customerEmail: "b@test.com", source: "t" });
    const q = createQuoteRevision({
      opportunityId: a.id,
      label: "QA",
      lines: [{ productId: "x", name: "X", qty: 1, unitPkr: 10_000 }],
      totalPkr: 10_000,
    })!;
    setQuoteStatus(q.id, "accepted");
    const hit = searchSales({ customer: "alpha" });
    expect(hit.opportunities).toHaveLength(1);
    const metrics = computeOperationalMetrics();
    expect(metrics.acceptedQuotations).toBe(1);
    expect(metrics.conversionRate).toBe(100);
  });
});

describe("RC10.4 lead bridge", () => {
  it("bridges enqueueLead-shaped drafts into CRM", () => {
    const lead: LeadDraft = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      intent: "quote",
      name: "Studio Kite",
      email: "hi@kite.test",
      message: "From quote form",
      source: "quote-page",
      meta: { projectId: "p-9", projectTitle: "Studio plan", quotationTotal: 500_000 },
    };
    const opp = bridgeLeadToSales(lead);
    expect(opp.leadDraftId).toBe(lead.id);
    expect(opp.projectId).toBe("p-9");
    expect(opp.packageTotalPkr).toBe(500_000);
    expect(bridgeLeadToSales(lead).id).toBe(opp.id);
  });
});
