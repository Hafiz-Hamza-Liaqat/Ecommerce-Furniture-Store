/**
 * Approval assignment resolution (RC6.5).
 * Resolves an initial reviewer via Rules — Policy remains the sole authz authority.
 */

import {
  fail,
  isFail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { RulesEngine } from "../rules/rules-engine.js";

export const DEFAULT_APPROVAL_ASSIGNMENT_RULE_SET =
  "platform.approval.assignment.default" as const;

export const DEFAULT_APPROVAL_ESCALATE_AFTER_HOURS = 48;

export type ApprovalAssignmentResolution = {
  readonly reviewerUserId: string | null;
  readonly escalateAfterHours: number | null;
  readonly ruleSetCode: string | null;
};

export type ApprovalAssignmentContext = {
  readonly companyId: string;
  readonly branchId: string | null;
  readonly type: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly submittedByUserId: string;
  /** True when resolving during escalation scan. */
  readonly escalated?: boolean;
};

export type ApprovalAssignmentResolver = (
  input: ApprovalAssignmentContext,
) => Promise<Result<ApprovalAssignmentResolution, PlatformError>>;

function readString(
  action: Readonly<Record<string, unknown>>,
  key: string,
): string | null {
  const value = action[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readHours(
  action: Readonly<Record<string, unknown>>,
  key: string,
): number | null {
  const value = action[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

/**
 * Maps matched rule actions into a reviewer / SLA escalation hint.
 * Supported action keys:
 * - reviewerUserId — static assignee
 * - assignFromContextKey — copy string from evaluation context
 * - escalateAfterHours — default SLA hours when submit omits them
 */
export function resolutionFromRuleActions(
  actions: readonly Readonly<Record<string, unknown>>[],
  context: Readonly<Record<string, unknown>>,
  ruleSetCode: string | null,
): ApprovalAssignmentResolution {
  let reviewerUserId: string | null = null;
  let escalateAfterHours: number | null = null;

  for (const action of actions) {
    const direct = readString(action, "reviewerUserId");
    if (direct) {
      reviewerUserId = direct;
    }
    const fromKey = readString(action, "assignFromContextKey");
    if (fromKey) {
      const fromContext = context[fromKey];
      if (typeof fromContext === "string" && fromContext.trim().length > 0) {
        reviewerUserId = fromContext.trim();
      }
    }
    const hours = readHours(action, "escalateAfterHours");
    if (hours !== null) {
      escalateAfterHours = hours;
    }
  }

  return { reviewerUserId, escalateAfterHours, ruleSetCode };
}

/**
 * Rules-backed assignment resolver. Missing rule sets soft-fall back to
 * unassigned queue + default escalate-after hours (claim remains available).
 */
export function createRulesApprovalAssignmentResolver(
  rules: RulesEngine,
  options?: {
    readonly ruleSetCode?: string;
    readonly defaultEscalateAfterHours?: number | null;
  },
): ApprovalAssignmentResolver {
  const ruleSetCode =
    options?.ruleSetCode ?? DEFAULT_APPROVAL_ASSIGNMENT_RULE_SET;
  const defaultEscalateAfterHours =
    options?.defaultEscalateAfterHours === undefined
      ? DEFAULT_APPROVAL_ESCALATE_AFTER_HOURS
      : options.defaultEscalateAfterHours;

  return async (input) => {
    const context: Record<string, unknown> = {
      ...input.payload,
      approvalType: input.type,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      submittedByUserId: input.submittedByUserId,
      branchId: input.branchId,
      escalated: input.escalated === true,
    };

    const evaluation = await rules.evaluate({
      companyId: input.companyId,
      ruleSetCode,
      context,
    });

    if (isFail(evaluation)) {
      if (evaluation.error.code === "rule_set_not_found") {
        return ok({
          reviewerUserId: null,
          escalateAfterHours: defaultEscalateAfterHours,
          ruleSetCode: null,
        });
      }
      return fail(evaluation.error);
    }

    const resolved = resolutionFromRuleActions(
      evaluation.value.actions,
      context,
      evaluation.value.ruleSetCode,
    );

    return ok({
      reviewerUserId: resolved.reviewerUserId,
      escalateAfterHours:
        resolved.escalateAfterHours ?? defaultEscalateAfterHours,
      ruleSetCode: resolved.ruleSetCode,
    });
  };
}
