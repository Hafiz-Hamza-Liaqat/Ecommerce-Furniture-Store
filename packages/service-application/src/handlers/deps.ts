import type { OutboxStore } from "@afh/persistence";
import type { SecurityAuditService } from "@afh/identity";
import type {
  AppointmentRepository,
  ServiceRequestRepository,
  TechnicianAssignmentRepository,
  WorkOrderRepository,
} from "@afh/service";

export type ServiceHandlerDeps = {
  readonly serviceRequests: ServiceRequestRepository;
  readonly workOrders: WorkOrderRepository;
  readonly appointments: AppointmentRepository;
  readonly technicianAssignments: TechnicianAssignmentRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
};
