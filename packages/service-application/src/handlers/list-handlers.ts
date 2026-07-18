/**
 * RC7.2g — Service List* query handlers.
 * Authorization totals and paging via buildAuthorizedListPage (ADR D56).
 */

import type { QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { Page } from "@afh/shared-kernel";
import type {
  Appointment,
  ServiceRequest,
  TechnicianAssignmentReference,
  WorkOrder,
} from "@afh/service";
import { ServicePolicyActions, ServiceQueryTypes } from "../constants.js";
import type {
  ListAppointmentPayload,
  ListServiceRequestPayload,
  ListTechnicianAssignmentPayload,
  ListWorkOrderPayload,
} from "../queries/queries.js";
import {
  listAppointmentQueryValidator,
  listServiceRequestQueryValidator,
  listTechnicianAssignmentQueryValidator,
  listWorkOrderQueryValidator,
} from "../validators/validators.js";
import type { ServiceHandlerDeps } from "./deps.js";
import { companyResource, requireCompanyId } from "../support/support.js";
import { createServiceListCandidateFetcher } from "./list-support.js";

export {
  APPOINTMENT_FILTER_FIELDS,
  APPOINTMENT_SORT_FIELDS,
  SERVICE_REQUEST_FILTER_FIELDS,
  SERVICE_REQUEST_SORT_FIELDS,
  TECHNICIAN_ASSIGNMENT_FILTER_FIELDS,
  TECHNICIAN_ASSIGNMENT_SORT_FIELDS,
  WORK_ORDER_FILTER_FIELDS,
  WORK_ORDER_SORT_FIELDS,
} from "../list-fields.js";

export function createListServiceRequestHandler(
  deps: ServiceHandlerDeps,
): QueryHandler<ListServiceRequestPayload, Page<ServiceRequest>> {
  return {
    queryType: ServiceQueryTypes.ListServiceRequest,
    authorize(query, ctx) {
      return companyResource(
        "service_request",
        ServicePolicyActions.ServiceRequestRead,
        query.payload.companyId,
        null,
        principalListScope(
          ctx.principal,
          ServicePolicyActions.ServiceRequestRead,
        ),
      );
    },
    validate() {
      return listServiceRequestQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<ServiceRequest>({
        ctx,
        action: ServicePolicyActions.ServiceRequestRead,
        resourceType: "service_request",
        request,
        toScope: (r) => ({
          id: r.id,
          companyId: r.companyId,
          ownerUserId: r.requestedByUserId,
          attributes: {
            customerId: r.customerId,
            projectId: r.projectId,
          },
        }),
        fetchCandidates: createServiceListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.serviceRequests.listByCompany(companyId, page),
          request,
          searchFields: ["title", "number"],
        }),
      });
    },
  };
}

export function createListWorkOrderHandler(
  deps: ServiceHandlerDeps,
): QueryHandler<ListWorkOrderPayload, Page<WorkOrder>> {
  return {
    queryType: ServiceQueryTypes.ListWorkOrder,
    authorize(query, ctx) {
      return companyResource(
        "work_order",
        ServicePolicyActions.WorkOrderRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, ServicePolicyActions.WorkOrderRead),
      );
    },
    validate() {
      return listWorkOrderQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<WorkOrder>({
        ctx,
        action: ServicePolicyActions.WorkOrderRead,
        resourceType: "work_order",
        request,
        toScope: (w) => ({
          id: w.id,
          companyId: w.companyId,
          attributes: {
            serviceRequestId: w.serviceRequestId,
            projectId: w.projectId,
          },
        }),
        fetchCandidates: createServiceListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.workOrders.listByCompany(companyId, page),
          request,
          searchFields: ["number", "notes"],
        }),
      });
    },
  };
}

export function createListAppointmentHandler(
  deps: ServiceHandlerDeps,
): QueryHandler<ListAppointmentPayload, Page<Appointment>> {
  return {
    queryType: ServiceQueryTypes.ListAppointment,
    authorize(query, ctx) {
      return companyResource(
        "appointment",
        ServicePolicyActions.AppointmentRead,
        query.payload.companyId,
        null,
        principalListScope(
          ctx.principal,
          ServicePolicyActions.AppointmentRead,
        ),
      );
    },
    validate() {
      return listAppointmentQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Appointment>({
        ctx,
        action: ServicePolicyActions.AppointmentRead,
        resourceType: "appointment",
        request,
        toScope: (a) => ({
          id: a.id,
          companyId: a.companyId,
          attributes: {
            serviceRequestId: a.serviceRequestId,
            workOrderId: a.workOrderId,
            projectId: a.projectId,
          },
        }),
        fetchCandidates: createServiceListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.appointments.listByCompany(companyId, page),
          request,
          searchFields: ["notes"],
        }),
      });
    },
  };
}

export function createListTechnicianAssignmentHandler(
  deps: ServiceHandlerDeps,
): QueryHandler<
  ListTechnicianAssignmentPayload,
  Page<TechnicianAssignmentReference>
> {
  return {
    queryType: ServiceQueryTypes.ListTechnicianAssignment,
    authorize(query, ctx) {
      return companyResource(
        "technician_assignment",
        ServicePolicyActions.TechnicianAssignmentRead,
        query.payload.companyId,
        null,
        principalListScope(
          ctx.principal,
          ServicePolicyActions.TechnicianAssignmentRead,
        ),
      );
    },
    validate() {
      return listTechnicianAssignmentQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<TechnicianAssignmentReference>({
        ctx,
        action: ServicePolicyActions.TechnicianAssignmentRead,
        resourceType: "technician_assignment",
        request,
        toScope: (t) => ({
          id: t.assignmentId,
          companyId: t.companyId,
          ownerUserId: t.technician.userId,
          attributes: {
            employeeId: t.technician.employeeId,
            workOrderId: t.workOrderId,
            appointmentId: t.appointmentId,
            teamId: t.team?.teamId ?? null,
          },
        }),
        fetchCandidates: createServiceListCandidateFetcher({
          listByCompany: (companyId, page) =>
            deps.technicianAssignments.listByCompany(companyId, page),
          request,
          searchFields: ["workOrderId", "appointmentId"],
        }),
      });
    },
  };
}
