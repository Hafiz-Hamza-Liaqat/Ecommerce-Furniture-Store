/**
 * SQL domain repository adapters — Phase 7B.
 */

export {
  createSqlOpportunityRepository,
  createSqlQuoteRepository,
  createSqlSalesOrderRepository,
} from "./sales-repos.js";

export {
  createSqlSupplierRepository,
  createSqlPurchaseRequisitionRepository,
  createSqlPurchaseOrderRepository,
} from "./procurement-repos.js";

export {
  createSqlInventoryRepository,
  createSqlWarehouseRepository,
  createSqlStorageLocationRepository,
  createSqlStockRepository,
  createSqlMovementRepository,
  createSqlInventoryLedgerRepository,
  createSqlBatchRepository,
  createSqlSerialNumberRepository,
} from "./inventory-repos.js";

export {
  createSqlFinancialAccountRepository,
  createSqlFinanceLedgerRepository,
  createSqlInvoiceRepository,
  createSqlPaymentRepository,
  createSqlCreditRepository,
  createSqlTaxProfileRepository,
} from "./finance-repos.js";

export {
  createSqlProjectRepository,
  createSqlResourceRepository,
  createSqlTeamRepository,
  createSqlTaskRepository,
  createSqlMilestoneRepository,
  createSqlScheduleRepository,
  createSqlWorkItemRepository,
} from "./projects-repos.js";

export {
  createSqlServiceRequestRepository,
  createSqlWorkOrderRepository,
  createSqlAppointmentRepository,
  createSqlTechnicianAssignmentRepository,
} from "./service-repos.js";

export {
  createSqlLeadRepository,
  createSqlContactRepository,
  createSqlCrmAccountRepository,
  createSqlActivityRepository,
  createSqlCampaignRepository,
  createSqlCommunicationRepository,
} from "./crm-repos.js";

export {
  createSqlCustomerRepository,
  createSqlProductRepository,
  createSqlOrganizationRepository,
  createSqlCatalogRepository,
  createSqlAddressRepository,
  createSqlCommerceContactRepository,
} from "./commerce-repos.js";

export {
  createSqlAssetRepository,
  createSqlAssetVersionRepository,
  createSqlFolderRepository,
  createSqlCollectionRepository,
  createSqlAttachmentRepository,
  createSqlDocumentRepository,
  createSqlDerivativeRepository,
  createSqlMetadataRepository,
} from "./dam-repos.js";

export {
  createSqlEmployeeRepository,
  createSqlDepartmentRepository,
  createSqlWorkforceRepository,
  createSqlAttendanceRepository,
  createSqlLeaveRepository,
  createSqlSkillsRepository,
  createSqlPayrollProfileRepository,
} from "./hr-repos.js";

export {
  createSqlContentRepository,
  createSqlMenuRepository,
  createSqlCategoryRepository,
  createSqlContentRevisionRepository,
  createSqlSeoMetadataRepository,
} from "./cms-repos.js";

export {
  createSqlBomRepository,
  createSqlProductionOrderRepository,
  createSqlRoutingRepository,
  createSqlWorkCenterRepository,
  createSqlOperationRepository,
} from "./manufacturing-repos.js";

export {
  createSqlNotificationRepository,
  createSqlNotificationTemplateRepository,
  createSqlNotificationPreferenceRepository,
  createSqlDeliveryAttemptRepository,
} from "./notifications-repos.js";

export {
  createSqlSearchIndexDefinitionRepository,
  createSqlSearchDocumentRepository,
  createSqlSearchRepository,
} from "./search-repos.js";

export {
  createSqlEntityAttachmentLinkRepository,
  createSqlEntityNoteRepository,
} from "./collaboration-repos.js";

export {
  createSqlBackgroundJobRepository,
  type SqlBackgroundJob,
  type SqlBackgroundJobRepository,
} from "./job-repos.js";

export {
  createSqlReportDefinitionRepository,
  createSqlReportTemplateRepository,
  createSqlReportExecutionRepository,
  createSqlReportScheduleRepository,
  createSqlDashboardRepository,
  createSqlSnapshotRepository,
  createSqlExportRequestRepository,
} from "./reporting-repos.js";
