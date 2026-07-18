/**
 * Service application composition root.
 * Registers handlers into the Phase 5B HandlerRegistry. No HTTP/APIs.
 */

import { HandlerRegistry } from "@afh/application";
import type { OutboxStore } from "@afh/persistence";
import type { SecurityAuditService } from "@afh/identity";
import type {
  AppointmentRepository,
  ServiceRequestRepository,
  TechnicianAssignmentRepository,
  WorkOrderRepository,
} from "@afh/service";
import {
  createAssignTechnicianHandler,
  createCloseServiceRequestHandler,
  createCompleteWorkOrderHandler,
  createCreateServiceRequestHandler,
  createCreateWorkOrderHandler,
  createGetAppointmentHandler,
  createGetServiceHistoryHandler,
  createGetServiceRequestHandler,
  createGetServiceSummaryHandler,
  createGetTechnicianAssignmentHandler,
  createGetWorkOrderHandler,
  createListAppointmentHandler,
  createListServiceRequestHandler,
  createListTechnicianAssignmentHandler,
  createListWorkOrderHandler,
  createReassignTechnicianHandler,
  createRescheduleAppointmentHandler,
  createScheduleAppointmentHandler,
  createUpdateServiceRequestHandler,
  createUpdateWorkOrderHandler,
} from "../handlers/index.js";
import type { ServiceHandlerDeps } from "../handlers/deps.js";

export type CreateServiceApplicationOptions = {
  readonly serviceRequests: ServiceRequestRepository;
  readonly workOrders: WorkOrderRepository;
  readonly appointments: AppointmentRepository;
  readonly technicianAssignments: TechnicianAssignmentRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type ServiceApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: ServiceHandlerDeps;
};

/**
 * Wires Service command/query handlers into a HandlerRegistry.
 * Host then passes `handlers` to `createApplicationRuntime({ handlers, ... })`.
 */
export function createServiceApplication(
  options: CreateServiceApplicationOptions,
): ServiceApplication {
  const deps: ServiceHandlerDeps = {
    serviceRequests: options.serviceRequests,
    workOrders: options.workOrders,
    appointments: options.appointments,
    technicianAssignments: options.technicianAssignments,
    outbox: options.outbox,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();

  handlers.registerCommand(createCreateServiceRequestHandler(deps));
  handlers.registerCommand(createUpdateServiceRequestHandler(deps));
  handlers.registerCommand(createAssignTechnicianHandler(deps));
  handlers.registerCommand(createReassignTechnicianHandler(deps));
  handlers.registerCommand(createScheduleAppointmentHandler(deps));
  handlers.registerCommand(createRescheduleAppointmentHandler(deps));
  handlers.registerCommand(createCreateWorkOrderHandler(deps));
  handlers.registerCommand(createUpdateWorkOrderHandler(deps));
  handlers.registerCommand(createCompleteWorkOrderHandler(deps));
  handlers.registerCommand(createCloseServiceRequestHandler(deps));

  handlers.registerQuery(createGetServiceRequestHandler(deps));
  handlers.registerQuery(createGetWorkOrderHandler(deps));
  handlers.registerQuery(createGetAppointmentHandler(deps));
  handlers.registerQuery(createGetTechnicianAssignmentHandler(deps));
  handlers.registerQuery(createGetServiceHistoryHandler(deps));
  handlers.registerQuery(createGetServiceSummaryHandler(deps));
  handlers.registerQuery(createListServiceRequestHandler(deps));
  handlers.registerQuery(createListWorkOrderHandler(deps));
  handlers.registerQuery(createListAppointmentHandler(deps));
  handlers.registerQuery(createListTechnicianAssignmentHandler(deps));

  return { handlers, deps };
}
