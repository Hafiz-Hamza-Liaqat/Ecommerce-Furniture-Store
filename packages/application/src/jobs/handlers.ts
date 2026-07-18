import type { SecurityAuditService } from "@afh/identity";
import { NotFoundError, ValidationError, fail, ok } from "@afh/shared-kernel";
import type { CommandHandler, QueryHandler } from "../handlers/handlers.js";
import { companyResource, recordBulkAudit, requireCompanyId } from "../bulk-io/support.js";
import { JobCommandTypes, JobPolicyActions, JobQueryTypes } from "./constants.js";
import type {
  BackgroundJob,
  BackgroundJobRepository,
  CompleteBackgroundJobPayload,
  EnqueueBackgroundJobPayload,
  FailBackgroundJobPayload,
  GetBackgroundJobPayload,
  ListBackgroundJobsPayload,
} from "./types.js";

export type JobHandlerDeps = {
  readonly jobs: BackgroundJobRepository;
  readonly audit?: SecurityAuditService;
};

function newId(): string {
  return crypto.randomUUID();
}

export function createJobHandlers(deps: JobHandlerDeps): {
  readonly enqueue: CommandHandler<EnqueueBackgroundJobPayload, { jobId: string }>;
  readonly complete: CommandHandler<CompleteBackgroundJobPayload, void>;
  readonly fail: CommandHandler<FailBackgroundJobPayload, void>;
  readonly get: QueryHandler<GetBackgroundJobPayload, { job: BackgroundJob }>;
  readonly list: QueryHandler<
    ListBackgroundJobsPayload,
    { jobs: readonly BackgroundJob[] }
  >;
} {
  const enqueue: CommandHandler<EnqueueBackgroundJobPayload, { jobId: string }> = {
    commandType: JobCommandTypes.EnqueueBackgroundJob,
    authorize(command) {
      return companyResource(
        "background_job",
        JobPolicyActions.Enqueue,
        command.payload.companyId,
      );
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const id = newId();
      const now = ctx.clock.now().toISOString();
      const job: BackgroundJob = {
        id,
        companyId: scope.value,
        kind: command.payload.kind,
        status: "queued",
        payload: command.payload.payload ?? {},
        result: null,
        errorCode: null,
        requestedByUserId: ctx.userId,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };
      const saved = await deps.jobs.save(job);
      if (!saved.ok) return saved;

      await recordBulkAudit(deps.audit, ctx, {
        action: JobCommandTypes.EnqueueBackgroundJob,
        entityType: "background_job",
        entityId: id,
        outcome: "success",
        details: { kind: job.kind },
      });

      return ok({ jobId: id });
    },
  };

  const complete: CommandHandler<CompleteBackgroundJobPayload, void> = {
    commandType: JobCommandTypes.CompleteBackgroundJob,
    async authorize(command) {
      await deps.jobs.findById({
        companyId: command.payload.companyId,
        id: command.payload.jobId,
      });
      return companyResource(
        "background_job",
        JobPolicyActions.Complete,
        command.payload.companyId,
        command.payload.jobId,
      );
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.jobs.findById({
        companyId: scope.value,
        id: command.payload.jobId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Background job not found", {
            code: "background_job_not_found",
          }),
        );
      }
      const now = ctx.clock.now().toISOString();
      const updated: BackgroundJob = {
        ...found.value,
        status: "succeeded",
        result: command.payload.result ?? {},
        errorCode: null,
        updatedAt: now,
        completedAt: now,
      };
      const saved = await deps.jobs.save(updated);
      if (!saved.ok) return saved;
      return ok(undefined);
    },
  };

  const failJob: CommandHandler<FailBackgroundJobPayload, void> = {
    commandType: JobCommandTypes.FailBackgroundJob,
    async authorize(command) {
      await deps.jobs.findById({
        companyId: command.payload.companyId,
        id: command.payload.jobId,
      });
      return companyResource(
        "background_job",
        JobPolicyActions.Complete,
        command.payload.companyId,
        command.payload.jobId,
      );
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;
      if (!command.payload.errorCode.trim()) {
        return fail(
          new ValidationError("errorCode is required", { code: "error_code_required" }),
        );
      }
      const found = await deps.jobs.findById({
        companyId: scope.value,
        id: command.payload.jobId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Background job not found", {
            code: "background_job_not_found",
          }),
        );
      }
      const now = ctx.clock.now().toISOString();
      const updated: BackgroundJob = {
        ...found.value,
        status: "failed",
        errorCode: command.payload.errorCode,
        updatedAt: now,
        completedAt: now,
      };
      const saved = await deps.jobs.save(updated);
      if (!saved.ok) return saved;
      return ok(undefined);
    },
  };

  const get: QueryHandler<GetBackgroundJobPayload, { job: BackgroundJob }> = {
    queryType: JobQueryTypes.GetBackgroundJob,
    authorize(query) {
      return companyResource(
        "background_job",
        JobPolicyActions.Read,
        query.payload.companyId,
        query.payload.jobId,
      );
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const found = await deps.jobs.findById({
        companyId: scope.value,
        id: query.payload.jobId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Background job not found", {
            code: "background_job_not_found",
          }),
        );
      }
      return ok({ job: found.value });
    },
  };

  const list: QueryHandler<
    ListBackgroundJobsPayload,
    { jobs: readonly BackgroundJob[] }
  > = {
    queryType: JobQueryTypes.ListBackgroundJobs,
    authorize(query) {
      return companyResource(
        "background_job",
        JobPolicyActions.Read,
        query.payload.companyId,
      );
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;
      const listed = await deps.jobs.listByCompany(
        scope.value,
        query.payload.limit ?? 50,
      );
      if (!listed.ok) return listed;
      return ok({ jobs: listed.value });
    },
  };

  return { enqueue, complete, fail: failJob, get, list };
}
