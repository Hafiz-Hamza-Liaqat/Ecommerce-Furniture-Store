import type { SecurityAuditService } from "@afh/identity";
import { NotFoundError, ValidationError, fail, ok } from "@afh/shared-kernel";
import type { CommandHandler, QueryHandler } from "../handlers/handlers.js";
import {
  firstBindingParent,
  normalizeCollaborationBindings,
  resolveBinding,
  type LegacyCollaborationBindingDeps,
  type MultiCollaborationBindingDeps,
} from "./bindings.js";
import { CollaborationCommandTypes, CollaborationQueryTypes } from "./constants.js";
import { parentEntityResource } from "./policy.js";
import {
  newEntityId,
  recordCollaborationAudit,
  requireCompanyId,
} from "./support.js";
import type {
  AssetExistenceChecker,
  AttachEntityAssetPayload,
  DetachEntityAssetPayload,
  EntityAttachmentLink,
  EntityAttachmentLinkRepository,
  ListEntityAttachmentsPayload,
} from "./types.js";

export type CollaborationAttachmentHandlerDeps = {
  readonly attachmentLinks: EntityAttachmentLinkRepository;
  readonly audit?: SecurityAuditService;
  readonly assets?: AssetExistenceChecker;
} & (MultiCollaborationBindingDeps | LegacyCollaborationBindingDeps);

export type CollaborationAttachmentHandlers = {
  readonly attach: CommandHandler<AttachEntityAssetPayload, { linkId: string }>;
  readonly detach: CommandHandler<DetachEntityAssetPayload, void>;
  readonly list: QueryHandler<
    ListEntityAttachmentsPayload,
    { attachments: readonly EntityAttachmentLink[] }
  >;
};

export function createCollaborationAttachmentHandlers(
  deps: CollaborationAttachmentHandlerDeps,
): CollaborationAttachmentHandlers {
  const bindings = normalizeCollaborationBindings(deps);
  const { attachmentLinks } = deps;
  const fallbackParent = firstBindingParent(bindings);

  const attach: CommandHandler<AttachEntityAssetPayload, { linkId: string }> = {
    commandType: CollaborationCommandTypes.AttachEntityAsset,
    authorize(command) {
      const resolved = resolveBinding(bindings, command.payload.entityType);
      if (!resolved.ok) {
        throw resolved.error;
      }
      return parentEntityResource(
        resolved.value.parent.parentResourceType,
        resolved.value.parent.parentUpdateAction,
        command.payload.companyId,
        command.payload.entityId,
      );
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const resolved = resolveBinding(bindings, command.payload.entityType);
      if (!resolved.ok) return resolved;

      const assetId = command.payload.assetId.trim();
      if (!assetId) {
        return fail(
          new ValidationError("assetId is required", { code: "asset_required" }),
        );
      }

      if (deps.assets) {
        const asset = await deps.assets.findById({
          companyId: scope.value,
          id: assetId,
        });
        if (!asset.ok) return asset;
        if (!asset.value || asset.value.companyId !== scope.value) {
          return fail(
            new NotFoundError("Asset not found", {
              code: "asset_not_found",
              details: { assetId },
            }),
          );
        }
      }

      const purpose = command.payload.purpose.trim();
      if (!purpose) {
        return fail(
          new ValidationError("purpose is required", { code: "purpose_required" }),
        );
      }

      const id = newEntityId();
      const link: EntityAttachmentLink = {
        id,
        companyId: scope.value,
        assetId,
        entityType: command.payload.entityType,
        entityId: command.payload.entityId,
        purpose,
        attachedAt: ctx.clock.now().toISOString(),
        attachedByUserId: ctx.userId,
      };

      const saved = await attachmentLinks.save(link);
      if (!saved.ok) return saved;

      if (deps.audit) {
        await recordCollaborationAudit(deps.audit, ctx, {
          action: CollaborationCommandTypes.AttachEntityAsset,
          entityType: "collaboration.attachment",
          entityId: id,
          outcome: "success",
          details: {
            assetId,
            parentEntityType: command.payload.entityType,
            parentEntityId: command.payload.entityId,
          },
        });
      }

      return ok({ linkId: id });
    },
  };

  const detach: CommandHandler<DetachEntityAssetPayload, void> = {
    commandType: CollaborationCommandTypes.DetachEntityAsset,
    async authorize(command) {
      const found = await attachmentLinks.findById({
        companyId: command.payload.companyId,
        id: command.payload.id,
      });
      if (!found.ok) {
        throw found.error;
      }
      if (!found.value) {
        return parentEntityResource(
          fallbackParent.parentResourceType,
          fallbackParent.parentUpdateAction,
          command.payload.companyId,
          command.payload.id,
        );
      }

      const resolved = resolveBinding(bindings, found.value.entityType);
      if (!resolved.ok) {
        throw resolved.error;
      }

      return parentEntityResource(
        resolved.value.parent.parentResourceType,
        resolved.value.parent.parentUpdateAction,
        found.value.companyId,
        found.value.entityId,
      );
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const found = await attachmentLinks.findById({
        companyId: scope.value,
        id: command.payload.id,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Entity attachment link not found", {
            code: "attachment_link_not_found",
            details: { id: command.payload.id },
          }),
        );
      }

      const resolved = resolveBinding(bindings, found.value.entityType);
      if (!resolved.ok) return resolved;

      const removed = await attachmentLinks.remove({
        companyId: scope.value,
        id: command.payload.id,
      });
      if (!removed.ok) return removed;

      if (deps.audit) {
        await recordCollaborationAudit(deps.audit, ctx, {
          action: CollaborationCommandTypes.DetachEntityAsset,
          entityType: "collaboration.attachment",
          entityId: command.payload.id,
          outcome: "success",
        });
      }

      return ok(undefined);
    },
  };

  const list: QueryHandler<
    ListEntityAttachmentsPayload,
    { attachments: readonly EntityAttachmentLink[] }
  > = {
    queryType: CollaborationQueryTypes.ListEntityAttachments,
    authorize(query) {
      const resolved = resolveBinding(bindings, query.payload.entityType);
      if (!resolved.ok) {
        throw resolved.error;
      }
      return parentEntityResource(
        resolved.value.parent.parentResourceType,
        resolved.value.parent.parentReadAction,
        query.payload.companyId,
        query.payload.entityId,
      );
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const resolved = resolveBinding(bindings, query.payload.entityType);
      if (!resolved.ok) return resolved;

      const listed = await attachmentLinks.listByEntity(
        scope.value,
        query.payload.entityType,
        query.payload.entityId,
      );
      if (!listed.ok) return listed;

      return ok({ attachments: listed.value });
    },
  };

  return { attach, detach, list };
}
