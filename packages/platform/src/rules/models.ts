/**
 * Rules Engine — calculation/evaluation only (no pricing-specific logic).
 */

export type RuleSetRecord = {
  readonly id: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly version: number;
  readonly domain: string;
  readonly status: "active" | "inactive";
  readonly createdAt: string;
};

export type RuleRecord = {
  readonly id: string;
  readonly ruleSetId: string;
  readonly code: string;
  readonly priority: number;
  /** Generic condition document — domains supply meaning later */
  readonly condition: Readonly<Record<string, unknown>>;
  /** Generic action document — domains supply meaning later */
  readonly action: Readonly<Record<string, unknown>>;
  readonly status: "active" | "inactive";
};

export type RuleEvaluationResult = {
  readonly allowed: boolean;
  readonly matchedRuleIds: readonly string[];
  readonly actions: readonly Readonly<Record<string, unknown>>[];
  readonly ruleSetCode: string;
  readonly ruleSetVersion: number;
};
