/**
 * Shared helpers for Manufacturing application handlers.
 */

import type { ApplicationContext, AuthorizationSpec } from "@afh/application";
import type { SecurityAuditService } from "@afh/identity";
import type { PlatformError, Result } from "@afh/shared-kernel";
import { ValidationError, fail, ok } from "@afh/shared-kernel";

export function newEntityId(): string {
  return crypto.randomUUID();
}

export type PolicyResourceScope = {
  readonly ownerUserId?: string | null;
  readonly organizationId?: string | null;
  readonly branchId?: string | null;
  readonly attributes?: Readonly<Record<string, unknown>>;
};

export function companyResource(
  type: string,
  action: string,
  companyId: string,
  id: string | null = null,
  scope: PolicyResourceScope = {},
): AuthorizationSpec {
  return {
    action,
    resource: {
      type,
      id,
      companyId,
      ownerUserId: scope.ownerUserId ?? null,
      organizationId: scope.organizationId ?? null,
      branchId: scope.branchId ?? null,
      ...(scope.attributes !== undefined
        ? { attributes: scope.attributes }
        : {}),
    },
  };
}

export async function loadRecordForAuthorization<T>(
  load: () => Promise<Result<T | null, PlatformError>>,
): Promise<T | null> {
  const found = await load();
  if (!found.ok) {
    throw found.error;
  }
  return found.value;
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

export async function recordManufacturingAudit(
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
