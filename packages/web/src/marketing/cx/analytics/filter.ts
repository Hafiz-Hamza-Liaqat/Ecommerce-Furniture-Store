/**
 * RC10.6 — Filter layer (pure; no side effects).
 */

import type { BiSnapshot } from "./source";
import type { BiFilters, BiRelativeRange } from "./types";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

export function resolveDateWindow(
  filters: BiFilters,
  now = new Date(),
): { from: number | null; to: number | null } {
  let from: number | null = null;
  let to: number | null = null;
  const rel: BiRelativeRange = filters.relative;
  if (rel === "mtd") from = startOfMonth(now).getTime();
  else if (rel === "qtd") from = startOfQuarter(now).getTime();
  else if (rel === "ytd") from = startOfYear(now).getTime();
  else if (rel === "custom") {
    if (filters.dateFrom) from = new Date(filters.dateFrom).getTime();
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      to = end.getTime();
    }
  }
  if (rel !== "custom" && from != null) to = now.getTime();
  return { from, to };
}

function inWindow(iso: string, from: number | null, to: number | null): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  if (from != null && t < from) return false;
  if (to != null && t > to) return false;
  return true;
}

function salespersonOf(opp: { assignments: readonly { role: string; label: string }[] }): string {
  return opp.assignments.find((a) => a.role === "salesperson")?.label ?? "Unassigned";
}

function categoryFromLines(
  lines: readonly { name: string }[],
): string {
  const name = lines[0]?.name?.toLowerCase() ?? "";
  if (/chair|seat|sofa/.test(name)) return "Seating";
  if (/desk|table/.test(name)) return "Tables";
  if (/cabinet|storage|shelf/.test(name)) return "Storage";
  if (/bed|wardrobe/.test(name)) return "Bedroom";
  return "Other";
}

/**
 * Apply presentation filters. Does not mutate source records.
 */
export function filterSnapshot(snapshot: BiSnapshot, filters: BiFilters): BiSnapshot {
  const { from, to } = resolveDateWindow(filters);

  let opportunities = snapshot.opportunities.filter((o) => inWindow(o.createdAt, from, to));
  if (filters.pipelineStage !== "all") {
    opportunities = opportunities.filter((o) => o.stage === filters.pipelineStage);
  }
  if (filters.customer.trim()) {
    const q = filters.customer.trim().toLowerCase();
    opportunities = opportunities.filter(
      (o) =>
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q),
    );
  }
  if (filters.projectId !== "all") {
    opportunities = opportunities.filter((o) => o.projectId === filters.projectId);
  }
  if (filters.salesperson !== "all") {
    opportunities = opportunities.filter((o) => salespersonOf(o) === filters.salesperson);
  }

  const oppIds = new Set(opportunities.map((o) => o.id));

  let quotes = snapshot.quotes.filter(
    (q) => oppIds.has(q.opportunityId) && inWindow(q.createdAt, from, to),
  );
  if (filters.productCategory !== "all") {
    quotes = quotes.filter((q) => categoryFromLines(q.lines) === filters.productCategory);
  }

  let orders = snapshot.orders.filter(
    (o) => oppIds.has(o.opportunityId) && inWindow(o.createdAt, from, to),
  );
  if (filters.orderStatus !== "all") {
    orders = orders.filter((o) => o.status === filters.orderStatus);
  }
  if (filters.salesperson !== "all") {
    orders = orders.filter(
      (o) => (o.salespersonLabel ?? "Unassigned") === filters.salesperson,
    );
  }
  if (filters.productCategory !== "all") {
    orders = orders.filter(
      (o) => categoryFromLines(o.packageSnapshot) === filters.productCategory,
    );
  }

  const timeline = snapshot.timeline.filter((e) => oppIds.has(e.opportunityId));

  let projects = snapshot.projects.filter((p) => inWindow(p.updatedAt, from, to));
  if (filters.projectId !== "all") {
    projects = projects.filter((p) => p.id === filters.projectId);
  }
  if (filters.customer.trim()) {
    const q = filters.customer.trim().toLowerCase();
    projects = projects.filter((p) => p.title.toLowerCase().includes(q));
  }

  let plans = snapshot.plans.filter((p) => inWindow(p.createdAt, from, to));
  if (filters.furnitureStyle !== "all") {
    plans = plans.filter((p) => p.style === filters.furnitureStyle);
  }
  if (filters.roomType !== "all") {
    plans = plans.filter((p) => p.endUse === filters.roomType);
  }

  return {
    opportunities,
    quotes,
    orders,
    timeline,
    projects,
    plans,
    notifications: snapshot.notifications,
  };
}

export function listSalespersonOptions(snapshot: BiSnapshot): string[] {
  const set = new Set<string>();
  for (const o of snapshot.opportunities) {
    set.add(salespersonOf(o));
  }
  for (const o of snapshot.orders) {
    if (o.salespersonLabel) set.add(o.salespersonLabel);
  }
  return [...set].sort();
}

export function listProjectOptions(snapshot: BiSnapshot): { id: string; title: string }[] {
  return snapshot.projects.map((p) => ({ id: p.id, title: p.title }));
}

export function listStyleOptions(snapshot: BiSnapshot): string[] {
  return [...new Set(snapshot.plans.map((p) => p.style).filter(Boolean))].sort();
}

export function listRoomTypeOptions(snapshot: BiSnapshot): string[] {
  return [...new Set(snapshot.plans.map((p) => p.endUse).filter(Boolean))].sort();
}

export { salespersonOf, categoryFromLines };
