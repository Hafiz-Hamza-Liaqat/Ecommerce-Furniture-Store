/**
 * Transport DTO contracts — request/response shapes only.
 * Domain models are never exposed directly.
 */

export type ErrorBodyDto = {
  readonly error: {
    readonly code: string;
    readonly category: string;
    readonly message: string;
    readonly details: Readonly<Record<string, unknown>>;
    readonly retryable: boolean;
    readonly correlationId: string | null;
  };
};

export type DispatchCommandRequestDto = {
  readonly commandType: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly idempotencyKey?: string | null;
};

export type DispatchQueryRequestDto = {
  readonly queryType: string;
  readonly payload: Readonly<Record<string, unknown>>;
};

export type DispatchSuccessDto<T = unknown> = {
  readonly ok: true;
  readonly data: T;
  readonly correlationId: string;
};

export type HealthLiveDto = {
  readonly status: "alive";
  readonly service: string;
};

export type HealthReadyDto = {
  readonly status: "ready" | "not_ready";
  readonly checks: readonly {
    readonly name: string;
    readonly status: string;
    readonly detail: string | null;
  }[];
};

export type HealthStartupDto = {
  readonly status: "started" | "starting" | "failed";
  readonly ready: boolean;
};

export type VersionDto = {
  readonly service: string;
  readonly version: string;
  readonly apiVersion: string;
};

export type UploadRequestDto = {
  readonly companyId: string;
  readonly name: string;
  readonly assetType?: string;
  readonly classification?: string;
  readonly mimeType?: string | null;
  readonly folderId?: string | null;
};

export type UploadAcceptedDto = {
  readonly assetId: string;
  readonly companyId: string;
  readonly name: string;
  readonly status: string;
};
