/**
 * RC10.6 — CX Workspace Intelligence public API.
 */

export * from "./types";
export { loadBiSnapshot } from "./source";
export {
  filterSnapshot,
  listSalespersonOptions,
  listProjectOptions,
  listStyleOptions,
  listRoomTypeOptions,
  resolveDateWindow,
} from "./filter";
export {
  computeExecutive,
  computeSales,
  computeCrm,
  computeProduction,
  computeCustomers,
  computePlanner,
} from "./metrics";
export { buildBiReport, registerBiExtensionHooks } from "./derive";
export { exportBiReportCsv, exportBiReportPdf, printBiDashboard } from "./export";
export { CxAnalyticsPage } from "./ui/CxAnalyticsPage";
