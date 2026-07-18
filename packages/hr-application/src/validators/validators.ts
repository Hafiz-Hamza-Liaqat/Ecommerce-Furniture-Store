/**
 * HR application validators — structural intent only.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import { validationFail, validationOk } from "@afh/shared-kernel";
import type { CreateEmployeePayload } from "../commands/commands.js";
import type { GetEmployeePayload, ListEmployeePayload } from "../queries/queries.js";

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

export const createEmployeeCommandValidator: Validator<
  Command<CreateEmployeePayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("displayName", p.displayName) ??
      validationOk()
    );
  },
};

export const getEmployeeQueryValidator: Validator<Query<GetEmployeePayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("employeeId", p.employeeId) ??
      validationOk()
    );
  },
};

export const listEmployeeQueryValidator: Validator<Query<ListEmployeePayload>> = {
  validate(query) {
    const p = query.payload;
    return requireField("companyId", p.companyId) ?? validationOk();
  },
};
