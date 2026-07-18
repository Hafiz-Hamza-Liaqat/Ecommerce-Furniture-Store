import type { CommandHandler, FetchListCandidates, QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { ReportDefinition, ReportExecution } from "@afh/reporting";
import type { Page } from "@afh/shared-kernel";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import {
  ReportingCommandTypes,
  ReportingPolicyActions,
  ReportingQueryTypes,
} from "../constants.js";
import type { RunReportPayload } from "../commands/commands.js";
import type {
  GetReportDefinitionPayload,
  GetReportDefinitionResult,
  ListReportDefinitionPayload,
} from "../queries/queries.js";
import {
  getReportDefinitionQueryValidator,
  listReportDefinitionQueryValidator,
  runReportCommandValidator,
} from "../validators/validators.js";
import type { ReportingHandlerDeps } from "./deps.js";
import {
  companyResource,
  loadRecordForAuthorization,
  newEntityId,
  recordReportingAudit,
  requireCompanyId,
} from "../support/support.js";

export type RunReportResult = {
  readonly executionId: string;
  readonly status: ReportExecution["status"];
};

export function createGetReportDefinitionHandler(
  deps: ReportingHandlerDeps,
): QueryHandler<GetReportDefinitionPayload, GetReportDefinitionResult> {
  return {
    queryType: ReportingQueryTypes.GetReportDefinition,
    async authorize(query) {
      const p = query.payload;
      await loadRecordForAuthorization(() =>
        deps.reportDefinitions.findById({
          companyId: p.companyId,
          id: p.reportDefinitionId,
        }),
      );
      return companyResource(
        "report_definition",
        ReportingPolicyActions.ReportRead,
        p.companyId,
        p.reportDefinitionId,
      );
    },
    validate() {
      return getReportDefinitionQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const found = await deps.reportDefinitions.findById({
        companyId: scope.value,
        id: query.payload.reportDefinitionId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Report definition not found", {
            code: "report_definition_not_found",
          }),
        );
      }

      return ok({ reportDefinition: found.value });
    },
  };
}

function createReportDefinitionListCandidateFetcher(
  list: ReportingHandlerDeps["reportDefinitions"]["list"],
): FetchListCandidates<ReportDefinition> {
  let prepared: ReportDefinition[] | null = null;

  return async ({ companyId, offset, limit }) => {
    if (prepared === null) {
      const all: ReportDefinition[] = [];
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

export function createListReportDefinitionHandler(
  deps: ReportingHandlerDeps,
): QueryHandler<ListReportDefinitionPayload, Page<ReportDefinition>> {
  return {
    queryType: ReportingQueryTypes.ListReportDefinition,
    authorize(query, ctx) {
      return companyResource(
        "report_definition",
        ReportingPolicyActions.ReportRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, ReportingPolicyActions.ReportRead),
      );
    },
    validate() {
      return listReportDefinitionQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<ReportDefinition>({
        ctx,
        action: ReportingPolicyActions.ReportRead,
        resourceType: "report_definition",
        request,
        toScope: (definition) => ({
          id: definition.id,
          companyId: definition.companyId ?? scope.value,
        }),
        fetchCandidates: createReportDefinitionListCandidateFetcher((companyId, page) =>
          deps.reportDefinitions.list(companyId, page),
        ),
      });
    },
  };
}

export function createRunReportHandler(
  deps: ReportingHandlerDeps,
): CommandHandler<RunReportPayload, RunReportResult> {
  return {
    commandType: ReportingCommandTypes.RunReport,
    async authorize(command) {
      const p = command.payload;
      await loadRecordForAuthorization(() =>
        deps.reportDefinitions.findById({
          companyId: p.companyId,
          id: p.reportDefinitionId,
        }),
      );
      return companyResource(
        "report_definition",
        ReportingPolicyActions.ReportRun,
        p.companyId,
        p.reportDefinitionId,
      );
    },
    validate() {
      return runReportCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      const definition = await deps.reportDefinitions.findById({
        companyId: scope.value,
        id: p.reportDefinitionId,
      });
      if (!definition.ok) return definition;
      if (!definition.value) {
        return fail(
          new NotFoundError("Report definition not found", {
            code: "report_definition_not_found",
          }),
        );
      }

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();

      /** RC7 V1 — read-model only: no generation engine, snapshot stays empty. */
      const execution: ReportExecution = {
        id,
        companyId: scope.value,
        reportDefinitionId: p.reportDefinitionId,
        status: "succeeded",
        requestedByUserId: ctx.userId,
        snapshotId: null,
        exportRequestId: null,
        startedAt: now,
        completedAt: now,
        errorCode: null,
        createdAt: now,
      };

      const saved = await deps.reportExecutions.save(execution);
      if (!saved.ok) return saved;

      await recordReportingAudit(deps.audit, ctx, {
        action: ReportingPolicyActions.ReportRun,
        entityType: "report_execution",
        entityId: id,
        outcome: "success",
        details: { reportDefinitionId: p.reportDefinitionId },
      });

      return ok({ executionId: id, status: execution.status });
    },
  };
}
