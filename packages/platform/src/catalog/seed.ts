/**
 * RC6.1 idempotent platform definition seed (versioned).
 *
 * Registers default workflow and approval definitions into the existing
 * WorkflowEngine / ApprovalEngine stores. Soft-skips conflicts so the seed
 * is safely rerunnable on every host start (in-memory stores reset on process
 * restart; SQL definition stores land in RC6.4 via injected store adapters).
 *
 * Does not change engine ownership, Policy Engine behavior, or handler logic.
 */

import { createHash } from "node:crypto";
import { fail, ok, type Result, type PlatformError } from "@afh/shared-kernel";
import type { SecurityAuditService } from "@afh/identity";
import type { WorkflowEngine } from "../workflow/workflow-engine.js";
import type { ApprovalEngine } from "../approval/approval-engine.js";
import {
  APPROVAL_CATALOG,
  APPROVAL_CATALOG_TYPES,
} from "./approval-catalog.js";
import {
  PLATFORM_DEFINITIONS_CATALOG_VERSION,
  WORKFLOW_CATALOG,
  WORKFLOW_CATALOG_CODES,
} from "./workflow-catalog.js";

export type SeedCounts = {
  readonly created: number;
  readonly existing: number;
};

export type PlatformDefinitionsSeedReport = {
  readonly catalogVersion: string;
  readonly checksum: string;
  readonly workflows: SeedCounts;
  readonly approvals: SeedCounts;
  readonly workflowCodes: readonly string[];
  readonly approvalTypes: readonly string[];
};

export type SeedPlatformDefinitionsDependencies = {
  readonly workflow: WorkflowEngine;
  readonly approval: ApprovalEngine;
  readonly audit?: SecurityAuditService;
  readonly actorUserId?: string | null;
};

/** Deterministic checksum over the frozen definition catalogs. */
export function computePlatformDefinitionsChecksum(): string {
  const payload = JSON.stringify({
    version: PLATFORM_DEFINITIONS_CATALOG_VERSION,
    workflows: WORKFLOW_CATALOG.map((d) => ({
      code: d.code,
      version: d.version,
      entityType: d.entityType,
      stages: d.stages.map((s) => ({
        code: s.code,
        isInitial: s.isInitial ?? false,
        isTerminal: s.isTerminal ?? false,
      })),
      transitions: d.transitions.map((t) => ({
        code: t.code,
        from: t.fromStageCode,
        to: t.toStageCode,
      })),
    })),
    approvals: APPROVAL_CATALOG.map((d) => ({
      type: d.type,
      name: d.name,
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
 * Idempotently register the RC6.1 default workflow and approval definitions.
 * Rerunning against an already-seeded engine pair creates nothing.
 */
export async function seedPlatformDefinitions(
  deps: SeedPlatformDefinitionsDependencies,
): Promise<Result<PlatformDefinitionsSeedReport, PlatformError>> {
  const { workflow, approval, audit, actorUserId = null } = deps;
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

  const report: PlatformDefinitionsSeedReport = {
    catalogVersion: PLATFORM_DEFINITIONS_CATALOG_VERSION,
    checksum,
    workflows,
    approvals,
    workflowCodes: WORKFLOW_CATALOG_CODES,
    approvalTypes: APPROVAL_CATALOG_TYPES,
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
