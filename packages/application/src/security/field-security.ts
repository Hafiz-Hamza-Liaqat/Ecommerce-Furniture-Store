/**
 * RC5.6 field-level security.
 *
 * Field rules are metadata. Every allow/deny decision is delegated to the
 * existing Policy Engine; this module only applies the resulting projection
 * or rejects a restricted patch. It is not an authorization engine.
 */
import type {
  PolicyDecision,
  PolicyResource,
  SecurityAuditService,
} from "@afh/identity";
import {
  AuthorizationError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { ApplicationContext } from "../context/context.js";

/**
 * Frozen RC5.6 field permission metadata. These codes intentionally remain
 * outside the immutable RBAC seed catalog. A tenant may grant them through
 * its existing permission store; otherwise Policy denies and fields fail
 * closed.
 */
export const Rc5FieldPermissions = {
  FinanceCostsRead: "finance.costs.read",
  FinanceBankAccountsRead: "finance.bank_accounts.read",
  FinanceCreditAccountsUpdate: "finance.credit_accounts.update",
  DamKycAssetsRead: "dam.kyc_assets.read",
} as const;

export type FieldSensitivity =
  | "internal"
  | "financial"
  | "pii"
  | "restricted";

export type FieldReadRule<T extends object> = {
  readonly field: Extract<keyof T, string>;
  readonly permission: string;
  readonly sensitivity: FieldSensitivity;
  readonly denied: "omit" | "mask" | "deny";
  readonly mask?: (value: unknown) => unknown;
};

export type FieldWriteRule<T extends object> = {
  readonly field: Extract<keyof T, string>;
  readonly permission: string;
  readonly sensitivity: FieldSensitivity;
};

export type FieldDecision = {
  readonly field: string;
  readonly permission: string;
  readonly sensitivity: FieldSensitivity;
  readonly allowed: boolean;
  readonly reasonCode: string | null;
};

export type FieldProjection<T extends object> = {
  readonly value: Partial<T>;
  readonly decisions: readonly FieldDecision[];
};

async function evaluateFieldPermission(
  ctx: ApplicationContext,
  permission: string,
  resource: PolicyResource,
): Promise<PolicyDecision> {
  if (!ctx.principal) {
    return {
      allowed: false,
      reasonCode: "principal_missing",
      message: "Active principal is required for field access",
    };
  }

  try {
    return await ctx.policyEngine.evaluate(
      ctx.principal,
      permission,
      resource,
      { correlationId: ctx.correlationId },
    );
  } catch {
    return {
      allowed: false,
      reasonCode: "policy_evaluation_failed",
      message: "Field permission could not be resolved",
    };
  }
}

/**
 * Project an API DTO after record authorization. Protected fields are kept,
 * omitted, masked, or cause a request denial according to Policy decisions.
 */
export async function projectFields<T extends object>(
  ctx: ApplicationContext,
  resource: PolicyResource,
  source: T,
  rules: readonly FieldReadRule<T>[],
): Promise<Result<FieldProjection<T>, PlatformError>> {
  const value: Partial<T> = { ...source };
  const decisions: FieldDecision[] = [];
  const permissionDecisions = new Map<string, PolicyDecision>();

  for (const rule of rules) {
    let decision = permissionDecisions.get(rule.permission);
    if (!decision) {
      decision = await evaluateFieldPermission(ctx, rule.permission, resource);
      permissionDecisions.set(rule.permission, decision);
    }

    decisions.push({
      field: rule.field,
      permission: rule.permission,
      sensitivity: rule.sensitivity,
      allowed: decision.allowed,
      reasonCode: decision.allowed ? null : decision.reasonCode,
    });

    if (decision.allowed) continue;

    if (rule.denied === "deny") {
      return fail(
        new AuthorizationError("Sensitive field access denied", {
          code: "field_read_denied",
          details: {
            field: rule.field,
            permission: rule.permission,
            reasonCode: decision.reasonCode,
          },
        }),
      );
    }

    if (rule.denied === "mask" && rule.mask) {
      (value as Record<string, unknown>)[rule.field] = rule.mask(
        (source as Record<string, unknown>)[rule.field],
      );
    } else {
      delete (value as Record<string, unknown>)[rule.field];
    }
  }

  return ok({ value, decisions });
}

/**
 * Validate restricted patch fields before any mutation. A missing principal,
 * missing permission, or Policy failure rejects the complete patch.
 */
export async function authorizeFieldPatch<T extends object>(
  ctx: ApplicationContext,
  resource: PolicyResource,
  patch: T,
  rules: readonly FieldWriteRule<T>[],
): Promise<Result<readonly FieldDecision[], PlatformError>> {
  const decisions: FieldDecision[] = [];
  const deniedFields: string[] = [];
  const deniedPermissions = new Set<string>();

  for (const rule of rules) {
    if (!Object.prototype.hasOwnProperty.call(patch, rule.field)) continue;

    const decision = await evaluateFieldPermission(
      ctx,
      rule.permission,
      resource,
    );
    decisions.push({
      field: rule.field,
      permission: rule.permission,
      sensitivity: rule.sensitivity,
      allowed: decision.allowed,
      reasonCode: decision.allowed ? null : decision.reasonCode,
    });

    if (!decision.allowed) {
      deniedFields.push(rule.field);
      deniedPermissions.add(rule.permission);
    }
  }

  if (deniedFields.length > 0) {
    return fail(
      new AuthorizationError("Restricted field update denied", {
        code: "field_update_denied",
        details: {
          fields: deniedFields,
          permissions: [...deniedPermissions],
        },
      }),
    );
  }

  return ok(decisions);
}

/**
 * Append field decision evidence without storing field values or payloads.
 */
export async function auditFieldDecisions(
  audit: SecurityAuditService,
  ctx: ApplicationContext,
  resource: PolicyResource,
  operation: "read" | "update",
  decisions: readonly FieldDecision[],
): Promise<void> {
  for (const decision of decisions) {
    await audit.record({
      companyId: resource.companyId,
      actorUserId: ctx.userId,
      action: `field.${operation}`,
      entityType: resource.type,
      entityId: resource.id,
      outcome: decision.allowed ? "success" : "failure",
      details: {
        field: decision.field,
        permission: decision.permission,
        sensitivity: decision.sensitivity,
        reasonCode: decision.reasonCode,
      },
      correlationId: ctx.correlationId,
    });
  }
}
