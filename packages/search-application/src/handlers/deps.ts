import type { SearchDocumentRepository, SearchRepository } from "@afh/search";
import type { SecurityAuditService } from "@afh/identity";

export type SearchHandlerDeps = {
  readonly documents: SearchDocumentRepository;
  readonly search: SearchRepository;
  readonly audit: SecurityAuditService;
};
