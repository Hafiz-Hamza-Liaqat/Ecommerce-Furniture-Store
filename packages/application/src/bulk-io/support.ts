import type { SecurityAuditService } from "@afh/identity";
import type { PlatformError, Result } from "@afh/shared-kernel";
import { ValidationError, fail, ok } from "@afh/shared-kernel";
import type { ApplicationContext } from "../context/context.js";
import type { AuthorizationSpec } from "../handlers/handlers.js";

export function companyResource(
  type: string,
  action: string,
  companyId: string,
  id: string | null = null,
): AuthorizationSpec {
  return {
    action,
    resource: {
      type,
      id,
      companyId,
      ownerUserId: null,
      organizationId: null,
      branchId: null,
    },
  };
}

export function requireCompanyId(
  ctx: ApplicationContext,
  payloadCompanyId: string,
): Result<string, PlatformError> {
  if (!payloadCompanyId.trim()) {
    return fail(
      new ValidationError("companyId is required", { code: "company_required" }),
    );
  }
  if (ctx.companyId && ctx.companyId !== payloadCompanyId) {
    return fail(
      new ValidationError("companyId does not match execution scope", {
        code: "company_scope_mismatch",
      }),
    );
  }
  return ok(payloadCompanyId);
}

export async function recordBulkAudit(
  audit: SecurityAuditService | undefined,
  ctx: ApplicationContext,
  input: {
    readonly action: string;
    readonly entityType: string;
    readonly entityId: string | null;
    readonly outcome: "success" | "failure";
    readonly details?: Readonly<Record<string, unknown>>;
  },
): Promise<void> {
  if (!audit) return;
  await audit.record({
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    outcome: input.outcome,
    details: input.details ?? {},
    correlationId: ctx.correlationId,
  });
}
