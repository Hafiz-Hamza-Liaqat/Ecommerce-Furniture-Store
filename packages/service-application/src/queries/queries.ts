/**
 * Service application queries — no transport DTOs.
 */

import type { ListQueryRequest, PageRequest } from "@afh/shared-kernel";
import type {
  Appointment,
  ServiceRequest,
  TechnicianAssignmentReference,
  WorkOrder,
} from "@afh/service";
import { ServiceQueryTypes } from "../constants.js";

/** RC7.2g — shared List* envelope (companyId + optional criteria / q). */
export type ListServiceRequestPayload = ListQueryRequest;
export type ListWorkOrderPayload = ListQueryRequest;
export type ListAppointmentPayload = ListQueryRequest;
export type ListTechnicianAssignmentPayload = ListQueryRequest;

export type GetServiceRequestPayload = {
  readonly companyId: string;
  readonly serviceRequestId: string;
};

export type GetWorkOrderPayload = {
  readonly companyId: string;
  readonly workOrderId: string;
  readonly includeLines?: boolean;
};

export type GetAppointmentPayload = {
  readonly companyId: string;
  readonly appointmentId: string;
};

export type GetTechnicianAssignmentPayload = {
  readonly companyId: string;
  readonly assignmentId: string;
};

export type GetServiceHistoryPayload = {
  readonly companyId: string;
  readonly serviceRequestId: string;
  readonly page?: PageRequest;
};

export type GetServiceSummaryPayload = {
  readonly companyId: string;
  readonly serviceRequestId: string;
  readonly page?: PageRequest;
};

export type ServiceHistory = {
  readonly companyId: string;
  readonly serviceRequest: ServiceRequest;
  readonly workOrders: readonly WorkOrder[];
  readonly appointments: readonly Appointment[];
};

export type ServiceSummary = {
  readonly companyId: string;
  readonly serviceRequestId: string;
  readonly status: ServiceRequest["status"];
  readonly priority: ServiceRequest["priority"];
  readonly workOrderCount: number;
  readonly openWorkOrderIds: readonly string[];
  readonly completedWorkOrderIds: readonly string[];
  readonly appointmentCount: number;
  readonly scheduledAppointmentIds: readonly string[];
};

export type { TechnicianAssignmentReference };

export { ServiceQueryTypes };
