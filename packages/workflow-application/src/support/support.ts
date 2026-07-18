/**
 * Shared helpers for workflow operator handlers.
 */

import type { ApplicationContext, AuthorizationSpec } from "@afh/application";
import {
  requireApproval,
  requireWorkflow,
} from "@afh/application";
import type { ApprovalEngine, WorkflowEngine } from "@afh/platform";
import {
  ValidationError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";

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

/** Nullable company scope for global definition registration. */
export function requireOptionalCompanyId(
  ctx: ApplicationContext,
  payloadCompanyId: string | null,
): Result<string | null, PlatformError> {
  if (payloadCompanyId === null) {
    return ok(null);
  }
  return requireCompanyId(ctx, payloadCompanyId);
}

export function workflowOrFail(
  ctx: ApplicationContext,
): Result<WorkflowEngine, PlatformError> {
  try {
    return ok(requireWorkflow(ctx));
  } catch {
    return fail(
      new ValidationError("WorkflowEngine is not available", {
        code: "workflow_not_wired",
      }),
    );
  }
}

export function approvalOrFail(
  ctx: ApplicationContext,
): Result<ApprovalEngine, PlatformError> {
  try {
    return ok(requireApproval(ctx));
  } catch {
    return fail(
      new ValidationError("ApprovalEngine is not available", {
        code: "approval_not_wired",
      }),
    );
  }
}
