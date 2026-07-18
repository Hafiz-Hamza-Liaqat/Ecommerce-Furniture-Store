/**
 * Reporting application validators — structural intent only.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import { validationFail, validationOk } from "@afh/shared-kernel";
import type { RunReportPayload } from "../commands/commands.js";
import type {
  GetReportDefinitionPayload,
  ListReportDefinitionPayload,
} from "../queries/queries.js";

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

export const runReportCommandValidator: Validator<Command<RunReportPayload>> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("reportDefinitionId", p.reportDefinitionId) ??
      validationOk()
    );
  },
};

export const getReportDefinitionQueryValidator: Validator<
  Query<GetReportDefinitionPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("reportDefinitionId", p.reportDefinitionId) ??
      validationOk()
    );
  },
};

export const listReportDefinitionQueryValidator: Validator<
  Query<ListReportDefinitionPayload>
> = {
  validate(query) {
    return requireField("companyId", query.payload.companyId) ?? validationOk();
  },
};
