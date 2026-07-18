/**
 * Search application composition root.
 */

import { HandlerRegistry } from "@afh/application";
import type { SearchDocumentRepository, SearchRepository } from "@afh/search";
import type { SecurityAuditService } from "@afh/identity";
import {
  createIndexSearchDocumentHandler,
  createSearchQueryHandler,
} from "../handlers/search-handlers.js";
import type { SearchHandlerDeps } from "../handlers/deps.js";

export type CreateSearchApplicationOptions = {
  readonly documents: SearchDocumentRepository;
  readonly search: SearchRepository;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type SearchApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: SearchHandlerDeps;
};

export function createSearchApplication(
  options: CreateSearchApplicationOptions,
): SearchApplication {
  const deps: SearchHandlerDeps = {
    documents: options.documents,
    search: options.search,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();
  handlers.registerCommand(createIndexSearchDocumentHandler(deps));
  handlers.registerQuery(createSearchQueryHandler(deps));

  return { handlers, deps };
}
