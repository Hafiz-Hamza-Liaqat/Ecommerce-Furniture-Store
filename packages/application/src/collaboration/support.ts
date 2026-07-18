import type { SecurityAuditService } from "@afh/identity";
import { ValidationError, fail, ok, type PlatformError, type Result } from "@afh/shared-kernel";
import type { ApplicationContext } from "../context/context.js";

export function newEntityId(): string {
  return crypto.randomUUID();
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

export async function recordCollaborationAudit(
  audit: SecurityAuditService,
  ctx: ApplicationContext,
  input: {
    readonly action: string;
    readonly entityType: string;
    readonly entityId: string | null;
    readonly outcome: "success" | "failure";
    readonly details?: Readonly<Record<string, unknown>>;
  },
): Promise<void> {
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
