/**
 * RC6.1 platform definition catalog — default workflow + approval seeds.
 */

export {
  PLATFORM_DEFINITIONS_CATALOG_VERSION,
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
  computePlatformDefinitionsChecksum,
  seedPlatformDefinitions,
} from "./seed.js";
export type {
  SeedCounts,
  PlatformDefinitionsSeedReport,
  SeedPlatformDefinitionsDependencies,
} from "./seed.js";
