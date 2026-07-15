/**
 * Presentation API types — mirror transport DTOs only.
 */

export type ApiErrorBody = {
  readonly error: {
    readonly code: string;
    readonly category: string;
    readonly message: string;
    readonly details: Record<string, unknown>;
    readonly retryable: boolean;
    readonly correlationId: string | null;
  };
};

export type ApiSuccess<T> = {
  readonly ok: true;
  readonly data: T;
  readonly correlationId: string;
};

export type SessionTokens = {
  readonly sessionId: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly absoluteExpiresAt: string;
};

export type AuthUser = {
  readonly id: string;
  readonly email: string;
  readonly companyId: string | null;
  readonly status: string;
  readonly mfaEnabled: boolean;
  readonly fullName?: string | null;
};

export class ApiClientError extends Error {
  readonly code: string;
  readonly category: string;
  readonly correlationId: string | null;
  readonly retryable: boolean;
  readonly details: Record<string, unknown>;
  readonly status: number;

  constructor(
    status: number,
    body: ApiErrorBody["error"],
  ) {
    super(body.message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = body.code;
    this.category = body.category;
    this.correlationId = body.correlationId;
    this.retryable = body.retryable;
    this.details = body.details;
  }
}
