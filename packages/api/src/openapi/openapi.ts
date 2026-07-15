/**
 * OpenAPI / documentation foundation — metadata only.
 */

import type { RouteDefinition } from "../transport/contracts.js";
import { API_PACKAGE_VERSION, API_SERVICE_NAME } from "../constants.js";
import type { ApiVersionCatalog } from "../versioning/versioning.js";

export type OpenApiDocument = {
  readonly openapi: "3.0.3";
  readonly info: {
    readonly title: string;
    readonly version: string;
    readonly description: string;
  };
  readonly paths: Readonly<
    Record<
      string,
      Readonly<
        Record<
          string,
          {
            readonly summary: string;
            readonly tags: readonly string[];
            readonly security: readonly Record<string, readonly string[]>[];
          }
        >
      >
    >
  >;
  readonly components: {
    readonly securitySchemes: {
      readonly bearerAuth: {
        readonly type: "http";
        readonly scheme: "bearer";
      };
    };
  };
  readonly "x-afh-api-versions": ApiVersionCatalog;
};

export function buildOpenApiDocument(
  routes: readonly RouteDefinition[],
  versionCatalog: ApiVersionCatalog,
): OpenApiDocument {
  const paths: Record<
    string,
    Record<
      string,
      {
        summary: string;
        tags: readonly string[];
        security: readonly Record<string, readonly string[]>[];
      }
    >
  > = {};

  for (const route of routes) {
    const method = route.method.toLowerCase();
    const entry = paths[route.path] ?? {};
    entry[method] = {
      summary: route.summary,
      tags: route.tags,
      security: route.authRequired ? [{ bearerAuth: [] }] : [],
    };
    paths[route.path] = entry;
  }

  return {
    openapi: "3.0.3",
    info: {
      title: API_SERVICE_NAME,
      version: API_PACKAGE_VERSION,
      description:
        "Artisan Furnish Hub enterprise API transport. Commands/queries dispatch through Application Runtime. Policy is the sole authorization engine.",
    },
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
        },
      },
    },
    "x-afh-api-versions": versionCatalog,
  };
}
