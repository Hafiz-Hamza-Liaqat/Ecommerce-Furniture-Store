/**
 * RC6.1/RC6.5 idempotent platform definition seed (versioned).
 *
 * Registers default workflow, approval, and (RC6.5) Rules catalogs into the
 * existing engines. Soft-skips conflicts so the seed is safely rerunnable.
 *
 * Does not change engine ownership, Policy Engine behavior, or handler logic.
 */

import { createHash } from "node:crypto";
import { fail, ok, type Result, type PlatformError } from "@afh/shared-kernel";
import type { SecurityAuditService } from "@afh/identity";
import type { WorkflowEngine } from "../workflow/workflow-engine.js";
import type { ApprovalEngine } from "../approval/approval-engine.js";
import type { RulesEngine } from "../rules/rules-engine.js";
import {
  APPROVAL_CATALOG,
  APPROVAL_CATALOG_TYPES,
} from "./approval-catalog.js";
import {
  PLATFORM_DEFINITIONS_CATALOG_VERSION,
  WORKFLOW_CATALOG,
  WORKFLOW_CATALOG_CODES,
} from "./workflow-catalog.js";
import {
  PLATFORM_RULES_CATALOG_VERSION,
  RULES_CATALOG,
  RULES_CATALOG_CODES,
} from "./rules-catalog.js";

export type SeedCounts = {
  readonly created: number;
  readonly existing: number;
};

export type PlatformDefinitionsSeedReport = {
  readonly catalogVersion: string;
  readonly rulesCatalogVersion: string;
  readonly checksum: string;
  readonly workflows: SeedCounts;
  readonly approvals: SeedCounts;
  readonly rules: SeedCounts;
  readonly workflowCodes: readonly string[];
  readonly approvalTypes: readonly string[];
  readonly ruleSetCodes: readonly string[];
};

export type SeedPlatformDefinitionsDependencies = {
  readonly workflow: WorkflowEngine;
  readonly approval: ApprovalEngine;
  readonly rules?: RulesEngine;
  readonly audit?: SecurityAuditService;
  readonly actorUserId?: string | null;
};

/** Deterministic checksum over the frozen definition catalogs. */
export function computePlatformDefinitionsChecksum(): string {
  const payload = JSON.stringify({
    version: PLATFORM_DEFINITIONS_CATALOG_VERSION,
    rulesVersion: PLATFORM_RULES_CATALOG_VERSION,
    workflows: WORKFLOW_CATALOG.map((d) => ({
      code: d.code,
      version: d.version,
      entityType: d.entityType,
      stages: d.stages.map((s) => ({
        code: s.code,
        isInitial: s.isInitial ?? false,
        isTerminal: s.isTerminal ?? false,
        slaHours: s.slaHours ?? null,
      })),
      transitions: d.transitions.map((t) => ({
        code: t.code,
        from: t.fromStageCode,
        to: t.toStageCode,
        guardRuleSetCode: t.guardRuleSetCode ?? null,
        requiresApprovalType: t.requiresApprovalType ?? null,
      })),
    })),
    approvals: APPROVAL_CATALOG.map((d) => ({
      type: d.type,
      name: d.name,
    })),
    rules: RULES_CATALOG.map((r) => ({
      code: r.code,
      version: r.version,
      domain: r.domain,
      ruleCount: r.rules.length,
    })),
  });
  return createHash("sha256").update(payload).digest("hex");
}

function isConflict(
  result: Result<unknown, PlatformError>,
  code: string,
): boolean {
  return !result.ok && result.error.code === code;
}

/**
 * Idempotently register the default workflow, approval, and rules catalogs.
 * Rerunning against an already-seeded engine set creates nothing.
 */
export async function seedPlatformDefinitions(
  deps: SeedPlatformDefinitionsDependencies,
): Promise<Result<PlatformDefinitionsSeedReport, PlatformError>> {
  const { workflow, approval, rules, audit, actorUserId = null } = deps;
  const checksum = computePlatformDefinitionsChecksum();

  const workflows = { created: 0, existing: 0 };
  for (const definition of WORKFLOW_CATALOG) {
    const registered = await workflow.registerDefinition(definition);
    if (registered.ok) {
      workflows.created += 1;
      continue;
    }
    if (isConflict(registered, "workflow_definition_exists")) {
      workflows.existing += 1;
      continue;
    }
    if (audit) {
      await audit.record({
        companyId: null,
        actorUserId,
        action: "platform.definitions_seed_rejected",
        entityType: "platform_definitions",
        entityId: PLATFORM_DEFINITIONS_CATALOG_VERSION,
        outcome: "failure",
        details: {
          catalogVersion: PLATFORM_DEFINITIONS_CATALOG_VERSION,
          phase: "workflow",
          code: definition.code,
          errorCode: registered.error.code,
        },
      });
    }
    return fail(registered.error);
  }

  const approvals = { created: 0, existing: 0 };
  for (const definition of APPROVAL_CATALOG) {
    const registered = await approval.registerDefinition(definition);
    if (registered.ok) {
      approvals.created += 1;
      continue;
    }
    if (isConflict(registered, "approval_type_exists")) {
      approvals.existing += 1;
      continue;
    }
    if (audit) {
      await audit.record({
        companyId: null,
        actorUserId,
        action: "platform.definitions_seed_rejected",
        entityType: "platform_definitions",
        entityId: PLATFORM_DEFINITIONS_CATALOG_VERSION,
        outcome: "failure",
        details: {
          catalogVersion: PLATFORM_DEFINITIONS_CATALOG_VERSION,
          phase: "approval",
          type: definition.type,
          errorCode: registered.error.code,
        },
      });
    }
    return fail(registered.error);
  }

  const ruleCounts = { created: 0, existing: 0 };
  if (rules) {
    for (const ruleSet of RULES_CATALOG) {
      const registered = await rules.registerRuleSet(ruleSet);
      if (registered.ok) {
        ruleCounts.created += 1;
        continue;
      }
      if (isConflict(registered, "rule_set_exists")) {
        ruleCounts.existing += 1;
        continue;
      }
      if (audit) {
        await audit.record({
          companyId: null,
          actorUserId,
          action: "platform.definitions_seed_rejected",
          entityType: "platform_definitions",
          entityId: PLATFORM_DEFINITIONS_CATALOG_VERSION,
          outcome: "failure",
          details: {
            catalogVersion: PLATFORM_DEFINITIONS_CATALOG_VERSION,
            phase: "rules",
            code: ruleSet.code,
            errorCode: registered.error.code,
          },
        });
      }
      return fail(registered.error);
    }
  }

  const report: PlatformDefinitionsSeedReport = {
    catalogVersion: PLATFORM_DEFINITIONS_CATALOG_VERSION,
    rulesCatalogVersion: PLATFORM_RULES_CATALOG_VERSION,
    checksum,
    workflows,
    approvals,
    rules: ruleCounts,
    workflowCodes: WORKFLOW_CATALOG_CODES,
    approvalTypes: APPROVAL_CATALOG_TYPES,
    ruleSetCodes: RULES_CATALOG_CODES,
  };

  if (audit) {
    await audit.record({
      companyId: null,
      actorUserId,
      action: "platform.definitions_seeded",
      entityType: "platform_definitions",
      entityId: PLATFORM_DEFINITIONS_CATALOG_VERSION,
      outcome: "success",
      details: { ...report },
    });
  }

  return ok(report);
}
