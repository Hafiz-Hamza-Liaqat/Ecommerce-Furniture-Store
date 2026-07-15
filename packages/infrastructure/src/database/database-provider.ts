/**
 * Database provider layer — connection/health abstraction over Persistence.
 * No business logic. SQL adapters inject PersistenceFoundation.
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

export class PersistenceDatabaseProvider implements DatabaseProvider {
  readonly name: string;
  readonly client: DatabaseClient;

  constructor(client: DatabaseClient) {
    this.client = client;
    this.name = client.name;
  }

  async healthCheck(): Promise<Result<DatabaseHealth, PlatformError>> {
    const check = await this.client.healthCheck();
    if (!check.ok) {
      return ok({
        healthy: false,
        provider: this.name,
        detail: check.error.message,
      });
    }
    return ok({
      healthy: true,
      provider: this.name,
      detail: `${this.name} database ready`,
    });
  }
}

/** @deprecated Prefer PersistenceDatabaseProvider — kept for compatibility */
export class InMemoryDatabaseProvider extends PersistenceDatabaseProvider {
  constructor(client: DatabaseClient) {
    super(client);
  }
}

export function createDatabaseProviderFromPersistence(
  persistence: PersistenceFoundation,
): DatabaseProvider {
  return new PersistenceDatabaseProvider(persistence.database);
}
