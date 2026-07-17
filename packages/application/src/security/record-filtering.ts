/**
 * RC5.7 query/list record filtering.
 *
 * List-returning queries authorize the operation once, then pass every
 * candidate row through the existing Policy Engine so out-of-scope records
 * are omitted from results, counts, and id projections. This module never
 * decides anything itself — each row decision is delegated to
 * `ctx.policyEngine.evaluate` (the sole authorization authority) and any
 * evaluation failure fails the whole query closed.
 */
import type { PolicyDecision, PolicyPrincipal } from "@afh/identity";
import {
  AuthorizationError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { ApplicationContext } from "../context/context.js";

/**
 * Scope hints for the collection-level authorization gate of a list query.
 *
 * A collection has no single persisted owner/organization/branch, so the
 * gate resource is populated from the principal's own active assignments:
 * the operation targets "records within the caller's scopes", and per-row
 * filtering then enforces exactly that. Company/global principals are
 * unaffected (their scope gate already passes); principals with no active
 * scoped assignment keep all-null fields and remain denied by Policy.
 */
export type PrincipalListScope = {
  readonly ownerUserId: string | null;
  readonly organizationId: string | null;
  readonly branchId: string | null;
};

export function principalListScope(
  principal: PolicyPrincipal | null,
): PrincipalListScope {
  if (!principal) {
    return { ownerUserId: null, organizationId: null, branchId: null };
  }
  let ownerUserId: string | null = null;
  let organizationId: string | null = null;
  let branchId: string | null = null;
  for (const role of principal.roles) {
    if (role.scopeType === "own") {
      ownerUserId = principal.userId;
    } else if (role.scopeType === "organization" && role.scopeId !== null) {
      organizationId = organizationId ?? role.scopeId;
    } else if (role.scopeType === "branch" && role.scopeId !== null) {
      branchId = branchId ?? role.scopeId;
    }
  }
  return { ownerUserId, organizationId, branchId };
}

/** Persisted scope fields of one candidate row. Missing data stays null and denies for scoped principals. */
export type ListRecordScope = {
  readonly id: string | null;
  /** The row's persisted companyId — lets Policy company isolation catch any adapter leak. */
  readonly companyId: string;
  readonly ownerUserId?: string | null;
  readonly organizationId?: string | null;
  readonly branchId?: string | null;
};

/**
 * Filter a bounded, company-scoped page of records through the Policy Engine.
 *
 * - Rows are kept only when Policy allows `action` on the row's persisted
 *   resource; permission, company isolation, and scope rules all apply.
 *   The resource carries the row's persisted companyId, so a defective
 *   adapter leaking foreign rows is still stopped by company isolation.
 * - The evaluation is in-process and bounded by the repository page size —
 *   this is not remote per-row authorization.
 * - Fail-closed: a missing principal or a Policy evaluation failure fails
 *   the entire query; rows are never kept on error.
 */
export async function filterAuthorizedRecords<T>(
  ctx: ApplicationContext,
  action: string,
  resourceType: string,
  records: readonly T[],
  toScope: (record: T) => ListRecordScope,
): Promise<Result<readonly T[], PlatformError>> {
  if (!ctx.principal) {
    return fail(
      new AuthorizationError("Active principal is required for list access", {
        code: "principal_missing",
      }),
    );
  }

  const allowed: T[] = [];
  for (const record of records) {
    const scope = toScope(record);
    let decision: PolicyDecision;
    try {
      decision = await ctx.policyEngine.evaluate(
        ctx.principal,
        action,
        {
          type: resourceType,
          id: scope.id,
          companyId: scope.companyId,
          ownerUserId: scope.ownerUserId ?? null,
          organizationId: scope.organizationId ?? null,
          branchId: scope.branchId ?? null,
        },
        { correlationId: ctx.correlationId },
      );
    } catch {
      return fail(
        new AuthorizationError("List record filtering could not be resolved", {
          code: "policy_evaluation_failed",
        }),
      );
    }
    if (decision.allowed) {
      allowed.push(record);
    }
  }

  return ok(allowed);
}
