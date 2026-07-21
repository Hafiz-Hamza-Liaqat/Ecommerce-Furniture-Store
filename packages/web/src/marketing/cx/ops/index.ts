/**
 * RC10.7 — Ops public API.
 */

export * from "./types";
export {
  OPS_STORAGE_KEY,
  loadOpsWorkspace,
  saveOpsWorkspace,
  clearOpsWorkspace,
  uid,
  nowIso,
} from "./store";
export {
  availableStock,
  listItems,
  getItem,
  createItem,
  updateItem,
  adjustStock,
  recordReturn,
  listSuppliers,
  createSupplier,
  updateSupplier,
  listBoms,
  createBom,
  updateBom,
  listProcurements,
  createProcurement,
  advanceProcurement,
  receiveProcurement,
  listProductionJobs,
  listSalesOrdersForProduction,
  createProductionJob,
  advanceProduction,
  releaseJobMaterials,
  listMovements,
  searchOps,
  registerOpsExtensionHooks,
} from "./service";
export { computeOpsAnalytics } from "./analytics";
export { OpsWorkflowPage } from "./ui/OpsWorkflowPage";
