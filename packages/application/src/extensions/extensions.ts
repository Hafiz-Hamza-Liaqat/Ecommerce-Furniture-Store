/**
 * Extension points for Workflow, Approval, and Rules.
 * No business workflows, approvals, or pricing rules.
 */

import type { ApplicationContext } from "../context/context.js";
import type {
  ApprovalEngine,
  RulesEngine,
  WorkflowEngine,
} from "@afh/platform";

export type WorkflowExtension = {
  readonly engine: WorkflowEngine;
};

export type ApprovalExtension = {
  readonly engine: ApprovalEngine;
};

export type RulesExtension = {
  readonly engine: RulesEngine;
};

/** Access Workflow Engine from application context when wired */
export function requireWorkflow(
  ctx: ApplicationContext,
): WorkflowEngine {
  if (!ctx.workflow) {
    throw new Error("WorkflowEngine not wired into ApplicationContext");
  }
  return ctx.workflow;
}

export function requireApproval(ctx: ApplicationContext): ApprovalEngine {
  if (!ctx.approval) {
    throw new Error("ApprovalEngine not wired into ApplicationContext");
  }
  return ctx.approval;
}

export function requireRules(ctx: ApplicationContext): RulesEngine {
  if (!ctx.rules) {
    throw new Error("RulesEngine not wired into ApplicationContext");
  }
  return ctx.rules;
}
