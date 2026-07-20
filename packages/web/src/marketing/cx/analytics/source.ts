/**
 * RC10.6 — Read-only analytics source adapters (no store mutations).
 */

import { listProjects } from "../projects";
import type { ProjectListItem } from "../projects";
import { listSavedPlans, type SavedPlan } from "../stores";
import { loadSalesWorkspace } from "../sales/store";
import type {
  SalesOpportunity,
  SalesOrder,
  SalesQuote,
  TimelineEvent,
} from "../sales/types";
import { listNotifications, type CxNotification } from "../../nav/notifications";

export type BiSnapshot = {
  readonly opportunities: readonly SalesOpportunity[];
  readonly quotes: readonly SalesQuote[];
  readonly orders: readonly SalesOrder[];
  readonly timeline: readonly TimelineEvent[];
  readonly projects: readonly ProjectListItem[];
  readonly plans: readonly SavedPlan[];
  readonly notifications: readonly CxNotification[];
};

export function loadBiSnapshot(): BiSnapshot {
  const sales = loadSalesWorkspace();
  return {
    opportunities: sales.opportunities,
    quotes: sales.quotes,
    orders: sales.orders,
    timeline: sales.timeline,
    projects: listProjects({ sort: "updated" }),
    plans: listSavedPlans(),
    notifications: listNotifications(),
  };
}
