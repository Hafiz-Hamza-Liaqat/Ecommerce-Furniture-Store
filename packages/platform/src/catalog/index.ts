/**
 * RC6.1 platform definition catalog — default workflow + approval seeds.
 * RC6.5 adds Rules catalog (guards + assignment) and engine-completion helpers.
 */

export {
  PLATFORM_DEFINITIONS_CATALOG_VERSION,
  DEFAULT_STAGE_SLA_HOURS,
  WORKFLOW_CATALOG,
  WORKFLOW_CATALOG_CODES,
} from "./workflow-catalog.js";
export type { CatalogWorkflowDefinition } from "./workflow-catalog.js";

export {
  APPROVAL_CATALOG,
  APPROVAL_CATALOG_TYPES,
} from "./approval-catalog.js";
export type { CatalogApprovalDefinition } from "./approval-catalog.js";

export {
  PLATFORM_RULES_CATALOG_VERSION,
  WORKFLOW_GUARD_DEFAULT_RULE_SET,
  APPROVAL_ASSIGNMENT_DEFAULT_RULE_SET,
  RULES_CATALOG,
  RULES_CATALOG_CODES,
} from "./rules-catalog.js";
export type { CatalogRuleSetDefinition } from "./rules-catalog.js";

export {
  computePlatformDefinitionsChecksum,
  seedPlatformDefinitions,
} from "./seed.js";
export type {
  SeedCounts,
  PlatformDefinitionsSeedReport,
  SeedPlatformDefinitionsDependencies,
} from "./seed.js";
