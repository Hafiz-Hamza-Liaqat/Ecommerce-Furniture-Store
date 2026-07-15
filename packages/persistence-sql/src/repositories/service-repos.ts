/**
 * SQL adapters for Service domain repositories.
 */

import { ok, type Clock, type PlatformError, type Result } from "@afh/shared-kernel";
import type {
  Appointment,
  AppointmentRepository,
  ServiceRequest,
  ServiceRequestRepository,
  TechnicianAssignmentReference,
  TechnicianAssignmentRepository,
  WorkOrder,
  WorkOrderLine,
  WorkOrderRepository,
} from "@afh/service";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";
import {
  SqlDocumentRepository,
  type CompanyScopedId,
} from "../mapping/document-repository.js";

type AssignmentDoc = TechnicianAssignmentReference & { readonly id: string };

function toAssignmentDoc(
  assignment: TechnicianAssignmentReference,
): AssignmentDoc {
  return { ...assignment, id: assignment.assignmentId };
}

function fromAssignmentDoc(
  doc: AssignmentDoc | null,
): TechnicianAssignmentReference | null {
  if (!doc) return null;
  const { id, ...rest } = doc;
  void id;
  return rest;
}

export function createSqlServiceRequestRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): ServiceRequestRepository {
  const docs = new SqlDocumentRepository<ServiceRequest>(
    client,
    "service.service_request",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlWorkOrderRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): WorkOrderRepository {
  const docs = new SqlDocumentRepository<WorkOrder>(
    client,
    "service.work_order",
    clock,
  );
  const lines = new SqlDocumentRepository<WorkOrderLine>(
    client,
    "service.work_order_line",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (workOrder) => docs.save(workOrder, workOrder.serviceRequestId),
    saveLine: (line) => lines.save(line, line.workOrderId),
    listLines: (companyId, workOrderId) =>
      lines.listByParent(companyId, workOrderId),
    listByServiceRequest: (companyId, serviceRequestId, page) =>
      docs.listByParentScoped(companyId, serviceRequestId, page),
  };
}

export function createSqlAppointmentRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): AppointmentRepository {
  const docs = new SqlDocumentRepository<Appointment>(
    client,
    "service.appointment",
    clock,
  );
  return {
    findById: (key) => docs.findById(key),
    save: (e) => docs.save(e),
    listByCompany: (companyId, page) => docs.listByCompany(companyId, page),
  };
}

export function createSqlTechnicianAssignmentRepository(
  client: SqliteDatabaseClient,
  clock: Clock,
): TechnicianAssignmentRepository {
  const docs = new SqlDocumentRepository<AssignmentDoc>(
    client,
    "service.technician_assignment",
    clock,
  );
  return {
    findById: async (
      key: CompanyScopedId,
    ): Promise<Result<TechnicianAssignmentReference | null, PlatformError>> => {
      const found = await docs.findById(key);
      if (!found.ok) return found;
      return ok(fromAssignmentDoc(found.value));
    },
    save: (assignment) =>
      docs.save(toAssignmentDoc(assignment), assignment.workOrderId),
  };
}
