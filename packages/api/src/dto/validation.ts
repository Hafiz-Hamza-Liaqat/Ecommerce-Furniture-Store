/**
 * Structural DTO validators — transport only.
 * Business validation remains in application handlers.
 */

import type {
  DispatchCommandRequestDto,
  DispatchQueryRequestDto,
  UploadRequestDto,
} from "./dto.js";

export type DtoValidationIssue = {
  readonly field: string;
  readonly code: string;
  readonly message: string;
};

export type DtoValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: readonly DtoValidationIssue[] };

function requireString(
  field: string,
  value: unknown,
): DtoValidationIssue | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return {
      field,
      code: "required",
      message: `${field} is required`,
    };
  }
  return null;
}

export function validateDispatchCommandDto(
  body: unknown,
): DtoValidationResult {
  if (body == null || typeof body !== "object") {
    return {
      ok: false,
      issues: [
        {
          field: "body",
          code: "invalid",
          message: "JSON object body is required",
        },
      ],
    };
  }
  const dto = body as DispatchCommandRequestDto;
  const issues: DtoValidationIssue[] = [];
  const typeIssue = requireString("commandType", dto.commandType);
  if (typeIssue) issues.push(typeIssue);
  if (dto.payload == null || typeof dto.payload !== "object") {
    issues.push({
      field: "payload",
      code: "required",
      message: "payload object is required",
    });
  }
  return issues.length ? { ok: false, issues } : { ok: true };
}

export function validateDispatchQueryDto(body: unknown): DtoValidationResult {
  if (body == null || typeof body !== "object") {
    return {
      ok: false,
      issues: [
        {
          field: "body",
          code: "invalid",
          message: "JSON object body is required",
        },
      ],
    };
  }
  const dto = body as DispatchQueryRequestDto;
  const issues: DtoValidationIssue[] = [];
  const typeIssue = requireString("queryType", dto.queryType);
  if (typeIssue) issues.push(typeIssue);
  if (dto.payload == null || typeof dto.payload !== "object") {
    issues.push({
      field: "payload",
      code: "required",
      message: "payload object is required",
    });
  }
  return issues.length ? { ok: false, issues } : { ok: true };
}

const ALLOWED_UPLOAD_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function validateUploadRequestDto(body: unknown): DtoValidationResult {
  if (body == null || typeof body !== "object") {
    return {
      ok: false,
      issues: [
        {
          field: "body",
          code: "invalid",
          message: "JSON object body is required",
        },
      ],
    };
  }
  const dto = body as UploadRequestDto;
  const issues: DtoValidationIssue[] = [];
  const companyIssue = requireString("companyId", dto.companyId);
  if (companyIssue) issues.push(companyIssue);
  const nameIssue = requireString("name", dto.name);
  if (nameIssue) issues.push(nameIssue);
  if (dto.mimeType != null) {
    if (typeof dto.mimeType !== "string" || !ALLOWED_UPLOAD_MIME.has(dto.mimeType)) {
      issues.push({
        field: "mimeType",
        code: "not_allowed",
        message: "mimeType is not in the allowed upload list",
      });
    }
  }
  return issues.length ? { ok: false, issues } : { ok: true };
}

export function parseJsonBody(text: string | null): unknown {
  if (text == null || text.trim().length === 0) return null;
  return JSON.parse(text) as unknown;
}
