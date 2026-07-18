import type { PlatformError, Result } from "@afh/shared-kernel";

export type BackgroundJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type BackgroundJobKind =
  | "bulk_import"
  | "bulk_export"
  | "bulk_update"
  | "report_run"
  | "search_reindex"
  | "other";

export type BackgroundJob = {
  readonly id: string;
  readonly companyId: string;
  readonly kind: BackgroundJobKind;
  readonly status: BackgroundJobStatus;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly result: Readonly<Record<string, unknown>> | null;
  readonly errorCode: string | null;
  readonly requestedByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
};

export type BackgroundJobRepository = {
  findById(key: {
    companyId: string;
    id: string;
  }): Promise<Result<BackgroundJob | null, PlatformError>>;
  save(job: BackgroundJob): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    limit?: number,
  ): Promise<Result<readonly BackgroundJob[], PlatformError>>;
};

export type EnqueueBackgroundJobPayload = {
  readonly companyId: string;
  readonly kind: BackgroundJobKind;
  readonly payload?: Readonly<Record<string, unknown>>;
};

export type GetBackgroundJobPayload = {
  readonly companyId: string;
  readonly jobId: string;
};

export type ListBackgroundJobsPayload = {
  readonly companyId: string;
  readonly limit?: number;
};

export type CompleteBackgroundJobPayload = {
  readonly companyId: string;
  readonly jobId: string;
  readonly result?: Readonly<Record<string, unknown>>;
};

export type FailBackgroundJobPayload = {
  readonly companyId: string;
  readonly jobId: string;
  readonly errorCode: string;
};
