/**
 * Database provider layer — connection/health abstraction over Persistence.
 * No business logic. SQL adapters can replace later.
 */

import type {
  DatabaseClient,
  PersistenceFoundation,
} from "@afh/persistence";
import type { PlatformError, Result } from "@afh/shared-kernel";
import { ok } from "@afh/shared-kernel";

export type DatabaseHealth = {
  readonly healthy: boolean;
  readonly provider: string;
  readonly detail: string | null;
};

export interface DatabaseProvider {
  readonly name: string;
  readonly client: DatabaseClient;
  healthCheck(): Promise<Result<DatabaseHealth, PlatformError>>;
}

export class InMemoryDatabaseProvider implements DatabaseProvider {
  readonly name = "in-memory";
  readonly client: DatabaseClient;

  constructor(client: DatabaseClient) {
    this.client = client;
  }

  async healthCheck(): Promise<Result<DatabaseHealth, PlatformError>> {
    return ok({
      healthy: true,
      provider: this.name,
      detail: "in-memory database ready",
    });
  }
}

export function createDatabaseProviderFromPersistence(
  persistence: PersistenceFoundation,
): DatabaseProvider {
  return new InMemoryDatabaseProvider(persistence.database);
}
