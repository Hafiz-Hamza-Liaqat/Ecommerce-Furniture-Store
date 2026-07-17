export {
  ALL_CANONICAL_PERMISSION_CODES,
  ALL_PERMISSION_DEFINITIONS,
  API_PERMISSION_DEFINITIONS,
  CANONICAL_PERMISSION_CODES,
  LEGACY_ACTION_MAP,
  PERMISSION_CATALOG,
  RBAC_CATALOG_VERSION,
  resolveLegacyActionKey,
  type CatalogPermissionDefinition,
} from "./permission-catalog.js";
export {
  ROUTE_ACCESS_CATALOG,
  ROUTE_PERMISSION_CATALOG_VERSION,
  ROUTE_PERMISSION_CODES,
  ROUTE_PERMISSION_DEFINITIONS,
  RoutePermissions,
  type RouteAccessDefinition,
  type RoutePermissionCode,
  type RoutePermissionDefinition,
} from "./route-permission-catalog.js";
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
