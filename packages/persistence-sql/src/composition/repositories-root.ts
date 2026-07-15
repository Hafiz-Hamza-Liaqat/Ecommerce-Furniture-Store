/**
 * Composes all SQL domain repositories for enterprise hosting.
 * Shape covers API EnterpriseModuleRepositories plus remaining domains.
 */

import type { Clock } from "@afh/shared-kernel";
import type {
  AddressRepository,
  CatalogRepository,
  ContactRepository as CommerceContactRepository,
  CustomerRepository,
  OrganizationRepository,
  ProductRepository,
} from "@afh/commerce";
import type {
  CategoryRepository,
  ContentRepository,
  ContentRevisionRepository,
  MenuRepository,
  SeoMetadataRepository,
} from "@afh/cms";
import type {
  AccountRepository as CrmAccountRepository,
  ActivityRepository,
  CampaignRepository,
  CommunicationRepository,
  ContactRepository as CrmContactRepository,
  LeadRepository,
} from "@afh/crm";
import type {
  AssetRepository,
  AssetVersionRepository,
  AttachmentRepository,
  CollectionRepository,
  DerivativeRepository,
  DocumentRepository,
  FolderRepository,
  MetadataRepository,
} from "@afh/dam";
import type {
  AccountRepository as FinanceAccountRepository,
  CreditRepository,
  InvoiceRepository,
  LedgerRepository as FinanceLedgerRepository,
  PaymentRepository,
  TaxProfileRepository,
} from "@afh/finance";
import type {
  AttendanceRepository,
  DepartmentRepository,
  EmployeeRepository,
  LeaveRepository,
  PayrollProfileRepository,
  SkillsRepository,
  WorkforceRepository,
} from "@afh/hr";
import type {
  BatchRepository,
  InventoryRepository,
  LedgerRepository as InventoryLedgerRepository,
  MovementRepository,
  SerialNumberRepository,
  StockRepository,
  StorageLocationRepository,
  WarehouseRepository,
} from "@afh/inventory";
import type {
  BomRepository,
  OperationRepository,
  ProductionOrderRepository,
  RoutingRepository,
  WorkCenterRepository,
} from "@afh/manufacturing";
import type {
  DeliveryAttemptRepository,
  NotificationPreferenceRepository,
  NotificationRepository,
  NotificationTemplateRepository,
} from "@afh/notifications";
import type {
  PurchaseOrderRepository,
  PurchaseRequisitionRepository,
  SupplierRepository,
} from "@afh/procurement";
import type {
  MilestoneRepository,
  ProjectRepository,
  ResourceRepository,
  ScheduleRepository,
  TaskRepository,
  TeamRepository,
  WorkItemRepository,
} from "@afh/projects";
import type {
  DashboardRepository,
  ExportRequestRepository,
  ReportDefinitionRepository,
  ReportExecutionRepository,
  ReportScheduleRepository,
  ReportTemplateRepository,
  SnapshotRepository,
} from "@afh/reporting";
import type {
  OpportunityRepository,
  QuoteRepository,
  SalesOrderRepository,
} from "@afh/sales";
import type {
  SearchDocumentRepository,
  SearchIndexDefinitionRepository,
  SearchRepository,
} from "@afh/search";
import type {
  AppointmentRepository,
  ServiceRequestRepository,
  TechnicianAssignmentRepository,
  WorkOrderRepository,
} from "@afh/service";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import {
  createSqlAddressRepository,
  createSqlAppointmentRepository,
  createSqlAssetRepository,
  createSqlAssetVersionRepository,
  createSqlAttachmentRepository,
  createSqlAttendanceRepository,
  createSqlActivityRepository,
  createSqlBatchRepository,
  createSqlBomRepository,
  createSqlCampaignRepository,
  createSqlCatalogRepository,
  createSqlCategoryRepository,
  createSqlCollectionRepository,
  createSqlCommerceContactRepository,
  createSqlCommunicationRepository,
  createSqlContactRepository,
  createSqlContentRepository,
  createSqlContentRevisionRepository,
  createSqlCreditRepository,
  createSqlCrmAccountRepository,
  createSqlCustomerRepository,
  createSqlDashboardRepository,
  createSqlDeliveryAttemptRepository,
  createSqlDepartmentRepository,
  createSqlDerivativeRepository,
  createSqlDocumentRepository,
  createSqlEmployeeRepository,
  createSqlExportRequestRepository,
  createSqlFinanceLedgerRepository,
  createSqlFinancialAccountRepository,
  createSqlFolderRepository,
  createSqlInventoryLedgerRepository,
  createSqlInventoryRepository,
  createSqlInvoiceRepository,
  createSqlLeadRepository,
  createSqlLeaveRepository,
  createSqlMenuRepository,
  createSqlMetadataRepository,
  createSqlMilestoneRepository,
  createSqlMovementRepository,
  createSqlNotificationPreferenceRepository,
  createSqlNotificationRepository,
  createSqlNotificationTemplateRepository,
  createSqlOperationRepository,
  createSqlOpportunityRepository,
  createSqlOrganizationRepository,
  createSqlPaymentRepository,
  createSqlPayrollProfileRepository,
  createSqlProductRepository,
  createSqlProductionOrderRepository,
  createSqlProjectRepository,
  createSqlPurchaseOrderRepository,
  createSqlPurchaseRequisitionRepository,
  createSqlQuoteRepository,
  createSqlReportDefinitionRepository,
  createSqlReportExecutionRepository,
  createSqlReportScheduleRepository,
  createSqlReportTemplateRepository,
  createSqlResourceRepository,
  createSqlRoutingRepository,
  createSqlSalesOrderRepository,
  createSqlScheduleRepository,
  createSqlSearchDocumentRepository,
  createSqlSearchIndexDefinitionRepository,
  createSqlSearchRepository,
  createSqlSeoMetadataRepository,
  createSqlSerialNumberRepository,
  createSqlServiceRequestRepository,
  createSqlSkillsRepository,
  createSqlSnapshotRepository,
  createSqlStockRepository,
  createSqlStorageLocationRepository,
  createSqlSupplierRepository,
  createSqlTaskRepository,
  createSqlTaxProfileRepository,
  createSqlTeamRepository,
  createSqlTechnicianAssignmentRepository,
  createSqlWarehouseRepository,
  createSqlWorkCenterRepository,
  createSqlWorkItemRepository,
  createSqlWorkOrderRepository,
  createSqlWorkforceRepository,
} from "../repositories/index.js";

export type SqlDomainRepositories = {
  readonly sales: {
    readonly opportunities: OpportunityRepository;
    readonly quotes: QuoteRepository;
    readonly orders: SalesOrderRepository;
  };
  readonly procurement: {
    readonly suppliers: SupplierRepository;
    readonly requisitions: PurchaseRequisitionRepository;
    readonly purchaseOrders: PurchaseOrderRepository;
  };
  readonly inventory: {
    readonly items: InventoryRepository;
    readonly warehouses: WarehouseRepository;
    readonly locations: StorageLocationRepository;
    readonly stock: StockRepository;
    readonly movements: MovementRepository;
    readonly ledger: InventoryLedgerRepository;
    readonly batches: BatchRepository;
    readonly serials: SerialNumberRepository;
  };
  readonly finance: {
    readonly accounts: FinanceAccountRepository;
    readonly invoices: InvoiceRepository;
    readonly payments: PaymentRepository;
    readonly ledgers: FinanceLedgerRepository;
    readonly credits: CreditRepository;
    readonly taxProfiles: TaxProfileRepository;
  };
  readonly projects: {
    readonly projects: ProjectRepository;
    readonly tasks: TaskRepository;
    readonly milestones: MilestoneRepository;
    readonly resources: ResourceRepository;
    readonly teams: TeamRepository;
    readonly schedules: ScheduleRepository;
    readonly workItems: WorkItemRepository;
  };
  readonly service: {
    readonly serviceRequests: ServiceRequestRepository;
    readonly workOrders: WorkOrderRepository;
    readonly appointments: AppointmentRepository;
    readonly technicianAssignments: TechnicianAssignmentRepository;
  };
  readonly crm: {
    readonly leads: LeadRepository;
    readonly contacts: CrmContactRepository;
    readonly accounts: CrmAccountRepository;
    readonly activities: ActivityRepository;
    readonly communications: CommunicationRepository;
    readonly campaigns: CampaignRepository;
  };
  /** EnterpriseModuleRepositories.damAssets */
  readonly damAssets: AssetRepository;
  readonly dam: {
    readonly assets: AssetRepository;
    readonly versions: AssetVersionRepository;
    readonly folders: FolderRepository;
    readonly collections: CollectionRepository;
    readonly attachments: AttachmentRepository;
    readonly documents: DocumentRepository;
    readonly derivatives: DerivativeRepository;
    readonly metadata: MetadataRepository;
  };
  readonly commerce: {
    readonly customers: CustomerRepository;
    readonly products: ProductRepository;
    readonly organizations: OrganizationRepository;
    readonly catalogs: CatalogRepository;
    readonly addresses: AddressRepository;
    readonly contacts: CommerceContactRepository;
  };
  readonly hr: {
    readonly employees: EmployeeRepository;
    readonly departments: DepartmentRepository;
    readonly workforce: WorkforceRepository;
    readonly attendance: AttendanceRepository;
    readonly leave: LeaveRepository;
    readonly skills: SkillsRepository;
    readonly payrollProfiles: PayrollProfileRepository;
  };
  readonly cms: {
    readonly content: ContentRepository;
    readonly menus: MenuRepository;
    readonly categories: CategoryRepository;
    readonly revisions: ContentRevisionRepository;
    readonly seo: SeoMetadataRepository;
  };
  readonly manufacturing: {
    readonly boms: BomRepository;
    readonly productionOrders: ProductionOrderRepository;
    readonly routings: RoutingRepository;
    readonly workCenters: WorkCenterRepository;
    readonly operations: OperationRepository;
  };
  readonly notifications: {
    readonly notifications: NotificationRepository;
    readonly templates: NotificationTemplateRepository;
    readonly preferences: NotificationPreferenceRepository;
    readonly deliveryAttempts: DeliveryAttemptRepository;
  };
  readonly search: {
    readonly indexDefinitions: SearchIndexDefinitionRepository;
    readonly documents: SearchDocumentRepository;
    readonly search: SearchRepository;
  };
  readonly reporting: {
    readonly definitions: ReportDefinitionRepository;
    readonly templates: ReportTemplateRepository;
    readonly executions: ReportExecutionRepository;
    readonly schedules: ReportScheduleRepository;
    readonly dashboards: DashboardRepository;
    readonly snapshots: SnapshotRepository;
    readonly exports: ExportRequestRepository;
  };
};

/**
 * Builds the full SQL repository graph for enterprise composition.
 * Pass `sales`…`crm` + `damAssets` into API `EnterpriseModuleRepositories`.
 */
export function createSqlEnterpriseRepositories(
  client: SqliteDatabaseClient,
  clock: Clock,
): SqlDomainRepositories {
  const damAssets = createSqlAssetRepository(client, clock);

  return {
    sales: {
      opportunities: createSqlOpportunityRepository(client, clock),
      quotes: createSqlQuoteRepository(client, clock),
      orders: createSqlSalesOrderRepository(client, clock),
    },
    procurement: {
      suppliers: createSqlSupplierRepository(client, clock),
      requisitions: createSqlPurchaseRequisitionRepository(client, clock),
      purchaseOrders: createSqlPurchaseOrderRepository(client, clock),
    },
    inventory: {
      items: createSqlInventoryRepository(client, clock),
      warehouses: createSqlWarehouseRepository(client, clock),
      locations: createSqlStorageLocationRepository(client, clock),
      stock: createSqlStockRepository(client, clock),
      movements: createSqlMovementRepository(client, clock),
      ledger: createSqlInventoryLedgerRepository(client, clock),
      batches: createSqlBatchRepository(client, clock),
      serials: createSqlSerialNumberRepository(client, clock),
    },
    finance: {
      accounts: createSqlFinancialAccountRepository(client, clock),
      invoices: createSqlInvoiceRepository(client, clock),
      payments: createSqlPaymentRepository(client, clock),
      ledgers: createSqlFinanceLedgerRepository(client, clock),
      credits: createSqlCreditRepository(client, clock),
      taxProfiles: createSqlTaxProfileRepository(client, clock),
    },
    projects: {
      projects: createSqlProjectRepository(client, clock),
      tasks: createSqlTaskRepository(client, clock),
      milestones: createSqlMilestoneRepository(client, clock),
      resources: createSqlResourceRepository(client, clock),
      teams: createSqlTeamRepository(client, clock),
      schedules: createSqlScheduleRepository(client, clock),
      workItems: createSqlWorkItemRepository(client, clock),
    },
    service: {
      serviceRequests: createSqlServiceRequestRepository(client, clock),
      workOrders: createSqlWorkOrderRepository(client, clock),
      appointments: createSqlAppointmentRepository(client, clock),
      technicianAssignments: createSqlTechnicianAssignmentRepository(
        client,
        clock,
      ),
    },
    crm: {
      leads: createSqlLeadRepository(client, clock),
      contacts: createSqlContactRepository(client, clock),
      accounts: createSqlCrmAccountRepository(client, clock),
      activities: createSqlActivityRepository(client, clock),
      communications: createSqlCommunicationRepository(client, clock),
      campaigns: createSqlCampaignRepository(client, clock),
    },
    damAssets,
    dam: {
      assets: damAssets,
      versions: createSqlAssetVersionRepository(client, clock),
      folders: createSqlFolderRepository(client, clock),
      collections: createSqlCollectionRepository(client, clock),
      attachments: createSqlAttachmentRepository(client, clock),
      documents: createSqlDocumentRepository(client, clock),
      derivatives: createSqlDerivativeRepository(client, clock),
      metadata: createSqlMetadataRepository(client, clock),
    },
    commerce: {
      customers: createSqlCustomerRepository(client, clock),
      products: createSqlProductRepository(client, clock),
      organizations: createSqlOrganizationRepository(client, clock),
      catalogs: createSqlCatalogRepository(client, clock),
      addresses: createSqlAddressRepository(client, clock),
      contacts: createSqlCommerceContactRepository(client, clock),
    },
    hr: {
      employees: createSqlEmployeeRepository(client, clock),
      departments: createSqlDepartmentRepository(client, clock),
      workforce: createSqlWorkforceRepository(client, clock),
      attendance: createSqlAttendanceRepository(client, clock),
      leave: createSqlLeaveRepository(client, clock),
      skills: createSqlSkillsRepository(client, clock),
      payrollProfiles: createSqlPayrollProfileRepository(client, clock),
    },
    cms: {
      content: createSqlContentRepository(client, clock),
      menus: createSqlMenuRepository(client, clock),
      categories: createSqlCategoryRepository(client, clock),
      revisions: createSqlContentRevisionRepository(client, clock),
      seo: createSqlSeoMetadataRepository(client, clock),
    },
    manufacturing: {
      boms: createSqlBomRepository(client, clock),
      productionOrders: createSqlProductionOrderRepository(client, clock),
      routings: createSqlRoutingRepository(client, clock),
      workCenters: createSqlWorkCenterRepository(client, clock),
      operations: createSqlOperationRepository(client, clock),
    },
    notifications: {
      notifications: createSqlNotificationRepository(client, clock),
      templates: createSqlNotificationTemplateRepository(client, clock),
      preferences: createSqlNotificationPreferenceRepository(client, clock),
      deliveryAttempts: createSqlDeliveryAttemptRepository(client, clock),
    },
    search: {
      indexDefinitions: createSqlSearchIndexDefinitionRepository(client, clock),
      documents: createSqlSearchDocumentRepository(client, clock),
      search: createSqlSearchRepository(client, clock),
    },
    reporting: {
      definitions: createSqlReportDefinitionRepository(client, clock),
      templates: createSqlReportTemplateRepository(client, clock),
      executions: createSqlReportExecutionRepository(client, clock),
      schedules: createSqlReportScheduleRepository(client, clock),
      dashboards: createSqlDashboardRepository(client, clock),
      snapshots: createSqlSnapshotRepository(client, clock),
      exports: createSqlExportRequestRepository(client, clock),
    },
  };
}
