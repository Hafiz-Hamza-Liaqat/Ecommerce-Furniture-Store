import type { ContentRepository } from "@afh/cms";
import type { SecurityAuditService } from "@afh/identity";

export type CmsHandlerDeps = {
  readonly content: ContentRepository;
  readonly audit: SecurityAuditService;
};
