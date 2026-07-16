export {
  CANONICAL_PERMISSION_CODES,
  LEGACY_ACTION_MAP,
  PERMISSION_CATALOG,
  RBAC_CATALOG_VERSION,
  resolveLegacyActionKey,
  type CatalogPermissionDefinition,
} from "./permission-catalog.js";
export {
  ROLE_CATALOG,
  SYSTEM_ROLE_CODES,
  type CatalogRoleDefinition,
  type SystemRoleGroup,
} from "./role-catalog.js";
export {
  APPROVED_ACTIONS,
  FORBIDDEN_MODULE_PREFIXES,
  RESERVED_MODULE_PREFIXES,
  validatePermissionCode,
  validateRbacCatalog,
} from "./validation.js";
export {
  computeCatalogChecksum,
  seedRbacCatalog,
  type RbacCatalogSeedReport,
  type SeedCounts,
  type SeedRbacCatalogDependencies,
} from "./seed.js";
