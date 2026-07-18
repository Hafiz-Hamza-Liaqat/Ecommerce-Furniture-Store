import type {
  AssetRepository,
  AssetVersionRepository,
  ObjectStore,
} from "@afh/dam";
import type { SecurityAuditService } from "@afh/identity";

export type DamHandlerDeps = {
  readonly assets: AssetRepository;
  readonly versions: AssetVersionRepository;
  readonly objectStore: ObjectStore;
  readonly audit: SecurityAuditService;
};
