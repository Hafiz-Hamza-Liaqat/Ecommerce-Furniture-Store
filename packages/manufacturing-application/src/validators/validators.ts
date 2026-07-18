/**
 * Manufacturing application validators — structural intent only.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import { validationFail, validationOk } from "@afh/shared-kernel";
import type { CreateProductionOrderPayload } from "../commands/commands.js";
import type {
  GetProductionOrderPayload,
  ListProductionOrderPayload,
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

export const createProductionOrderCommandValidator: Validator<
  Command<CreateProductionOrderPayload>
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

export const getProductionOrderQueryValidator: Validator<
  Query<GetProductionOrderPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("productionOrderId", p.productionOrderId) ??
      validationOk()
    );
  },
};

export const listProductionOrderQueryValidator: Validator<
  Query<ListProductionOrderPayload>
> = {
  validate(query) {
    const p = query.payload;
    return requireField("companyId", p.companyId) ?? validationOk();
  },
};
