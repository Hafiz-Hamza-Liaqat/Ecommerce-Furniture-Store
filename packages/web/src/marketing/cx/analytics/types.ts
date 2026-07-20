/**
 * RC10.6 — CX business intelligence types (view-models only).
 * Extension points reserved; future capabilities are not implemented.
 */

import type { OrderStatus, PipelineStage } from "../sales/types";

export type BiRelativeRange = "all" | "mtd" | "qtd" | "ytd" | "custom";

export type BiFilters = {
  readonly relative: BiRelativeRange;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly salesperson: string;
  readonly projectId: string;
  readonly customer: string;
  readonly pipelineStage: PipelineStage | "all";
  readonly orderStatus: OrderStatus | "all";
  readonly roomType: string;
  readonly furnitureStyle: string;
  readonly productCategory: string;
};

export const DEFAULT_BI_FILTERS: BiFilters = {
  relative: "all",
  dateFrom: "",
  dateTo: "",
  salesperson: "all",
  projectId: "all",
  customer: "",
  pipelineStage: "all",
  orderStatus: "all",
  roomType: "all",
  furnitureStyle: "all",
  productCategory: "all",
};

export type NamedCount = {
  readonly name: string;
  readonly value: number;
};

export type NamedMoney = {
  readonly name: string;
  readonly valuePkr: number;
};

export type TrendPoint = {
  readonly label: string;
  readonly value: number;
};

export type KpiMetric = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly trendPct?: number | null;
};

export type ActivityItem = {
  readonly id: string;
  readonly at: string;
  readonly title: string;
  readonly body: string;
  readonly href?: string;
};

export type ExecutiveDashboard = {
  readonly kpis: readonly KpiMetric[];
  readonly revenueTrend: readonly TrendPoint[];
  readonly recentActivity: readonly ActivityItem[];
};

export type SalesAnalytics = {
  readonly quotationAcceptanceRate: number;
  readonly conversionFunnel: readonly NamedCount[];
  readonly salespersonPerformance: readonly NamedMoney[];
  readonly revenueBySalesperson: readonly NamedMoney[];
  readonly revenueByCategory: readonly NamedMoney[];
  readonly revenueByRoomType: readonly NamedMoney[];
  readonly topConfigurations: readonly NamedCount[];
  readonly averageApprovalHours: number | null;
  readonly averageNegotiationHours: number | null;
};

export type CrmAnalytics = {
  readonly stageDistribution: readonly NamedCount[];
  readonly leadConversionRate: number;
  readonly averageDaysInStage: readonly NamedCount[];
  readonly wonCount: number;
  readonly lostCount: number;
  readonly recentLeads: readonly ActivityItem[];
  readonly approvalBottlenecks: number;
};

export type ProductionAnalytics = {
  readonly inProduction: number;
  readonly awaitingProduction: number;
  readonly upcomingDeliveries: number;
  readonly completedDeliveries: number;
  readonly averageProductionDays: number | null;
  readonly averageDeliveryDays: number | null;
  readonly backlog: number;
  readonly statusDistribution: readonly NamedCount[];
};

export type CustomerAnalytics = {
  readonly newCustomers: number;
  readonly returningCustomers: number;
  readonly projectsPerCustomer: number;
  readonly averageSpendPkr: number;
  readonly highestValue: readonly NamedMoney[];
  readonly mostActive: readonly NamedCount[];
  readonly recentActivity: readonly ActivityItem[];
};

export type PlannerAnalytics = {
  readonly styleDistribution: readonly NamedCount[];
  readonly materialHints: readonly NamedCount[];
  readonly finishHints: readonly NamedCount[];
  readonly budgetBuckets: readonly NamedCount[];
  readonly averageRoomBudgetPkr: number;
  readonly packagePopularity: readonly NamedCount[];
  readonly roomTypeDistribution: readonly NamedCount[];
};

export type BiReport = {
  readonly generatedAt: string;
  readonly filters: BiFilters;
  readonly executive: ExecutiveDashboard;
  readonly sales: SalesAnalytics;
  readonly crm: CrmAnalytics;
  readonly production: ProductionAnalytics;
  readonly customers: CustomerAnalytics;
  readonly planner: PlannerAnalytics;
};

/**
 * Extension hooks for RC10.7+ — registered but unused in RC10.6.
 * Do not implement profit / inventory / financial / AI forecast / multi-branch here.
 */
export type BiExtensionHooks = {
  readonly onProfitAnalysis?: () => void;
  readonly onInventoryAnalytics?: () => void;
  readonly onFinancialReporting?: () => void;
  readonly onAiForecasting?: () => void;
  readonly onMultiBranchReporting?: () => void;
};
