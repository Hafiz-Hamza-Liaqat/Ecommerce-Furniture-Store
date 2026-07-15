/**
 * API versioning foundation — reusable contracts only.
 */

import { DEFAULT_API_VERSION } from "../constants.js";

export type ApiVersion = {
  readonly version: string;
  readonly deprecated: boolean;
  readonly sunsetAt: string | null;
};

export type ApiVersionCatalog = {
  readonly defaultVersion: string;
  readonly versions: readonly ApiVersion[];
};

export const DEFAULT_VERSION_CATALOG: ApiVersionCatalog = {
  defaultVersion: DEFAULT_API_VERSION,
  versions: [
    {
      version: DEFAULT_API_VERSION,
      deprecated: false,
      sunsetAt: null,
    },
  ],
};

export function resolveApiVersion(
  catalog: ApiVersionCatalog,
  requested: string | null,
): ApiVersion {
  const version = requested?.trim() || catalog.defaultVersion;
  const found = catalog.versions.find((v) => v.version === version);
  return (
    found ?? {
      version: catalog.defaultVersion,
      deprecated: false,
      sunsetAt: null,
    }
  );
}

/** Build versioned path prefix, e.g. /api/v1 */
export function apiPrefix(version: string = DEFAULT_API_VERSION): string {
  return `/api/${version}`;
}
