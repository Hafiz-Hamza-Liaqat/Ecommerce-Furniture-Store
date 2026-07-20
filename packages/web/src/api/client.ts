/**
 * Reusable API client — commands, queries, auth, uploads.
 * No business behavior; transport + DTO mapping only.
 *
 * RC9.5 Retry Matrix:
 * - GET — limited retry with backoff on network / 5xx / 429
 * - POST / PUT / PATCH / DELETE — no automatic retry
 */

import {
  ApiClientError,
  type ApiErrorBody,
  type ApiSuccess,
  type AuthUser,
  type SessionTokens,
} from "./types";

type ApiErrorPayload = ApiErrorBody["error"];

export type ApiClientOptions = {
  readonly baseUrl?: string;
  readonly getAccessToken: () => string | null;
  readonly getCompanyId?: () => string | null;
  readonly onUnauthorized?: () => void;
  readonly developerMode?: boolean;
  /** Request timeout in ms (default 30_000). */
  readonly timeoutMs?: number;
  /** Max GET retries after the first attempt (default 2). */
  readonly maxGetRetries?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_GET_RETRIES = 2;

function newCorrelationId(): string {
  return crypto.randomUUID();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** RC9.5 — only idempotent GET is auto-retried. */
export function shouldRetryMethod(method: string): boolean {
  return method.toUpperCase() === "GET";
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export class ApiClient {
  readonly #baseUrl: string;
  readonly #getAccessToken: () => string | null;
  readonly #getCompanyId: () => string | null;
  readonly #onUnauthorized: (() => void) | null;
  readonly #developerMode: boolean;
  readonly #timeoutMs: number;
  readonly #maxGetRetries: number;
  lastCorrelationId: string | null = null;

  constructor(options: ApiClientOptions) {
    this.#baseUrl = options.baseUrl ?? "";
    this.#getAccessToken = options.getAccessToken;
    this.#getCompanyId = options.getCompanyId ?? (() => null);
    this.#onUnauthorized = options.onUnauthorized ?? null;
    this.#developerMode = options.developerMode ?? false;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#maxGetRetries = options.maxGetRetries ?? DEFAULT_GET_RETRIES;
  }

  async signIn(input: {
    readonly email: string;
    readonly password: string;
    readonly mfaToken?: string;
  }): Promise<ApiSuccess<{ user: AuthUser; tokens: SessionTokens }>> {
    return this.#request("POST", "/api/v1/auth/sign-in", {
      body: input,
      auth: false,
    });
  }

  async register(input: {
    readonly email: string;
    readonly password: string;
    readonly fullName: string;
    readonly phone?: string | null;
  }): Promise<ApiSuccess<{ user: AuthUser }>> {
    return this.#request("POST", "/api/v1/auth/register", {
      body: {
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        phone: input.phone ?? null,
      },
      auth: false,
    });
  }

  async refreshSession(input: {
    readonly sessionId: string;
    readonly refreshToken: string;
  }): Promise<ApiSuccess<{ tokens: SessionTokens }>> {
    return this.#request("POST", "/api/v1/auth/refresh", {
      body: input,
      auth: false,
    });
  }

  async signOut(): Promise<ApiSuccess<{ signedOut: boolean }>> {
    return this.#request("POST", "/api/v1/auth/sign-out", { body: {} });
  }

  async getSession(): Promise<
    ApiSuccess<{
      sessionId: string | null;
      user: AuthUser | null;
      permissionCodes: readonly string[];
    }>
  > {
    return this.#request("GET", "/api/v1/auth/session");
  }

  async requestPasswordReset(
    email: string,
  ): Promise<ApiSuccess<unknown>> {
    return this.#request("POST", "/api/v1/auth/password-reset/request", {
      body: { email },
      auth: false,
    });
  }

  async confirmPasswordReset(input: {
    readonly token: string;
    readonly newPassword: string;
  }): Promise<ApiSuccess<{ reset: boolean }>> {
    return this.#request("POST", "/api/v1/auth/password-reset/confirm", {
      body: input,
      auth: false,
    });
  }

  async requestEmailVerification(): Promise<ApiSuccess<unknown>> {
    return this.#request("POST", "/api/v1/auth/email-verification/request", {
      body: {},
    });
  }

  async confirmEmailVerification(
    token: string,
  ): Promise<ApiSuccess<{ verified: boolean }>> {
    return this.#request("POST", "/api/v1/auth/email-verification/confirm", {
      body: { token },
      auth: false,
    });
  }

  async enableMfa(): Promise<ApiSuccess<unknown>> {
    return this.#request("POST", "/api/v1/auth/mfa/enable", { body: {} });
  }

  async dispatchCommand<T = unknown>(input: {
    readonly commandType: string;
    readonly payload: Record<string, unknown>;
    readonly idempotencyKey?: string;
  }): Promise<ApiSuccess<T>> {
    return this.#request("POST", "/api/v1/commands", {
      body: {
        commandType: input.commandType,
        payload: input.payload,
        idempotencyKey: input.idempotencyKey ?? null,
      },
    });
  }

  async dispatchQuery<T = unknown>(input: {
    readonly queryType: string;
    readonly payload: Record<string, unknown>;
  }): Promise<ApiSuccess<T>> {
    return this.#request("POST", "/api/v1/queries", {
      body: {
        queryType: input.queryType,
        payload: input.payload,
      },
    });
  }

  async upload(input: {
    readonly companyId: string;
    readonly name: string;
    readonly assetType?: string;
    readonly classification?: string;
    readonly mimeType?: string | null;
    readonly folderId?: string | null;
  }): Promise<ApiSuccess<unknown>> {
    return this.#request("POST", "/api/v1/uploads", {
      body: input,
    });
  }

  async healthReady(): Promise<unknown> {
    return this.#healthFetch("/health/ready");
  }

  async healthLive(): Promise<unknown> {
    return this.#healthFetch("/health/live");
  }

  async healthStartup(): Promise<unknown> {
    return this.#healthFetch("/health/startup");
  }

  async healthVersion(): Promise<unknown> {
    return this.#healthFetch("/health/version");
  }

  async #healthFetch(path: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const res = await fetch(`${this.#baseUrl}${path}`, {
        signal: controller.signal,
      });
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async #request<T>(
    method: string,
    path: string,
    options: {
      readonly body?: unknown;
      readonly auth?: boolean;
    } = {},
  ): Promise<ApiSuccess<T>> {
    const correlationId = newCorrelationId();
    const maxAttempts = shouldRetryMethod(method)
      ? 1 + this.#maxGetRetries
      : 1;
    let lastError: ApiClientError | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await sleep(Math.min(250 * 2 ** (attempt - 1), 1_000));
      }
      try {
        return await this.#requestOnce<T>(method, path, options, correlationId);
      } catch (err) {
        if (!(err instanceof ApiClientError)) throw err;
        lastError = err;
        const retryable =
          shouldRetryMethod(method) &&
          (err.retryable === true ||
            isRetryableStatus(err.status) ||
            err.code === "timeout" ||
            err.code === "network_error");
        if (!retryable || attempt >= maxAttempts - 1) {
          throw err;
        }
      }
    }

    throw lastError ?? new Error("Request failed");
  }

  async #requestOnce<T>(
    method: string,
    path: string,
    options: {
      readonly body?: unknown;
      readonly auth?: boolean;
    },
    correlationId: string,
  ): Promise<ApiSuccess<T>> {
    const headers: Record<string, string> = {
      accept: "application/json",
      "x-correlation-id": correlationId,
    };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
    }
    const token = this.#getAccessToken();
    if (options.auth !== false && token) {
      headers.authorization = `Bearer ${token}`;
    }
    const companyId = this.#getCompanyId();
    if (companyId) {
      headers["x-company-id"] = companyId;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.#baseUrl}${path}`, {
        method,
        headers,
        signal: controller.signal,
        ...(options.body === undefined
          ? {}
          : { body: JSON.stringify(options.body) }),
      });
    } catch (cause) {
      clearTimeout(timer);
      const aborted =
        cause instanceof DOMException && cause.name === "AbortError";
      const err: ApiErrorPayload = {
        code: aborted ? "timeout" : "network_error",
        category: "infrastructure",
        message: aborted
          ? "Request timed out"
          : "Network request failed",
        details: {},
        retryable: true,
        correlationId,
      };
      this.lastCorrelationId = correlationId;
      if (this.#developerMode) {
        console.warn("[afh-api]", method, path, err);
      }
      throw new ApiClientError(0, err);
    } finally {
      clearTimeout(timer);
    }

    const headerCorrelation =
      response.headers.get("x-correlation-id") ?? correlationId;
    this.lastCorrelationId = headerCorrelation;

    const json = (await response.json().catch(() => null)) as
      | ApiSuccess<T>
      | ApiErrorBody
      | null;

    if (!response.ok || !json || !("ok" in json) || json.ok !== true) {
      const err: ApiErrorPayload =
        json && "error" in json
          ? {
              ...json.error,
              // Never surface stacks / SQL from bodies — keep message + code only
              details:
                json.error.details && typeof json.error.details === "object"
                  ? sanitizeErrorDetails(json.error.details)
                  : {},
              correlationId: json.error.correlationId ?? headerCorrelation,
            }
          : {
              code: "transport_error",
              category: "infrastructure",
              message: `Request failed (${response.status})`,
              details: {},
              retryable: isRetryableStatus(response.status),
              correlationId: headerCorrelation,
            };
      if (
        options.auth !== false &&
        (response.status === 401 || response.status === 403)
      ) {
        if (
          err.code === "unauthenticated" ||
          err.code === "session_invalid" ||
          err.code === "session_expired" ||
          err.code === "session_idle_expired" ||
          err.code === "session_absolute_expired" ||
          err.code === "session_refresh_expired"
        ) {
          this.#onUnauthorized?.();
        }
      }
      if (this.#developerMode) {
        console.warn("[afh-api]", method, path, err);
      }
      throw new ApiClientError(response.status, err);
    }

    return {
      ...json,
      correlationId: json.correlationId ?? headerCorrelation,
    };
  }
}

const DETAIL_DENY = new Set([
  "stack",
  "stackTrace",
  "sql",
  "query",
  "password",
  "token",
  "secret",
]);

function sanitizeErrorDetails(
  details: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (DETAIL_DENY.has(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}
