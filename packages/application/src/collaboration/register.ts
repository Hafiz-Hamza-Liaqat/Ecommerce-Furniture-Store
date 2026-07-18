import type { SecurityAuditService } from "@afh/identity";
import type { HandlerRegistry } from "../handlers/handlers.js";
import { createCollaborationAttachmentHandlers } from "./attachment-handlers.js";
import { createCollaborationNoteHandlers } from "./note-handlers.js";
import type {
  AssetExistenceChecker,
  CollaborationEntityBinding,
  EntityAttachmentLinkRepository,
  EntityNoteRepository,
} from "./types.js";

export type RegisterCollaborationHandlersDeps = {
  readonly notes: EntityNoteRepository;
  readonly attachmentLinks: EntityAttachmentLinkRepository;
  readonly assets?: AssetExistenceChecker;
  readonly audit?: SecurityAuditService;
  readonly bindings: readonly CollaborationEntityBinding[];
};

export function registerCollaborationHandlers(
  handlers: HandlerRegistry,
  deps: RegisterCollaborationHandlersDeps,
): void {
  const noteHandlers = createCollaborationNoteHandlers({
    notes: deps.notes,
    bindings: deps.bindings,
    ...(deps.audit ? { audit: deps.audit } : {}),
  });
  handlers.registerCommand(noteHandlers.create);
  handlers.registerCommand(noteHandlers.delete);
  handlers.registerQuery(noteHandlers.list);

  const attachmentHandlers = createCollaborationAttachmentHandlers({
    attachmentLinks: deps.attachmentLinks,
    bindings: deps.bindings,
    ...(deps.audit ? { audit: deps.audit } : {}),
    ...(deps.assets ? { assets: deps.assets } : {}),
  });
  handlers.registerCommand(attachmentHandlers.attach);
  handlers.registerCommand(attachmentHandlers.detach);
  handlers.registerQuery(attachmentHandlers.list);
}
