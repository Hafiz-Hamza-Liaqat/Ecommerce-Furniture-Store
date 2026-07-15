/**
 * Service validation — structural only. No business rules.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type { ServiceRequest } from "../request/request.js";
import type { WorkOrder, WorkOrderLine } from "../work-order/work-order.js";
import type { Appointment } from "../appointment/appointment.js";

function requireNonEmpty(
  field: string,
  value: string | null | undefined,
): ValidationOutcome | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const serviceRequestStructureValidator: Validator<ServiceRequest> = {
  validate(input: ServiceRequest): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("number", input.number) ??
      requireNonEmpty("title", input.title) ??
      validationOk()
    );
  },
};

export const workOrderStructureValidator: Validator<WorkOrder> = {
  validate(input: WorkOrder): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("number", input.number) ??
      validationOk()
    );
  },
};

export const workOrderLineStructureValidator: Validator<WorkOrderLine> = {
  validate(input: WorkOrderLine): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("workOrderId", input.workOrderId) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("description", input.description) ??
      validationOk()
    );
  },
};

export const appointmentStructureValidator: Validator<Appointment> = {
  validate(input: Appointment): ValidationOutcome {
    if (
      input.window.startAt &&
      input.window.endAt &&
      input.window.endAt < input.window.startAt
    ) {
      return validationFail([
        {
          field: "window.endAt",
          code: "invalid",
          message: "endAt must be >= startAt",
        },
      ]);
    }
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("window.startAt", input.window.startAt) ??
      requireNonEmpty("window.endAt", input.window.endAt) ??
      validationOk()
    );
  },
};

export type ServiceValidators = {
  readonly serviceRequest: Validator<ServiceRequest>;
  readonly workOrder: Validator<WorkOrder>;
  readonly workOrderLine: Validator<WorkOrderLine>;
  readonly appointment: Validator<Appointment>;
};

export function createServiceValidators(): ServiceValidators {
  return {
    serviceRequest: serviceRequestStructureValidator,
    workOrder: workOrderStructureValidator,
    workOrderLine: workOrderLineStructureValidator,
    appointment: appointmentStructureValidator,
  };
}
