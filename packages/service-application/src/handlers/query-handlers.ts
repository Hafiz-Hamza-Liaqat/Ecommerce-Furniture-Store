import type { QueryHandler } from "@afh/application";
import type { PageRequest } from "@afh/shared-kernel";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  Appointment,
  ServiceRequest,
  TechnicianAssignmentReference,
  WorkOrder,
  WorkOrderLine,
} from "@afh/service";
import { ServicePolicyActions, ServiceQueryTypes } from "../constants.js";
import type {
  GetAppointmentPayload,
  GetServiceHistoryPayload,
  GetServiceRequestPayload,
  GetServiceSummaryPayload,
  GetTechnicianAssignmentPayload,
  GetWorkOrderPayload,
  ServiceHistory,
  ServiceSummary,
} from "../queries/queries.js";
import {
  getAppointmentQueryValidator,
  getServiceHistoryQueryValidator,
  getServiceRequestQueryValidator,
  getServiceSummaryQueryValidator,
  getTechnicianAssignmentQueryValidator,
  getWorkOrderQueryValidator,
} from "../validators/validators.js";
import type { ServiceHandlerDeps } from "./deps.js";
import { companyResource, requireCompanyId } from "../support/support.js";

export function createGetServiceRequestHandler(
  deps: ServiceHandlerDeps,
): QueryHandler<GetServiceRequestPayload, ServiceRequest> {
  return {
    queryType: ServiceQueryTypes.GetServiceRequest,
    authorize(query) {
      return companyResource(
        "service_request",
        ServicePolicyActions.ServiceRequestRead,
        query.payload.companyId,
        query.payload.serviceRequestId,
      );
    },
    validate() {
      return getServiceRequestQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.serviceRequests.findById({
        companyId: scope.value,
        id: query.payload.serviceRequestId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Service request not found", {
            code: "service_request_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetWorkOrderHandler(
  deps: ServiceHandlerDeps,
): QueryHandler<
  GetWorkOrderPayload,
  { workOrder: WorkOrder; lines: readonly WorkOrderLine[] }
> {
  return {
    queryType: ServiceQueryTypes.GetWorkOrder,
    authorize(query) {
      return companyResource(
        "work_order",
        ServicePolicyActions.WorkOrderRead,
        query.payload.companyId,
        query.payload.workOrderId,
      );
    },
    validate() {
      return getWorkOrderQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.workOrders.findById({
        companyId: scope.value,
        id: query.payload.workOrderId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Work order not found", {
            code: "work_order_not_found",
          }),
        );
      }

      let lines: readonly WorkOrderLine[] = [];
      if (query.payload.includeLines !== false) {
        const listed = await deps.workOrders.listLines(
          scope.value,
          found.value.id,
        );
        if (!listed.ok) return listed;
        lines = listed.value;
      }

      return ok({ workOrder: found.value, lines });
    },
  };
}

export function createGetAppointmentHandler(
  deps: ServiceHandlerDeps,
): QueryHandler<GetAppointmentPayload, Appointment> {
  return {
    queryType: ServiceQueryTypes.GetAppointment,
    authorize(query) {
      return companyResource(
        "appointment",
        ServicePolicyActions.AppointmentRead,
        query.payload.companyId,
        query.payload.appointmentId,
      );
    },
    validate() {
      return getAppointmentQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.appointments.findById({
        companyId: scope.value,
        id: query.payload.appointmentId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Appointment not found", {
            code: "appointment_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetTechnicianAssignmentHandler(
  deps: ServiceHandlerDeps,
): QueryHandler<GetTechnicianAssignmentPayload, TechnicianAssignmentReference> {
  return {
    queryType: ServiceQueryTypes.GetTechnicianAssignment,
    authorize(query) {
      return companyResource(
        "technician_assignment",
        ServicePolicyActions.TechnicianAssignmentRead,
        query.payload.companyId,
        query.payload.assignmentId,
      );
    },
    validate() {
      return getTechnicianAssignmentQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.technicianAssignments.findById({
        companyId: scope.value,
        id: query.payload.assignmentId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Technician assignment not found", {
            code: "technician_assignment_not_found",
          }),
        );
      }
      return ok(found.value);
    },
  };
}

export function createGetServiceHistoryHandler(
  deps: ServiceHandlerDeps,
): QueryHandler<GetServiceHistoryPayload, ServiceHistory> {
  return {
    queryType: ServiceQueryTypes.GetServiceHistory,
    authorize(query) {
      return companyResource(
        "service_request",
        ServicePolicyActions.HistoryRead,
        query.payload.companyId,
        query.payload.serviceRequestId,
      );
    },
    validate() {
      return getServiceHistoryQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = await deps.serviceRequests.findById({
        companyId: scope.value,
        id: query.payload.serviceRequestId,
      });
      if (!request.ok) return request;
      if (!request.value) {
        return fail(
          new NotFoundError("Service request not found", {
            code: "service_request_not_found",
          }),
        );
      }

      const page: PageRequest = query.payload.page ?? {
        page: 1,
        pageSize: 500,
      };

      const workOrders = await deps.workOrders.listByServiceRequest(
        scope.value,
        query.payload.serviceRequestId,
        page,
      );
      if (!workOrders.ok) return workOrders;

      const appointments = await deps.appointments.listByCompany(
        scope.value,
        page,
      );
      if (!appointments.ok) return appointments;

      const relatedAppointments = appointments.value.items.filter(
        (a) => a.serviceRequestId === query.payload.serviceRequestId,
      );

      return ok({
        companyId: scope.value,
        serviceRequest: request.value,
        workOrders: workOrders.value.items,
        appointments: relatedAppointments,
      });
    },
  };
}

export function createGetServiceSummaryHandler(
  deps: ServiceHandlerDeps,
): QueryHandler<GetServiceSummaryPayload, ServiceSummary> {
  return {
    queryType: ServiceQueryTypes.GetServiceSummary,
    authorize(query) {
      return companyResource(
        "service_request",
        ServicePolicyActions.SummaryRead,
        query.payload.companyId,
        query.payload.serviceRequestId,
      );
    },
    validate() {
      return getServiceSummaryQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = await deps.serviceRequests.findById({
        companyId: scope.value,
        id: query.payload.serviceRequestId,
      });
      if (!request.ok) return request;
      if (!request.value) {
        return fail(
          new NotFoundError("Service request not found", {
            code: "service_request_not_found",
          }),
        );
      }

      const page: PageRequest = query.payload.page ?? {
        page: 1,
        pageSize: 500,
      };

      const workOrders = await deps.workOrders.listByServiceRequest(
        scope.value,
        query.payload.serviceRequestId,
        page,
      );
      if (!workOrders.ok) return workOrders;

      const appointments = await deps.appointments.listByCompany(
        scope.value,
        page,
      );
      if (!appointments.ok) return appointments;

      const relatedAppointments = appointments.value.items.filter(
        (a) => a.serviceRequestId === query.payload.serviceRequestId,
      );

      return ok({
        companyId: scope.value,
        serviceRequestId: query.payload.serviceRequestId,
        status: request.value.status,
        priority: request.value.priority,
        workOrderCount: workOrders.value.items.length,
        openWorkOrderIds: workOrders.value.items
          .filter((w) => w.status !== "completed" && w.status !== "cancelled")
          .map((w) => w.id),
        completedWorkOrderIds: workOrders.value.items
          .filter((w) => w.status === "completed")
          .map((w) => w.id),
        appointmentCount: relatedAppointments.length,
        scheduledAppointmentIds: relatedAppointments
          .filter(
            (a) =>
              a.status === "scheduled" ||
              a.status === "confirmed" ||
              a.status === "in_progress",
          )
          .map((a) => a.id),
      });
    },
  };
}
