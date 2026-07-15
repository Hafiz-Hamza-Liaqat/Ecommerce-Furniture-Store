/**
 * Generic rule evaluation — conditions are declarative equality/presence checks.
 * No business formulas (pricing, commission, MOQ values) are hardcoded here.
 */

import {
  ConflictError,
  NotFoundError,
  fail,
  ok,
  type Clock,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { SecurityAuditService } from "@afh/identity";
import { newId } from "../util/ids.js";
import type {
  RuleEvaluationResult,
  RuleRecord,
  RuleSetRecord,
} from "./models.js";
import type { RulesStore } from "./rules-store.js";
import type { RuleEvaluatedPayload } from "../events/engine-events.js";

export type RegisterRuleSetInput = {
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly version: number;
  readonly domain: string;
  readonly rules: readonly {
    readonly code: string;
    readonly priority: number;
    readonly condition: Readonly<Record<string, unknown>>;
    readonly action: Readonly<Record<string, unknown>>;
  }[];
};

export type EvaluateRulesInput = {
  readonly companyId: string | null;
  readonly ruleSetCode: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly version?: number;
  readonly audit?: boolean;
};

export type RulesEventSink = {
  emitEvaluated?(payload: RuleEvaluatedPayload): Promise<void>;
};

export class RulesEngine {
  constructor(
    private readonly store: RulesStore,
    private readonly clock: Clock,
    private readonly audit?: SecurityAuditService,
    private readonly events?: RulesEventSink,
  ) {}

  async registerRuleSet(
    input: RegisterRuleSetInput,
  ): Promise<Result<RuleSetRecord, PlatformError>> {
    const existing = await this.store.getRuleSetByCode(
      input.companyId,
      input.code,
      input.version,
    );
    if (existing) {
      return fail(
        new ConflictError("Rule set version already exists", {
          code: "rule_set_exists",
        }),
      );
    }
    const ruleSet: RuleSetRecord = {
      id: newId("rset"),
      companyId: input.companyId,
      code: input.code,
      name: input.name,
      version: input.version,
      domain: input.domain,
      status: "active",
      createdAt: this.clock.now().toISOString(),
    };
    await this.store.saveRuleSet(ruleSet);
    for (const rule of input.rules) {
      const record: RuleRecord = {
        id: newId("rule"),
        ruleSetId: ruleSet.id,
        code: rule.code,
        priority: rule.priority,
        condition: rule.condition,
        action: rule.action,
        status: "active",
      };
      await this.store.saveRule(record);
    }
    return ok(ruleSet);
  }

  async evaluate(
    input: EvaluateRulesInput,
  ): Promise<Result<RuleEvaluationResult, PlatformError>> {
    const ruleSet = await this.store.getRuleSetByCode(
      input.companyId,
      input.ruleSetCode,
      input.version,
    );
    if (!ruleSet) {
      return fail(
        new NotFoundError("Rule set not found", {
          code: "rule_set_not_found",
        }),
      );
    }

    const rules = await this.store.listRules(ruleSet.id);
    const matched: RuleRecord[] = [];
    const actions: Readonly<Record<string, unknown>>[] = [];

    for (const rule of rules) {
      if (rule.status !== "active") continue;
      if (matchesCondition(rule.condition, input.context)) {
        matched.push(rule);
        actions.push(rule.action);
      }
    }

    const deny = actions.some((a) => a["effect"] === "deny");
    const result: RuleEvaluationResult = {
      allowed: !deny,
      matchedRuleIds: matched.map((r) => r.id),
      actions,
      ruleSetCode: ruleSet.code,
      ruleSetVersion: ruleSet.version,
    };

    if (input.audit) {
      await this.audit?.record({
        companyId: input.companyId,
        actorUserId: null,
        action: "rules.evaluated",
        entityType: "rule_set",
        entityId: ruleSet.id,
        outcome: result.allowed ? "success" : "failure",
        details: {
          matched: result.matchedRuleIds,
          allowed: result.allowed,
        },
      });
    }

    await this.events?.emitEvaluated?.({
      ruleSetCode: ruleSet.code,
      ruleSetVersion: ruleSet.version,
      matchedRuleIds: result.matchedRuleIds,
      contextSummary: {
        keys: Object.keys(input.context),
        allowed: result.allowed,
      },
    });

    return ok(result);
  }
}

/**
 * Generic matcher: all condition keys must equal context values,
 * or use operators { eq, neq, exists, in }.
 */
export function matchesCondition(
  condition: Readonly<Record<string, unknown>>,
  context: Readonly<Record<string, unknown>>,
): boolean {
  for (const [key, expected] of Object.entries(condition)) {
    if (
      expected !== null &&
      typeof expected === "object" &&
      !Array.isArray(expected)
    ) {
      const op = expected as Readonly<Record<string, unknown>>;
      if ("eq" in op && context[key] !== op["eq"]) return false;
      if ("neq" in op && context[key] === op["neq"]) return false;
      if ("exists" in op) {
        const exists = context[key] !== undefined && context[key] !== null;
        if (Boolean(op["exists"]) !== exists) return false;
      }
      if ("in" in op && Array.isArray(op["in"])) {
        if (!op["in"].includes(context[key])) return false;
      }
      continue;
    }
    if (context[key] !== expected) {
      return false;
    }
  }
  return true;
}
