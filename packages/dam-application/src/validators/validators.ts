/**
 * DAM application validators — structural intent only.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import { validationFail, validationOk } from "@afh/shared-kernel";
import type { CreateAssetPayload } from "../commands/commands.js";
import type { GetAssetPayload, ListAssetPayload } from "../queries/queries.js";
import { ALLOWED_ASSET_MIME_TYPES } from "../constants.js";

function requireField(
  field: string,
  value: string | null | undefined,
): ReturnType<typeof validationFail> | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const createAssetCommandValidator: Validator<
  Command<CreateAssetPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("name", p.name) ??
      requireField("mimeType", p.mimeType) ??
      validationOk()
    );
  },
};

export const getAssetQueryValidator: Validator<Query<GetAssetPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("assetId", p.assetId) ??
      validationOk()
    );
  },
};

export const listAssetQueryValidator: Validator<Query<ListAssetPayload>> = {
  validate(query) {
    const p = query.payload;
    return requireField("companyId", p.companyId) ?? validationOk();
  },
};

export function isAllowedAssetMimeType(mimeType: string): boolean {
  return ALLOWED_ASSET_MIME_TYPES.has(mimeType);
}
