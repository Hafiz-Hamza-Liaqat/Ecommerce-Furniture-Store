/**
 * Service application commands — intent only.
 */

import type { ServicePriority } from "@afh/service";
import { ServiceCommandTypes } from "../constants.js";

export type CreateServiceRequestPayload = {
  readonly companyId: string;
  readonly number: string;
  readonly title: string;
  readonly description?: string | null;
  readonly priority?: ServicePriority;
  readonly categoryId?: string | null;
  readonly categoryCode?: string | null;
  readonly categoryName?: string | null;
  readonly customerId?: string | null;
  readonly crmContactId?: string | null;
  readonly crmAccountId?: string | null;
  readonly projectId?: string | null;
  readonly salesOrderId?: string | null;
  readonly siteAddressId?: string | null;
  readonly requestedByUserId?: string | null;
};

export type UpdateServiceRequestPayload = {
  readonly companyId: string;
  readonly serviceRequestId: string;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly priority?: ServicePriority | null;
  readonly categoryId?: string | null;
  readonly categoryCode?: string | null;
  readonly categoryName?: string | null;
  readonly customerId?: string | null;
  readonly crmContactId?: string | null;
  readonly crmAccountId?: string | null;
  readonly projectId?: string | null;
  readonly salesOrderId?: string | null;
  readonly siteAddressId?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type AssignTechnicianPayload = {
  readonly companyId: string;
  readonly employeeId: string;
  readonly workOrderId?: string | null;
  readonly appointmentId?: string | null;
  readonly userId?: string | null;
  readonly displayName?: string | null;
  readonly teamId?: string | null;
  readonly teamCode?: string | null;
  readonly teamName?: string | null;
  readonly requireApproval?: boolean;
};

export type ReassignTechnicianPayload = {
  readonly companyId: string;
  readonly assignmentId: string;
  readonly employeeId: string;
  readonly userId?: string | null;
  readonly displayName?: string | null;
  readonly teamId?: string | null;
  readonly teamCode?: string | null;
  readonly teamName?: string | null;
};

export type ScheduleAppointmentPayload = {
  readonly companyId: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly timezone?: string | null;
  readonly serviceRequestId?: string | null;
  readonly workOrderId?: string | null;
  readonly projectId?: string | null;
  readonly siteAddressId?: string | null;
  readonly notes?: string | null;
};

export type RescheduleAppointmentPayload = {
  readonly companyId: string;
  readonly appointmentId: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly timezone?: string | null;
  readonly notes?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type CreateWorkOrderPayload = {
  readonly companyId: string;
  readonly number: string;
  readonly serviceRequestId?: string | null;
  readonly workTypeId?: string | null;
  readonly workTypeCode?: string | null;
  readonly workTypeName?: string | null;
  readonly projectId?: string | null;
  readonly siteAddressId?: string | null;
  readonly notes?: string | null;
};

export type UpdateWorkOrderPayload = {
  readonly companyId: string;
  readonly workOrderId: string;
  readonly notes?: string | null;
  readonly workTypeId?: string | null;
  readonly workTypeCode?: string | null;
  readonly workTypeName?: string | null;
  readonly projectId?: string | null;
  readonly siteAddressId?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
};

export type CompleteWorkOrderPayload = {
  readonly companyId: string;
  readonly workOrderId: string;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
  readonly requireApproval?: boolean;
};

export type CloseServiceRequestPayload = {
  readonly companyId: string;
  readonly serviceRequestId: string;
  readonly workOrderId?: string | null;
  readonly workflowInstanceId?: string | null;
  readonly transitionCode?: string | null;
  readonly requireApproval?: boolean;
};

export { ServiceCommandTypes };
