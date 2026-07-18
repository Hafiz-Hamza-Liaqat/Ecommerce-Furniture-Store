/**
 * CMS application composition root.
 */

import { HandlerRegistry } from "@afh/application";
import type { ContentRepository } from "@afh/cms";
import type { SecurityAuditService } from "@afh/identity";
import {
  createCreateCmsEntryHandler,
  createGetCmsEntryHandler,
  createListCmsEntryHandler,
  createUpdateCmsEntryHandler,
} from "../handlers/content-handlers.js";
import type { CmsHandlerDeps } from "../handlers/deps.js";

export type CreateCmsApplicationOptions = {
  readonly content: ContentRepository;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type CmsApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: CmsHandlerDeps;
};

export function createCmsApplication(
  options: CreateCmsApplicationOptions,
): CmsApplication {
  const deps: CmsHandlerDeps = {
    content: options.content,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();
  handlers.registerCommand(createCreateCmsEntryHandler(deps));
  handlers.registerCommand(createUpdateCmsEntryHandler(deps));
  handlers.registerQuery(createGetCmsEntryHandler(deps));
  handlers.registerQuery(createListCmsEntryHandler(deps));

  return { handlers, deps };
}
