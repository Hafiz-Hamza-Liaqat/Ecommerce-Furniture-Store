import type { CommandHandler, FetchListCandidates, QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { Content, ContentKind } from "@afh/cms";
import type { Page } from "@afh/shared-kernel";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import {
  CmsCommandTypes,
  CmsPolicyActions,
  CmsQueryTypes,
  KNOWN_CONTENT_KINDS,
} from "../constants.js";
import type {
  CreateCmsEntryPayload,
  UpdateCmsEntryPayload,
} from "../commands/commands.js";
import type {
  GetCmsEntryPayload,
  GetCmsEntryResult,
  ListCmsEntryPayload,
} from "../queries/queries.js";
import {
  createCmsEntryCommandValidator,
  getCmsEntryQueryValidator,
  listCmsEntryQueryValidator,
  updateCmsEntryCommandValidator,
} from "../validators/validators.js";
import type { CmsHandlerDeps } from "./deps.js";
import {
  companyResource,
  loadRecordForAuthorization,
  newEntityId,
  recordCmsAudit,
  requireCompanyId,
} from "../support/support.js";

export type CreateCmsEntryResult = {
  readonly contentId: string;
};

export type UpdateCmsEntryResult = {
  readonly contentId: string;
};

function mapContentKind(value: string): ContentKind {
  return (KNOWN_CONTENT_KINDS as readonly string[]).includes(value)
    ? (value as ContentKind)
    : "page";
}

export function createCreateCmsEntryHandler(
  deps: CmsHandlerDeps,
): CommandHandler<CreateCmsEntryPayload, CreateCmsEntryResult> {
  return {
    commandType: CmsCommandTypes.CreateCmsEntry,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "cms_content",
        CmsPolicyActions.ContentCreate,
        p.companyId,
        null,
        { attributes: { kind: p.kind } },
      );
    },
    validate() {
      return createCmsEntryCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const published = p.publish === true;

      const content: Content = {
        id,
        companyId: scope.value,
        kind: mapContentKind(p.kind),
        slug: p.slug,
        title: p.title,
        summary: p.summary ?? null,
        bodyRef: p.bodyRef ?? null,
        status: published ? "published" : "draft",
        currentRevisionId: null,
        publishedRevisionId: null,
        authorUserId: ctx.userId,
        localeCode: p.localeCode ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.content.save(content);
      if (!saved.ok) return saved;

      await recordCmsAudit(deps.audit, ctx, {
        action: CmsPolicyActions.ContentCreate,
        entityType: "cms_content",
        entityId: id,
        outcome: "success",
        details: { kind: content.kind, status: content.status },
      });

      return ok({ contentId: id });
    },
  };
}

export function createUpdateCmsEntryHandler(
  deps: CmsHandlerDeps,
): CommandHandler<UpdateCmsEntryPayload, UpdateCmsEntryResult> {
  return {
    commandType: CmsCommandTypes.UpdateCmsEntry,
    async authorize(command) {
      const p = command.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.content.findById({ companyId: p.companyId, id: p.contentId }),
      );
      return companyResource(
        "cms_content",
        CmsPolicyActions.ContentUpdate,
        p.companyId,
        p.contentId,
        { attributes: { kind: record?.kind ?? null } },
      );
    },
    validate() {
      return updateCmsEntryCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.content.findById({
        companyId: scope.value,
        id: command.payload.contentId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Content entry not found", {
            code: "cms_content_not_found",
          }),
        );
      }

      const p = command.payload;
      const now = ctx.clock.now().toISOString();
      const status =
        p.publish !== undefined
          ? p.publish
            ? "published"
            : "draft"
          : existing.value.status;

      const updated: Content = {
        ...existing.value,
        title: p.title !== undefined ? p.title : existing.value.title,
        summary: p.summary !== undefined ? p.summary : existing.value.summary,
        bodyRef: p.bodyRef !== undefined ? p.bodyRef : existing.value.bodyRef,
        localeCode:
          p.localeCode !== undefined ? p.localeCode : existing.value.localeCode,
        status,
        updatedAt: now,
      };

      const saved = await deps.content.save(updated);
      if (!saved.ok) return saved;

      await recordCmsAudit(deps.audit, ctx, {
        action: CmsPolicyActions.ContentUpdate,
        entityType: "cms_content",
        entityId: updated.id,
        outcome: "success",
        details: { status: updated.status },
      });

      return ok({ contentId: updated.id });
    },
  };
}

export function createGetCmsEntryHandler(
  deps: CmsHandlerDeps,
): QueryHandler<GetCmsEntryPayload, GetCmsEntryResult> {
  return {
    queryType: CmsQueryTypes.GetCmsEntry,
    async authorize(query) {
      const p = query.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.content.findById({ companyId: p.companyId, id: p.contentId }),
      );
      return companyResource(
        "cms_content",
        CmsPolicyActions.ContentRead,
        p.companyId,
        p.contentId,
        { attributes: { kind: record?.kind ?? null } },
      );
    },
    validate() {
      return getCmsEntryQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const found = await deps.content.findById({
        companyId: scope.value,
        id: query.payload.contentId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Content entry not found", {
            code: "cms_content_not_found",
          }),
        );
      }

      return ok({ content: found.value });
    },
  };
}

function createContentListCandidateFetcher(
  list: CmsHandlerDeps["content"]["list"],
): FetchListCandidates<Content> {
  let prepared: Content[] | null = null;

  return async ({ companyId, offset, limit }) => {
    if (prepared === null) {
      const all: Content[] = [];
      let page = 1;
      for (;;) {
        const batch = await list(companyId, { page, pageSize: 100 });
        if (!batch.ok) {
          return batch;
        }
        all.push(...batch.value.items);
        if (!batch.value.hasMore) {
          break;
        }
        page += 1;
      }
      prepared = all;
    }

    return ok(prepared.slice(offset, offset + limit));
  };
}

export function createListCmsEntryHandler(
  deps: CmsHandlerDeps,
): QueryHandler<ListCmsEntryPayload, Page<Content>> {
  return {
    queryType: CmsQueryTypes.ListCmsEntry,
    authorize(query, ctx) {
      return companyResource(
        "cms_content",
        CmsPolicyActions.ContentRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, CmsPolicyActions.ContentRead),
      );
    },
    validate() {
      return listCmsEntryQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<Content>({
        ctx,
        action: CmsPolicyActions.ContentRead,
        resourceType: "cms_content",
        request,
        toScope: (content) => ({
          id: content.id,
          companyId: content.companyId ?? scope.value,
        }),
        fetchCandidates: createContentListCandidateFetcher((companyId, page) =>
          deps.content.list(companyId, page),
        ),
      });
    },
  };
}
