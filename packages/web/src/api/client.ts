/**
 * Reusable API client — commands, queries, auth, uploads.
 * No business behavior; transport + DTO mapping only.
 */

import {
  ApiClientError,
  type ApiErrorBody,
  type ApiSuccess,
  type AuthUser,
  type SessionTokens,
} from "./types";

export type ApiClientOptions = {
  readonly baseUrl?: string;
  readonly getAccessToken: () => string | null;
  readonly getCompanyId?: () => string | null;
  readonly onUnauthorized?: () => void;
  readonly developerMode?: boolean;
};

function newCorrelationId(): string {
  return crypto.randomUUID();
}

export class ApiClient {
  readonly #baseUrl: string;
  readonly #getAccessToken: () => string | null;
  readonly #getCompanyId: () => string | null;
  readonly #onUnauthorized: (() => void) | null;
  readonly #developerMode: boolean;
  lastCorrelationId: string | null = null;

  constructor(options: ApiClientOptions) {
    this.#baseUrl = options.baseUrl ?? "";
    this.#getAccessToken = options.getAccessToken;
    this.#getCompanyId = options.getCompanyId ?? (() => null);
    this.#onUnauthorized = options.onUnauthorized ?? null;
    this.#developerMode = options.developerMode ?? false;
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
    readonly companyId?: string | null;
    readonly phone?: string | null;
  }): Promise<ApiSuccess<{ user: AuthUser }>> {
    return this.#request("POST", "/api/v1/auth/register", {
      body: input,
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
    const res = await fetch(`${this.#baseUrl}/health/ready`);
    return res.json();
  }

  async healthLive(): Promise<unknown> {
    const res = await fetch(`${this.#baseUrl}/health/live`);
    return res.json();
  }

  async healthStartup(): Promise<unknown> {
    const res = await fetch(`${this.#baseUrl}/health/startup`);
    return res.json();
  }

  async healthVersion(): Promise<unknown> {
    const res = await fetch(`${this.#baseUrl}/health/version`);
    return res.json();
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

    const response = await fetch(`${this.#baseUrl}${path}`, {
      method,
      headers,
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
    });

    const headerCorrelation =
      response.headers.get("x-correlation-id") ?? correlationId;
    this.lastCorrelationId = headerCorrelation;

    const json = (await response.json().catch(() => null)) as
      | ApiSuccess<T>
      | ApiErrorBody
      | null;

    if (!response.ok || !json || !("ok" in json) || json.ok !== true) {
      const err =
        json && "error" in json
          ? json.error
          : {
              code: "transport_error",
              category: "infrastructure",
              message: `Request failed (${response.status})`,
              details: {},
              retryable: response.status >= 500,
              correlationId: headerCorrelation,
            };
      if (
        options.auth !== false &&
        (response.status === 401 || response.status === 403)
      ) {
        if (
          err.code === "unauthenticated" ||
          err.code === "session_invalid" ||
          err.code === "session_expired"
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
