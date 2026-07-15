import type { CommandHandler } from "@afh/application";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type { Supplier } from "@afh/procurement";
import {
  ProcurementCommandTypes,
  ProcurementPolicyActions,
  ProcurementRuleSetCodes,
} from "../constants.js";
import type {
  CreateSupplierPayload,
  UpdateSupplierPayload,
} from "../commands/commands.js";
import {
  createSupplierCommandValidator,
  updateSupplierCommandValidator,
} from "../validators/validators.js";
import type { ProcurementHandlerDeps } from "./deps.js";
import {
  companyResource,
  invokeProcurementRules,
  newEntityId,
  recordProcurementAudit,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

type SupplierStatus = Supplier["status"];

function mapSupplierStatus(projection: string): SupplierStatus {
  const known: SupplierStatus[] = ["draft", "active", "inactive", "blocked"];
  return (known.includes(projection as SupplierStatus)
    ? projection
    : "draft") as SupplierStatus;
}

export function createCreateSupplierHandler(
  deps: ProcurementHandlerDeps,
): CommandHandler<CreateSupplierPayload, { supplierId: string }> {
  return {
    commandType: ProcurementCommandTypes.CreateSupplier,
    authorize(command) {
      return companyResource(
        "supplier",
        ProcurementPolicyActions.SupplierCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createSupplierCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const eligibility = await invokeProcurementRules(
        ctx,
        ProcurementRuleSetCodes.SupplierEligibility,
        {
          companyId: scope.value,
          code: command.payload.code,
          name: command.payload.name,
        },
      );
      if (!eligibility.ok) return eligibility;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const supplier: Supplier = {
        id,
        companyId: scope.value,
        code: p.code,
        name: p.name,
        identityOrganizationId: p.identityOrganizationId ?? null,
        categoryId: p.categoryId ?? null,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.suppliers.save(supplier);
      if (!saved.ok) return saved;

      await recordProcurementAudit(deps.audit, ctx, {
        action: ProcurementCommandTypes.CreateSupplier,
        entityType: "supplier",
        entityId: id,
        outcome: "success",
      });

      return ok({ supplierId: id });
    },
  };
}

export function createUpdateSupplierHandler(
  deps: ProcurementHandlerDeps,
): CommandHandler<UpdateSupplierPayload, { supplierId: string }> {
  return {
    commandType: ProcurementCommandTypes.UpdateSupplier,
    authorize(command) {
      return companyResource(
        "supplier",
        ProcurementPolicyActions.SupplierUpdate,
        command.payload.companyId,
        command.payload.supplierId,
      );
    },
    validate() {
      return updateSupplierCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.suppliers.findById({
        companyId: scope.value,
        id: command.payload.supplierId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Supplier not found", {
            code: "supplier_not_found",
          }),
        );
      }

      const p = command.payload;
      let status = existing.value.status;

      if (p.transitionCode && p.workflowInstanceId) {
        const wf = workflowOrFail(ctx);
        if (!wf.ok) return wf;
        const transitioned = await wf.value.transition({
          instanceId: p.workflowInstanceId,
          transitionCode: p.transitionCode,
          actorUserId: ctx.userId,
        });
        if (!transitioned.ok) return transitioned;
        status = mapSupplierStatus(transitioned.value.statusProjection);
      }

      const now = ctx.clock.now().toISOString();
      const updated: Supplier = {
        ...existing.value,
        code: p.code ?? existing.value.code,
        name: p.name ?? existing.value.name,
        identityOrganizationId:
          p.identityOrganizationId !== undefined
            ? p.identityOrganizationId
            : existing.value.identityOrganizationId,
        categoryId:
          p.categoryId !== undefined ? p.categoryId : existing.value.categoryId,
        status,
        updatedAt: now,
      };

      const saved = await deps.suppliers.save(updated);
      if (!saved.ok) return saved;

      await recordProcurementAudit(deps.audit, ctx, {
        action: ProcurementCommandTypes.UpdateSupplier,
        entityType: "supplier",
        entityId: updated.id,
        outcome: "success",
        details: { transitionCode: p.transitionCode ?? null },
      });

      return ok({ supplierId: updated.id });
    },
  };
}
