import type { SecurityAuditService } from "@afh/identity";
import { NotFoundError, ValidationError, fail, ok } from "@afh/shared-kernel";
import type { CommandHandler, QueryHandler } from "../handlers/handlers.js";
import { CollaborationCommandTypes, CollaborationQueryTypes } from "./constants.js";
import { parentEntityResource } from "./policy.js";
import {
  newEntityId,
  recordCollaborationAudit,
  requireCompanyId,
} from "./support.js";
import type {
  CollaborationParentBinding,
  CreateEntityNotePayload,
  DeleteEntityNotePayload,
  EntityNote,
  EntityNoteRepository,
  ListEntityNotesPayload,
} from "./types.js";

export type CollaborationNoteHandlerDeps = {
  readonly notes: EntityNoteRepository;
  readonly audit?: SecurityAuditService;
  readonly binding: CollaborationParentBinding;
  readonly allowedEntityType: string;
};

export type CollaborationNoteHandlers = {
  readonly create: CommandHandler<CreateEntityNotePayload, { noteId: string }>;
  readonly delete: CommandHandler<DeleteEntityNotePayload, void>;
  readonly list: QueryHandler<
    ListEntityNotesPayload,
    { notes: readonly EntityNote[] }
  >;
};

function rejectEntityTypeMismatch(
  entityType: string,
  allowedEntityType: string,
) {
  if (entityType !== allowedEntityType) {
    return fail(
      new ValidationError("entityType is not supported for this binding", {
        code: "entity_type_mismatch",
        details: { entityType, allowedEntityType },
      }),
    );
  }
  return null;
}

export function createCollaborationNoteHandlers(
  deps: CollaborationNoteHandlerDeps,
): CollaborationNoteHandlers {
  const { notes, binding, allowedEntityType } = deps;

  const create: CommandHandler<CreateEntityNotePayload, { noteId: string }> = {
    commandType: CollaborationCommandTypes.CreateEntityNote,
    authorize(command) {
      return parentEntityResource(
        binding.parentResourceType,
        binding.parentUpdateAction,
        command.payload.companyId,
        command.payload.entityId,
      );
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const typeMismatch = rejectEntityTypeMismatch(
        command.payload.entityType,
        allowedEntityType,
      );
      if (typeMismatch) return typeMismatch;

      const body = command.payload.body.trim();
      if (!body) {
        return fail(
          new ValidationError("body is required", { code: "body_required" }),
        );
      }

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const note: EntityNote = {
        id,
        companyId: scope.value,
        entityType: command.payload.entityType,
        entityId: command.payload.entityId,
        body,
        createdByUserId: ctx.userId,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await notes.save(note);
      if (!saved.ok) return saved;

      if (deps.audit) {
        await recordCollaborationAudit(deps.audit, ctx, {
          action: CollaborationCommandTypes.CreateEntityNote,
          entityType: "collaboration.note",
          entityId: id,
          outcome: "success",
          details: {
            parentEntityType: command.payload.entityType,
            parentEntityId: command.payload.entityId,
          },
        });
      }

      return ok({ noteId: id });
    },
  };

  const del: CommandHandler<DeleteEntityNotePayload, void> = {
    commandType: CollaborationCommandTypes.DeleteEntityNote,
    async authorize(command) {
      const found = await notes.findById({
        companyId: command.payload.companyId,
        id: command.payload.id,
      });
      if (!found.ok) {
        throw found.error;
      }
      if (!found.value) {
        return parentEntityResource(
          binding.parentResourceType,
          binding.parentUpdateAction,
          command.payload.companyId,
          command.payload.id,
        );
      }
      return parentEntityResource(
        binding.parentResourceType,
        binding.parentUpdateAction,
        found.value.companyId,
        found.value.entityId,
      );
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const found = await notes.findById({
        companyId: scope.value,
        id: command.payload.id,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Entity note not found", {
            code: "note_not_found",
            details: { id: command.payload.id },
          }),
        );
      }

      const typeMismatch = rejectEntityTypeMismatch(
        found.value.entityType,
        allowedEntityType,
      );
      if (typeMismatch) return typeMismatch;

      const removed = await notes.remove({
        companyId: scope.value,
        id: command.payload.id,
      });
      if (!removed.ok) return removed;

      if (deps.audit) {
        await recordCollaborationAudit(deps.audit, ctx, {
          action: CollaborationCommandTypes.DeleteEntityNote,
          entityType: "collaboration.note",
          entityId: command.payload.id,
          outcome: "success",
        });
      }

      return ok(undefined);
    },
  };

  const list: QueryHandler<
    ListEntityNotesPayload,
    { notes: readonly EntityNote[] }
  > = {
    queryType: CollaborationQueryTypes.ListEntityNotes,
    authorize(query) {
      return parentEntityResource(
        binding.parentResourceType,
        binding.parentReadAction,
        query.payload.companyId,
        query.payload.entityId,
      );
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const typeMismatch = rejectEntityTypeMismatch(
        query.payload.entityType,
        allowedEntityType,
      );
      if (typeMismatch) return typeMismatch;

      const listed = await notes.listByEntity(
        scope.value,
        query.payload.entityType,
        query.payload.entityId,
      );
      if (!listed.ok) return listed;

      return ok({ notes: listed.value });
    },
  };

  return { create, delete: del, list };
}

/** Alias for module-specific registration helpers. */
export const createNoteHandlers = createCollaborationNoteHandlers;
