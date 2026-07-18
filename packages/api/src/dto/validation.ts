/**
 * Structural DTO validators — transport only.
 * Business validation remains in application handlers.
 */

import type {
  DispatchCommandRequestDto,
  DispatchQueryRequestDto,
  UploadRequestDto,
} from "./dto.js";
import { ALLOWED_ASSET_MIME_TYPES } from "@afh/dam-application";

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

const ALLOWED_UPLOAD_MIME = ALLOWED_ASSET_MIME_TYPES;

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
