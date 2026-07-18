/**
 * Service application validators — intent only.
 * Dispatch/selection/SLA/workload remain in Rules.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import {
  validateFilterAllowList,
  validateSortAllowList,
  validationFail,
  validationOk,
} from "@afh/shared-kernel";
import type {
  AssignTechnicianPayload,
  CloseServiceRequestPayload,
  CompleteWorkOrderPayload,
  CreateServiceRequestPayload,
  CreateWorkOrderPayload,
  ReassignTechnicianPayload,
  RescheduleAppointmentPayload,
  ScheduleAppointmentPayload,
  UpdateServiceRequestPayload,
  UpdateWorkOrderPayload,
} from "../commands/commands.js";
import type {
  GetAppointmentPayload,
  GetServiceHistoryPayload,
  GetServiceRequestPayload,
  GetServiceSummaryPayload,
  GetTechnicianAssignmentPayload,
  GetWorkOrderPayload,
  ListAppointmentPayload,
  ListServiceRequestPayload,
  ListTechnicianAssignmentPayload,
  ListWorkOrderPayload,
} from "../queries/queries.js";
import {
  APPOINTMENT_FILTER_FIELDS,
  APPOINTMENT_SORT_FIELDS,
  SERVICE_REQUEST_FILTER_FIELDS,
  SERVICE_REQUEST_SORT_FIELDS,
  TECHNICIAN_ASSIGNMENT_FILTER_FIELDS,
  TECHNICIAN_ASSIGNMENT_SORT_FIELDS,
  WORK_ORDER_FILTER_FIELDS,
  WORK_ORDER_SORT_FIELDS,
} from "../list-fields.js";

function requireField(
  field: string,
  value: string | null | undefined,
): ReturnType<typeof validationFail> | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const createServiceRequestCommandValidator: Validator<
  Command<CreateServiceRequestPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("number", p.number) ??
      requireField("title", p.title) ??
      validationOk()
    );
  },
};

export const updateServiceRequestCommandValidator: Validator<
  Command<UpdateServiceRequestPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("serviceRequestId", p.serviceRequestId);
    if (base) return base;
    if (p.transitionCode && !p.workflowInstanceId) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message: "workflowInstanceId is required when transitionCode is set",
        },
      ]);
    }
    return validationOk();
  },
};

export const assignTechnicianCommandValidator: Validator<
  Command<AssignTechnicianPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("employeeId", p.employeeId);
    if (base) return base;
    if (!p.workOrderId?.trim() && !p.appointmentId?.trim()) {
      return validationFail([
        {
          field: "workOrderId",
          code: "required",
          message: "workOrderId or appointmentId is required",
        },
      ]);
    }
    return validationOk();
  },
};

export const reassignTechnicianCommandValidator: Validator<
  Command<ReassignTechnicianPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("assignmentId", p.assignmentId) ??
      requireField("employeeId", p.employeeId) ??
      validationOk()
    );
  },
};

export const scheduleAppointmentCommandValidator: Validator<
  Command<ScheduleAppointmentPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("startAt", p.startAt) ??
      requireField("endAt", p.endAt);
    if (base) return base;
    if (p.endAt < p.startAt) {
      return validationFail([
        {
          field: "endAt",
          code: "invalid",
          message: "endAt must be >= startAt",
        },
      ]);
    }
    return validationOk();
  },
};

export const rescheduleAppointmentCommandValidator: Validator<
  Command<RescheduleAppointmentPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("appointmentId", p.appointmentId) ??
      requireField("startAt", p.startAt) ??
      requireField("endAt", p.endAt);
    if (base) return base;
    if (p.endAt < p.startAt) {
      return validationFail([
        {
          field: "endAt",
          code: "invalid",
          message: "endAt must be >= startAt",
        },
      ]);
    }
    return validationOk();
  },
};

export const createWorkOrderCommandValidator: Validator<
  Command<CreateWorkOrderPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("number", p.number) ??
      validationOk()
    );
  },
};

export const updateWorkOrderCommandValidator: Validator<
  Command<UpdateWorkOrderPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("workOrderId", p.workOrderId);
    if (base) return base;
    if (p.transitionCode && !p.workflowInstanceId) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message: "workflowInstanceId is required when transitionCode is set",
        },
      ]);
    }
    return validationOk();
  },
};

export const completeWorkOrderCommandValidator: Validator<
  Command<CompleteWorkOrderPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("workOrderId", p.workOrderId);
    if (base) return base;
    if (!p.requireApproval && !p.workflowInstanceId?.trim()) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message:
            "workflowInstanceId is required when completing (or set requireApproval)",
        },
      ]);
    }
    return validationOk();
  },
};

export const closeServiceRequestCommandValidator: Validator<
  Command<CloseServiceRequestPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("serviceRequestId", p.serviceRequestId);
    if (base) return base;
    if (!p.requireApproval && !p.workflowInstanceId?.trim()) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message:
            "workflowInstanceId is required when closing (or set requireApproval)",
        },
      ]);
    }
    return validationOk();
  },
};

export const getServiceRequestQueryValidator: Validator<
  Query<GetServiceRequestPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("serviceRequestId", p.serviceRequestId) ??
      validationOk()
    );
  },
};

export const getWorkOrderQueryValidator: Validator<Query<GetWorkOrderPayload>> =
  {
    validate(query) {
      const p = query.payload;
      return (
        requireField("companyId", p.companyId) ??
        requireField("workOrderId", p.workOrderId) ??
        validationOk()
      );
    },
  };

export const getAppointmentQueryValidator: Validator<
  Query<GetAppointmentPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("appointmentId", p.appointmentId) ??
      validationOk()
    );
  },
};

export const getTechnicianAssignmentQueryValidator: Validator<
  Query<GetTechnicianAssignmentPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("assignmentId", p.assignmentId) ??
      validationOk()
    );
  },
};

export const getServiceHistoryQueryValidator: Validator<
  Query<GetServiceHistoryPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("serviceRequestId", p.serviceRequestId) ??
      validationOk()
    );
  },
};

export const getServiceSummaryQueryValidator: Validator<
  Query<GetServiceSummaryPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("serviceRequestId", p.serviceRequestId) ??
      validationOk()
    );
  },
};

function listCriteriaViolations(
  payload: ListServiceRequestPayload,
  sortFields: ReadonlySet<string>,
  filterFields: ReadonlySet<string>,
): ReturnType<typeof validationFail> | null {
  const sort = validateSortAllowList(payload.criteria?.sort, sortFields);
  if (!sort.ok) {
    return validationFail([
      {
        field: "criteria.sort",
        code: sort.error.code,
        message: sort.error.message,
      },
    ]);
  }
  const filters = validateFilterAllowList(
    payload.criteria?.filters,
    filterFields,
  );
  if (!filters.ok) {
    return validationFail([
      {
        field: "criteria.filters",
        code: filters.error.code,
        message: filters.error.message,
      },
    ]);
  }
  return null;
}

export const listServiceRequestQueryValidator: Validator<
  Query<ListServiceRequestPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      listCriteriaViolations(
        p,
        SERVICE_REQUEST_SORT_FIELDS,
        SERVICE_REQUEST_FILTER_FIELDS,
      ) ??
      validationOk()
    );
  },
};

export const listWorkOrderQueryValidator: Validator<
  Query<ListWorkOrderPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      listCriteriaViolations(
        p,
        WORK_ORDER_SORT_FIELDS,
        WORK_ORDER_FILTER_FIELDS,
      ) ??
      validationOk()
    );
  },
};

export const listAppointmentQueryValidator: Validator<
  Query<ListAppointmentPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      listCriteriaViolations(
        p,
        APPOINTMENT_SORT_FIELDS,
        APPOINTMENT_FILTER_FIELDS,
      ) ??
      validationOk()
    );
  },
};

export const listTechnicianAssignmentQueryValidator: Validator<
  Query<ListTechnicianAssignmentPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      listCriteriaViolations(
        p,
        TECHNICIAN_ASSIGNMENT_SORT_FIELDS,
        TECHNICIAN_ASSIGNMENT_FILTER_FIELDS,
      ) ??
      validationOk()
    );
  },
};
