import type { RuleRecord, RuleSetRecord } from "./models.js";

export interface RulesStore {
  saveRuleSet(ruleSet: RuleSetRecord): Promise<void>;
  getRuleSetById(id: string): Promise<RuleSetRecord | null>;
  getRuleSetByCode(
    companyId: string | null,
    code: string,
    version?: number,
  ): Promise<RuleSetRecord | null>;
  saveRule(rule: RuleRecord): Promise<void>;
  listRules(ruleSetId: string): Promise<readonly RuleRecord[]>;
}

export class InMemoryRulesStore implements RulesStore {
  readonly ruleSets = new Map<string, RuleSetRecord>();
  readonly rules = new Map<string, RuleRecord[]>();

  async saveRuleSet(ruleSet: RuleSetRecord): Promise<void> {
    this.ruleSets.set(ruleSet.id, ruleSet);
  }

  async getRuleSetById(id: string): Promise<RuleSetRecord | null> {
    return this.ruleSets.get(id) ?? null;
  }

  async getRuleSetByCode(
    companyId: string | null,
    code: string,
    version?: number,
  ): Promise<RuleSetRecord | null> {
    const matches = [...this.ruleSets.values()].filter(
      (r) =>
        r.code === code &&
        r.status === "active" &&
        (r.companyId === companyId || r.companyId === null),
    );
    if (version !== undefined) {
      return matches.find((r) => r.version === version) ?? null;
    }
    return matches.sort((a, b) => b.version - a.version)[0] ?? null;
  }

  async saveRule(rule: RuleRecord): Promise<void> {
    const list = this.rules.get(rule.ruleSetId) ?? [];
    this.rules.set(rule.ruleSetId, [
      ...list.filter((r) => r.id !== rule.id),
      rule,
    ]);
  }

  async listRules(ruleSetId: string): Promise<readonly RuleRecord[]> {
    return (this.rules.get(ruleSetId) ?? []).slice().sort(
      (a, b) => a.priority - b.priority,
    );
  }
}
