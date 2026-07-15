/**
 * API transport constants.
 */

export const API_SERVICE_NAME = "afh-api";
export const API_PACKAGE_VERSION = "0.1.0";

/** Default API version segment (ADR D17) */
export const DEFAULT_API_VERSION = "v1";

export const ApiPaths = {
  Live: "/health/live",
  Ready: "/health/ready",
  Startup: "/health/startup",
  Version: "/health/version",
  Commands: "/api/v1/commands",
  Queries: "/api/v1/queries",
  Uploads: "/api/v1/uploads",
  OpenApi: "/api/v1/openapi.json",
} as const;

export const CorrelationHeader = "x-correlation-id";
export const CompanyHeader = "x-company-id";
export const BranchHeader = "x-branch-id";
export const IdempotencyHeader = "idempotency-key";
export const AuthorizationHeader = "authorization";
