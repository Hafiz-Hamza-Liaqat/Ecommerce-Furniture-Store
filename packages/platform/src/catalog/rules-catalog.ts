/**
 * RC6.5 platform Rules catalog — workflow guards + approval assignment.
 *
 * Guard default: allow unless context.denyTransition === true (backward compatible
 * with existing domain transitions that omit guardContext).
 * Assignment default: prefer payload.preferredReviewerUserId; else unassigned queue.
 */

import type { RegisterRuleSetInput } from "../rules/rules-engine.js";

export const PLATFORM_RULES_CATALOG_VERSION =
  "rc6.5.platform-rules.v1" as const;

export const WORKFLOW_GUARD_DEFAULT_RULE_SET =
  "platform.workflow.guard.default" as const;

export const APPROVAL_ASSIGNMENT_DEFAULT_RULE_SET =
  "platform.approval.assignment.default" as const;

export type CatalogRuleSetDefinition = RegisterRuleSetInput;

export const RULES_CATALOG: readonly CatalogRuleSetDefinition[] = [
  {
    companyId: null,
    code: WORKFLOW_GUARD_DEFAULT_RULE_SET,
    name: "Default workflow transition guard",
    version: 1,
    domain: "workflow",
    rules: [
      {
        code: "deny_when_flagged",
        priority: 100,
        condition: { denyTransition: true },
        action: { effect: "deny", reason: "denyTransition" },
      },
    ],
  },
  {
    companyId: null,
    code: APPROVAL_ASSIGNMENT_DEFAULT_RULE_SET,
    name: "Default approval assignment resolution",
    version: 1,
    domain: "approval",
    rules: [
      {
        code: "prefer_payload_reviewer",
        priority: 10,
        condition: { preferredReviewerUserId: { exists: true } },
        action: {
          assignFromContextKey: "preferredReviewerUserId",
          escalateAfterHours: 48,
        },
      },
      {
        code: "default_escalate_window",
        priority: 1,
        condition: {},
        action: { escalateAfterHours: 48 },
      },
    ],
  },
];

export const RULES_CATALOG_CODES: readonly string[] = RULES_CATALOG.map(
  (r) => r.code,
);
