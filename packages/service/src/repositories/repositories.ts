/**
 * Service repository interfaces only — no persistence implementations.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type { ServiceRequest } from "../request/request.js";
import type { WorkOrder, WorkOrderLine } from "../work-order/work-order.js";
import type { Appointment } from "../appointment/appointment.js";
import type { TechnicianAssignmentReference } from "../technician/technician.js";

export type CompanyScopedId = {
  readonly companyId: string;
  readonly id: string;
};

export interface ServiceRequestRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<ServiceRequest | null, PlatformError>>;
  save(request: ServiceRequest): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<ServiceRequest>, PlatformError>>;
}

export interface WorkOrderRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<WorkOrder | null, PlatformError>>;
  save(workOrder: WorkOrder): Promise<Result<void, PlatformError>>;
  saveLine(line: WorkOrderLine): Promise<Result<void, PlatformError>>;
  listLines(
    companyId: string,
    workOrderId: string,
  ): Promise<Result<readonly WorkOrderLine[], PlatformError>>;
  listByServiceRequest(
    companyId: string,
    serviceRequestId: string,
    page?: PageRequest,
  ): Promise<Result<Page<WorkOrder>, PlatformError>>;
  /**
   * RC7.2g — company-scoped bounded candidates for ListWorkOrder.
   * Repository contract completion for RC7.1 authorized-list; not a new capability.
   */
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<WorkOrder>, PlatformError>>;
}

export interface AppointmentRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Appointment | null, PlatformError>>;
  save(appointment: Appointment): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Appointment>, PlatformError>>;
}

export interface TechnicianAssignmentRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<TechnicianAssignmentReference | null, PlatformError>>;
  save(
    assignment: TechnicianAssignmentReference,
  ): Promise<Result<void, PlatformError>>;
  /**
   * RC7.2g — company-scoped bounded candidates for ListTechnicianAssignment.
   * Repository contract completion for RC7.1 authorized-list; not a new capability.
   */
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<TechnicianAssignmentReference>, PlatformError>>;
}
