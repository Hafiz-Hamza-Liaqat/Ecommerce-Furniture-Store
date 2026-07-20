/**
 * RC10.6 — Metric calculation (pure functions over filtered snapshots).
 */

import type { BiSnapshot } from "./source";
import { categoryFromLines, salespersonOf } from "./filter";
import type {
  ActivityItem,
  CrmAnalytics,
  CustomerAnalytics,
  ExecutiveDashboard,
  KpiMetric,
  NamedCount,
  NamedMoney,
  PlannerAnalytics,
  ProductionAnalytics,
  SalesAnalytics,
  TrendPoint,
} from "./types";
import { ORDER_STATUS_LABELS, PIPELINE_STAGE_LABELS, PIPELINE_STAGES } from "../sales/types";

function avg(nums: readonly number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
}

function hoursBetween(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / 3_600_000;
}

function daysBetween(a?: string, b?: string): number | null {
  const h = hoursBetween(a, b);
  return h == null ? null : Math.round((h / 24) * 10) / 10;
}

function formatPkr(n: number): string {
  return `PKR ${Math.round(n).toLocaleString("en-PK")}`;
}

function formatPct(n: number): string {
  return `${n}%`;
}

function toActivity(item: {
  readonly id: string;
  readonly at: string;
  readonly title: string;
  readonly body: string;
  readonly href?: string;
}): ActivityItem {
  if (item.href) {
    return {
      id: item.id,
      at: item.at,
      title: item.title,
      body: item.body,
      href: item.href,
    };
  }
  return { id: item.id, at: item.at, title: item.title, body: item.body };
}

function countBy(names: readonly string[]): NamedCount[] {
  const map = new Map<string, number>();
  for (const n of names) map.set(n, (map.get(n) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function moneyBy(entries: readonly { name: string; valuePkr: number }[]): NamedMoney[] {
  const map = new Map<string, number>();
  for (const e of entries) map.set(e.name, (map.get(e.name) ?? 0) + e.valuePkr);
  return [...map.entries()]
    .map(([name, valuePkr]) => ({ name, valuePkr }))
    .sort((a, b) => b.valuePkr - a.valuePkr);
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function computeExecutive(snapshot: BiSnapshot): ExecutiveDashboard {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const revenueOrders = snapshot.orders.filter(
    (o) => o.status === "delivered" || o.status === "completed",
  );
  const totalRevenue = revenueOrders.reduce((s, o) => s + o.totalPkr, 0);
  const monthlyRevenue = revenueOrders
    .filter((o) => new Date(o.updatedAt).getTime() >= monthStart)
    .reduce((s, o) => s + o.totalPkr, 0);

  const acceptedQuotes = snapshot.quotes.filter((q) => q.status === "accepted");
  const decidedQuotes = snapshot.quotes.filter(
    (q) => q.status === "accepted" || q.status === "rejected",
  );
  const conversionRate =
    decidedQuotes.length === 0
      ? 0
      : Math.round((acceptedQuotes.length / decidedQuotes.length) * 1000) / 10;

  const openQuotations = snapshot.quotes.filter((q) =>
    ["draft", "sent", "viewed"].includes(q.status),
  ).length;
  const pendingApprovals = snapshot.orders.filter((o) => o.status === "awaiting_approval").length;
  const ordersInProduction = snapshot.orders.filter((o) => o.status === "in_production").length;
  const ordersDelivered = snapshot.orders.filter(
    (o) => o.status === "delivered" || o.status === "completed",
  ).length;

  const avgProject =
    snapshot.projects.length === 0
      ? 0
      : Math.round(
          snapshot.projects.reduce((s, p) => s + (p.totalPkr ?? p.budgetPkr ?? 0), 0) /
            snapshot.projects.length,
        );
  const avgQuote =
    snapshot.quotes.length === 0
      ? 0
      : Math.round(snapshot.quotes.reduce((s, q) => s + q.totalPkr, 0) / snapshot.quotes.length);
  const avgOrder =
    snapshot.orders.length === 0
      ? 0
      : Math.round(snapshot.orders.reduce((s, o) => s + o.totalPkr, 0) / snapshot.orders.length);

  const kpis: KpiMetric[] = [
    { id: "total-revenue", label: "Total Revenue", value: formatPkr(totalRevenue) },
    { id: "monthly-revenue", label: "Monthly Revenue", value: formatPkr(monthlyRevenue) },
    { id: "in-production", label: "Orders in Production", value: String(ordersInProduction) },
    { id: "delivered", label: "Orders Delivered", value: String(ordersDelivered) },
    { id: "open-quotes", label: "Open Quotations", value: String(openQuotations) },
    { id: "pending-approvals", label: "Pending Approvals", value: String(pendingApprovals) },
    { id: "projects", label: "Projects Created", value: String(snapshot.projects.length) },
    { id: "conversion", label: "Conversion Rate", value: formatPct(conversionRate) },
    { id: "avg-project", label: "Average Project Value", value: formatPkr(avgProject) },
    { id: "avg-quote", label: "Average Quote Value", value: formatPkr(avgQuote) },
    { id: "avg-order", label: "Average Order Value", value: formatPkr(avgOrder) },
  ];

  const byMonth = new Map<string, number>();
  for (const o of revenueOrders) {
    const k = monthKey(o.updatedAt);
    byMonth.set(k, (byMonth.get(k) ?? 0) + o.totalPkr);
  }
  const revenueTrend: TrendPoint[] = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([label, value]) => ({ label, value }));

  const recentActivity: ActivityItem[] = [
    ...snapshot.timeline.slice(0, 8).map((e) =>
      toActivity({
        id: e.id,
        at: e.at,
        title: e.title,
        body: e.body,
        ...(e.href ? { href: e.href } : {}),
      }),
    ),
    ...snapshot.notifications.slice(0, 4).map((n) =>
      toActivity({
        id: n.id,
        at: n.createdAt,
        title: n.title,
        body: n.body,
        ...(n.href ? { href: n.href } : {}),
      }),
    ),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  return { kpis, revenueTrend, recentActivity };
}

export function computeSales(snapshot: BiSnapshot): SalesAnalytics {
  const accepted = snapshot.quotes.filter((q) => q.status === "accepted").length;
  const decided = snapshot.quotes.filter(
    (q) => q.status === "accepted" || q.status === "rejected",
  ).length;
  const quotationAcceptanceRate =
    decided === 0 ? 0 : Math.round((accepted / decided) * 1000) / 10;

  const funnelStages = [
    "new_inquiry",
    "qualified",
    "quotation_sent",
    "negotiation",
    "approved",
    "production",
    "delivered",
  ] as const;
  const conversionFunnel: NamedCount[] = funnelStages.map((s) => ({
    name: PIPELINE_STAGE_LABELS[s],
    value: snapshot.opportunities.filter((o) => o.stage === s).length,
  }));

  const salespersonPerformance = moneyBy(
    snapshot.opportunities.map((o) => ({
      name: salespersonOf(o),
      valuePkr: o.packageTotalPkr ?? o.budgetPkr ?? 0,
    })),
  );

  const revenueBySalesperson = moneyBy(
    snapshot.orders
      .filter((o) => o.status === "delivered" || o.status === "completed")
      .map((o) => ({
        name: o.salespersonLabel ?? "Unassigned",
        valuePkr: o.totalPkr,
      })),
  );

  const revenueByCategory = moneyBy(
    snapshot.orders.flatMap((o) =>
      o.packageSnapshot.map((line) => ({
        name: categoryFromLines([line]),
        valuePkr: line.qty * line.unitPkr,
      })),
    ),
  );

  const revenueByRoomType = moneyBy(
    snapshot.plans.map((p) => ({
      name: p.endUse || "General",
      valuePkr: p.totalPkr,
    })),
  );

  const topConfigurations = countBy(
    snapshot.orders.flatMap((o) => o.packageSnapshot.map((l) => l.name)),
  ).slice(0, 8);

  const approvalHours = snapshot.quotes
    .map((q) => hoursBetween(q.timestamps.sentAt, q.timestamps.acceptedAt))
    .filter((n): n is number => n != null);
  const negotiationHours = snapshot.opportunities
    .filter((o) => o.stage === "negotiation" || o.stage === "approved" || o.stage === "closed")
    .map((o) => hoursBetween(o.createdAt, o.updatedAt))
    .filter((n): n is number => n != null);

  return {
    quotationAcceptanceRate,
    conversionFunnel,
    salespersonPerformance,
    revenueBySalesperson,
    revenueByCategory,
    revenueByRoomType,
    topConfigurations,
    averageApprovalHours: avg(approvalHours),
    averageNegotiationHours: avg(negotiationHours),
  };
}

export function computeCrm(snapshot: BiSnapshot): CrmAnalytics {
  const stageDistribution = PIPELINE_STAGES.map((s) => ({
    name: PIPELINE_STAGE_LABELS[s],
    value: snapshot.opportunities.filter((o) => o.stage === s).length,
  }));

  const wonCount = snapshot.opportunities.filter(
    (o) => o.stage === "delivered" || o.stage === "closed",
  ).length;
  const lostCount = snapshot.quotes.filter((q) => q.status === "rejected").length;
  const leadConversionRate =
    snapshot.opportunities.length === 0
      ? 0
      : Math.round((wonCount / snapshot.opportunities.length) * 1000) / 10;

  const averageDaysInStage = PIPELINE_STAGES.map((s) => {
    const days = snapshot.opportunities
      .filter((o) => o.stage === s)
      .map((o) => daysBetween(o.createdAt, o.updatedAt) ?? 0);
    return { name: PIPELINE_STAGE_LABELS[s], value: avg(days) ?? 0 };
  });

  const recentLeads: ActivityItem[] = snapshot.opportunities
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
    .map((o) => ({
      id: o.id,
      at: o.createdAt,
      title: o.customerName,
      body: `${PIPELINE_STAGE_LABELS[o.stage]} · ${o.source}`,
      href: `/app/sales/workflow?opportunity=${o.id}`,
    }));

  return {
    stageDistribution,
    leadConversionRate,
    averageDaysInStage,
    wonCount,
    lostCount,
    recentLeads,
    approvalBottlenecks: snapshot.orders.filter((o) => o.status === "awaiting_approval").length,
  };
}

export function computeProduction(snapshot: BiSnapshot): ProductionAnalytics {
  const inProduction = snapshot.orders.filter((o) => o.status === "in_production").length;
  const awaitingProduction = snapshot.orders.filter(
    (o) => o.status === "approved" || o.status === "awaiting_approval",
  ).length;
  const upcomingDeliveries = snapshot.orders.filter(
    (o) => o.status === "ready_for_delivery" || o.deliveryStatus === "scheduled",
  ).length;
  const completedDeliveries = snapshot.orders.filter(
    (o) =>
      o.status === "delivered" ||
      o.status === "completed" ||
      o.deliveryStatus === "delivered",
  ).length;

  const productionDays = snapshot.orders
    .filter((o) => o.status === "in_production" || o.status === "ready_for_delivery" || o.status === "delivered")
    .map((o) => daysBetween(o.createdAt, o.updatedAt))
    .filter((n): n is number => n != null);

  const deliveryDays = snapshot.orders
    .filter((o) => o.deliveryStatus === "delivered" || o.status === "delivered")
    .map((o) => daysBetween(o.createdAt, o.updatedAt))
    .filter((n): n is number => n != null);

  const backlog = snapshot.orders.filter(
    (o) =>
      o.status === "approved" ||
      o.status === "in_production" ||
      o.status === "ready_for_delivery",
  ).length;

  const statusDistribution = Object.entries(ORDER_STATUS_LABELS).map(([status, name]) => ({
    name,
    value: snapshot.orders.filter((o) => o.status === status).length,
  }));

  return {
    inProduction,
    awaitingProduction,
    upcomingDeliveries,
    completedDeliveries,
    averageProductionDays: avg(productionDays),
    averageDeliveryDays: avg(deliveryDays),
    backlog,
    statusDistribution,
  };
}

export function computeCustomers(snapshot: BiSnapshot): CustomerAnalytics {
  const byCustomer = new Map<
    string,
    { name: string; spend: number; projects: number; orders: number; lastAt: string }
  >();

  for (const o of snapshot.opportunities) {
    const key = o.customerEmail.toLowerCase() || o.customerName.toLowerCase();
    const cur = byCustomer.get(key) ?? {
      name: o.customerName,
      spend: 0,
      projects: 0,
      orders: 0,
      lastAt: o.updatedAt,
    };
    cur.projects += 1;
    cur.spend += o.packageTotalPkr ?? o.budgetPkr ?? 0;
    if (o.updatedAt > cur.lastAt) cur.lastAt = o.updatedAt;
    byCustomer.set(key, cur);
  }
  for (const order of snapshot.orders) {
    const key = order.customerEmail.toLowerCase() || order.customerName.toLowerCase();
    const cur = byCustomer.get(key) ?? {
      name: order.customerName,
      spend: 0,
      projects: 0,
      orders: 0,
      lastAt: order.updatedAt,
    };
    cur.orders += 1;
    cur.spend += order.totalPkr;
    if (order.updatedAt > cur.lastAt) cur.lastAt = order.updatedAt;
    byCustomer.set(key, cur);
  }

  const customers = [...byCustomer.values()];
  const newCustomers = customers.filter((c) => c.orders <= 1 && c.projects <= 1).length;
  const returningCustomers = customers.filter((c) => c.orders > 1 || c.projects > 1).length;
  const projectsPerCustomer =
    customers.length === 0
      ? 0
      : Math.round((customers.reduce((s, c) => s + c.projects, 0) / customers.length) * 10) / 10;
  const averageSpendPkr =
    customers.length === 0
      ? 0
      : Math.round(customers.reduce((s, c) => s + c.spend, 0) / customers.length);

  const highestValue: NamedMoney[] = customers
    .slice()
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8)
    .map((c) => ({ name: c.name, valuePkr: c.spend }));

  const mostActive: NamedCount[] = customers
    .slice()
    .sort((a, b) => b.orders + b.projects - (a.orders + a.projects))
    .slice(0, 8)
    .map((c) => ({ name: c.name, value: c.orders + c.projects }));

  const recentActivity: ActivityItem[] = snapshot.timeline.slice(0, 10).map((e) =>
    toActivity({
      id: e.id,
      at: e.at,
      title: e.title,
      body: e.body,
      ...(e.href ? { href: e.href } : {}),
    }),
  );

  return {
    newCustomers,
    returningCustomers,
    projectsPerCustomer,
    averageSpendPkr,
    highestValue,
    mostActive,
    recentActivity,
  };
}

export function computePlanner(snapshot: BiSnapshot): PlannerAnalytics {
  const styleDistribution = countBy(snapshot.plans.map((p) => p.style || "unspecified"));
  const packagePopularity = countBy(snapshot.plans.map((p) => p.packageId || "unknown"));
  const roomTypeDistribution = countBy(snapshot.plans.map((p) => p.endUse || "general"));

  // Materials / finishes inferred from package line labels when orders exist; else empty.
  const materialHints = countBy(
    snapshot.orders.flatMap((o) =>
      o.packageSnapshot.flatMap((l) =>
        (l.variantLabels ?? []).filter((v) => /wood|oak|walnut|metal|fabric|leather/i.test(v)),
      ),
    ),
  ).slice(0, 8);

  const finishHints = countBy(
    snapshot.orders.flatMap((o) =>
      o.packageSnapshot.flatMap((l) =>
        (l.variantLabels ?? []).filter((v) => /matte|gloss|polish|paint|lacquer|veneer/i.test(v)),
      ),
    ),
  ).slice(0, 8);

  const buckets = ["0–100k", "100–250k", "250–500k", "500k+"] as const;
  const budgetBuckets: NamedCount[] = buckets.map((name) => ({ name, value: 0 }));
  for (const p of snapshot.plans) {
    const b = p.budgetPkr;
    const idx = b < 100_000 ? 0 : b < 250_000 ? 1 : b < 500_000 ? 2 : 3;
    budgetBuckets[idx] = { name: budgetBuckets[idx]!.name, value: budgetBuckets[idx]!.value + 1 };
  }

  const roomBudgets = snapshot.plans.map((p) =>
    p.seats > 0 ? p.budgetPkr / Math.max(p.seats, 1) : p.budgetPkr,
  );
  const averageRoomBudgetPkr = avg(roomBudgets) ?? 0;

  return {
    styleDistribution,
    materialHints,
    finishHints,
    budgetBuckets,
    averageRoomBudgetPkr: Math.round(averageRoomBudgetPkr),
    packagePopularity,
    roomTypeDistribution,
  };
}
