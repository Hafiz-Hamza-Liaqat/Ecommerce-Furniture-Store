/**
 * Persistence configuration abstractions — no provider-specific config.
 */

export type PersistenceConfig = {
  readonly adapterName: string;
  readonly defaultOutboxBatchSize: number;
  readonly optimisticConcurrencyEnabled: boolean;
};

export const DEFAULT_PERSISTENCE_CONFIG: PersistenceConfig = {
  adapterName: "in-memory",
  defaultOutboxBatchSize: 50,
  optimisticConcurrencyEnabled: true,
};

export interface PersistenceConfigProvider {
  get(): PersistenceConfig;
}

export class StaticPersistenceConfigProvider
  implements PersistenceConfigProvider
{
  constructor(private readonly config: PersistenceConfig) {}

  get(): PersistenceConfig {
    return this.config;
  }
}
