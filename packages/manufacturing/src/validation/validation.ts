/**
 * Manufacturing validation — structural only.
 * No manufacturing rules, planning, or costing validation.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type { BillOfMaterials, BomItem } from "../bom/bom.js";
import type {
  ProductionOrder,
  ProductionOrderLine,
} from "../production-order/production-order.js";
import type { Routing } from "../routing/routing.js";
import type { WorkCenter } from "../work-center/work-center.js";
import type { Operation } from "../operation/operation.js";

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

export const bomStructureValidator: Validator<BillOfMaterials> = {
  validate(input: BillOfMaterials): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const bomItemStructureValidator: Validator<BomItem> = {
  validate(input: BomItem): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("bomId", input.bomId) ??
      requireNonEmpty("versionId", input.versionId) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("description", input.description) ??
      validationOk()
    );
  },
};

export const productionOrderStructureValidator: Validator<ProductionOrder> = {
  validate(input: ProductionOrder): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("number", input.number) ??
      validationOk()
    );
  },
};

export const productionOrderLineStructureValidator: Validator<ProductionOrderLine> =
  {
    validate(input: ProductionOrderLine): ValidationOutcome {
      return (
        requireNonEmpty("id", input.id) ??
        requireNonEmpty("productionOrderId", input.productionOrderId) ??
        requireNonEmpty("companyId", input.companyId) ??
        requireNonEmpty("description", input.description) ??
        validationOk()
      );
    },
  };

export const routingStructureValidator: Validator<Routing> = {
  validate(input: Routing): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const workCenterStructureValidator: Validator<WorkCenter> = {
  validate(input: WorkCenter): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const operationStructureValidator: Validator<Operation> = {
  validate(input: Operation): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export type ManufacturingValidators = {
  readonly bom: Validator<BillOfMaterials>;
  readonly bomItem: Validator<BomItem>;
  readonly productionOrder: Validator<ProductionOrder>;
  readonly productionOrderLine: Validator<ProductionOrderLine>;
  readonly routing: Validator<Routing>;
  readonly workCenter: Validator<WorkCenter>;
  readonly operation: Validator<Operation>;
};

export function createManufacturingValidators(): ManufacturingValidators {
  return {
    bom: bomStructureValidator,
    bomItem: bomItemStructureValidator,
    productionOrder: productionOrderStructureValidator,
    productionOrderLine: productionOrderLineStructureValidator,
    routing: routingStructureValidator,
    workCenter: workCenterStructureValidator,
    operation: operationStructureValidator,
  };
}
